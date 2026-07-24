from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisMember
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_votes_available


async def cast_vote_on_praxis(
    voter: Character,
    praxis_id: int,
    value: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on any praxis (solo, collab, or duel side).

    Duel sides are standalone solo praxes — no special dispatch needed.
    Raises 404 if the praxis is missing or hidden.
    """
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await cast_or_update_vote(voter, praxis, value, session, era)


async def cast_or_update_vote(
    voter: Character,
    praxis: Praxis,
    value: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a solo or collab praxis.

    Enforces account-level anti-self-vote so alt characters on the same account
    cannot vote on each other's praxes.
    """
    if not 1 <= value <= 5:
        raise HTTPException(status_code=422, detail="Vote value must be between 1 and 5.")

    # Account-level anti-self-vote (A) and duel anti-participation (B) are the two
    # PERMANENT ineligibility rules. They are factored into helpers so this
    # enforcement path and the ``viewer_can_vote`` predicate that drives the UI
    # share one source of truth (#998). Budget (below) is deliberately NOT part
    # of that predicate — it is temporary and re-rating an existing vote is free.
    if await _voter_account_owns_praxis(voter, praxis, session):
        raise HTTPException(status_code=403, detail="Cannot vote on your own praxis.")
    if await _voter_in_praxis_duel(voter, praxis, session):
        raise HTTPException(
            status_code=403,
            detail="Cannot vote on a duel you're a participant in.",
        )

    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_character_id == voter.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        # Update is free — no budget deduction
        existing.value = value
        await session.flush()
        await recalculate_character_stats(praxis.created_by_id, session, era)
        await session.flush()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget via CharacterStats (on-read recomputation)
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if compute_votes_available(stats, era) <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    vote = Vote(
        praxis_id=praxis.id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        value=value,
    )
    stats.votes_spent_this_era += 1
    session.add(vote)
    await session.flush()
    await recalculate_character_stats(praxis.created_by_id, session, era, era_row=era_row)
    await session.flush()
    await session.refresh(vote)
    return vote


# ---------------------------------------------------------------------------
# Eligibility — the permanent, account-level rules (A + B) shared by the
# enforcement path (``cast_or_update_vote``) and the UI (``viewer_can_vote``,
# surfaced on PraxisOut / PraxisCardOut). Budget is intentionally excluded (#998).
# ---------------------------------------------------------------------------


async def _voter_account_owns_praxis(
    voter: Character, praxis: Praxis, session: AsyncSession
) -> bool:
    """A. Ownership — ``voter``'s ACCOUNT owns ``praxis`` (author or any collab
    co-owner). A collab is co-owned by all its members (ADR-0013), not just the
    created_by starter — so this checks every current member's account. members
    + member.character are selectin-loaded, so no extra query in the common path.
    Solo praxis: one member (the creator) → identical to the old created_by check.
    """
    member_account_ids = {
        member.character.account_id
        for member in praxis.members
        if member.character is not None
    }
    # Fallback if members somehow isn't populated: use created_by directly.
    if not member_account_ids and praxis.created_by_id is not None:
        author = praxis.created_by
        if author is None:
            author = await session.get(Character, praxis.created_by_id)
        if author is not None:
            member_account_ids = {author.account_id}
    return voter.account_id in member_account_ids


async def _voter_in_praxis_duel(
    voter: Character, praxis: Praxis, session: AsyncSession
) -> bool:
    """B. Duel participation (#309) — ``voter``'s ACCOUNT is a participant in this
    praxis's duel, on either side. A duel participant — any life on their
    account — cannot rate EITHER side of a duel they're in, not just their own.
    Uses the same active-duel window (pending/active/settled) as
    :func:`services.duel.get_duel_for_praxis`.
    """
    from services.duel import get_duel_for_praxis

    duel = await get_duel_for_praxis(praxis.id, session)
    if duel is None:
        return False
    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    challenger = (
        await session.get(Character, challenger_praxis.created_by_id)
        if challenger_praxis is not None
        else None
    )
    opponent = await session.get(Character, duel.opponent_character_id)
    participant_account_ids = {
        participant.account_id
        for participant in (challenger, opponent)
        if participant is not None
    }
    return voter.account_id in participant_account_ids


async def viewer_can_vote(
    voter: Optional[Character], praxis: Praxis, session: AsyncSession
) -> bool:
    """Whether ``voter`` may vote on ``praxis`` under the PERMANENT rules (#998).

    Returns ``False`` only when account-level ownership (A) or duel
    participation (B) applies — the same two blocks ``cast_or_update_vote``
    enforces. Budget exhaustion is NOT considered: it is temporary and
    re-rating an existing vote is free, so the module stays visible for
    out-of-budget viewers. Anonymous viewers (``voter is None``) get ``True`` —
    the client shows its own login gate regardless.
    """
    if voter is None:
        return True
    if await _voter_account_owns_praxis(voter, praxis, session):
        return False
    if await _voter_in_praxis_duel(voter, praxis, session):
        return False
    return True


async def viewer_can_vote_map(
    praxes: list[Praxis], voter: Optional[Character], session: AsyncSession
) -> dict[int, bool]:
    """Page-wide ``viewer_can_vote`` for a list of praxes, without an N+1.

    Mirrors how crowned_ids / viewer_votes / applied_metatasks are precomputed
    by the card-list route: one ownership query and one duel query for the whole
    page, rather than the per-praxis predicate per card. Anonymous viewer → all
    ``True``.
    """
    if voter is None:
        return {praxis.id: True for praxis in praxes}

    praxis_ids = {praxis.id for praxis in praxes}
    if not praxis_ids:
        return {}
    account_id = voter.account_id

    # A. Ownership — praxis ids the viewer's ACCOUNT is a member of (any life).
    owned_result = await session.execute(
        select(PraxisMember.praxis_id)
        .join(Character, Character.id == PraxisMember.character_id)
        .where(
            PraxisMember.praxis_id.in_(praxis_ids),
            Character.account_id == account_id,
        )
    )
    blocked_ids = set(owned_result.scalars().all())

    # B. Duel participation — for every active duel touching a page praxis, block
    # BOTH of its sides (that are on this page) when the viewer's account is a
    # participant. One duel query for the page; the character lookups hit the
    # identity map and duels-per-page are few, so no per-card query.
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id.in_(praxis_ids))
            | (Duel.opponent_praxis_id.in_(praxis_ids)),
            Duel.status.in_([DuelStatus.pending, DuelStatus.active, DuelStatus.settled]),
        )
    )
    for duel in duel_result.scalars().all():
        challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
        challenger = (
            await session.get(Character, challenger_praxis.created_by_id)
            if challenger_praxis is not None
            else None
        )
        opponent = await session.get(Character, duel.opponent_character_id)
        participant_account_ids = {
            participant.account_id
            for participant in (challenger, opponent)
            if participant is not None
        }
        if account_id in participant_account_ids:
            for side_id in (duel.challenger_praxis_id, duel.opponent_praxis_id):
                if side_id in praxis_ids:
                    blocked_ids.add(side_id)

    return {praxis.id: praxis.id not in blocked_ids for praxis in praxes}


