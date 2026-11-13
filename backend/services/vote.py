import dataclasses
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
)
from models.vote import Vote
from services.character_stats import recalculate_members_stats
from services.era import get_current_era_row, get_or_create_stats
from services.era_gates import may_vote
from services.praxis_duel import get_duel_for_praxis
from services.scoring import compute_votes_available
from services.vote_tally import VoteTally, tally_votes


@dataclasses.dataclass(frozen=True)
class VoteCast:
    """A cast plus the post-cast tally and the *voter's* stats (budget), so the client
    needn't refetch (#1382)."""

    vote: Vote
    tally: VoteTally
    voter_stats: CharacterStats


async def cast_vote_on_praxis(
    voter: Character,
    praxis_id: int,
    value: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> VoteCast:
    """Cast or update a vote on any praxis (duel sides are solo praxes); 404 if missing
    or hidden."""
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
) -> VoteCast:
    """Cast or update a vote on a solo or collab praxis.

    Rules are account-level (ADR-0041): no voting on your own praxes or a duel
    you're in, and one vote per praxis per account — an alt's second rating
    updates it for free (#1150). The budget is per character (#1150).

    No era gate (#1345): spends this era's budget, credited to the sealing era.
    Credited to every member, not ``created_by_id`` (#1465).
    """
    if not 1 <= value <= 5:
        raise HTTPException(status_code=422, detail="Vote value must be between 1 and 5.")

    # A (self-vote) and B (duel) are the permanent rules, shared with
    # ``viewer_can_vote`` (#998). Budget and C are not: neither denies a re-rate.
    if await _voter_account_owns_praxis(voter, praxis, session):
        raise HTTPException(status_code=403, detail="Cannot vote on your own praxis.")
    if await _voter_in_praxis_duel(voter, praxis, session):
        raise HTTPException(
            status_code=403,
            detail="Cannot vote on a duel you're a participant in.",
        )

    # Level gate on peak level (#3102), after A/B. Not in ``viewer_can_vote``:
    # the UI reads ``can_vote`` on ``/auth/me``; both call ``may_vote``.
    if not may_vote(voter.peak_level, voter.faction_slug, False, era):
        raise_coded(
            403,
            ErrorCode.vote_level_too_low,
            f"Must reach level {era.vote_level_required} to vote.",
            {"level": era.vote_level_required},
        )

    # C. One vote per praxis per ACCOUNT (#1150); ``uq_vote_praxis_account`` is
    # the backstop.
    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_account_id == voter.account_id,
        )
    )
    existing = result.scalar_one_or_none()

    # Both branches report the budget (#1382); always the current era's (#1345).
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if existing is not None:
        # Free re-rate; ``voter_character_id`` follows the life that set the value.
        existing.voter_character_id = voter.id
        existing.value = value
        cast = existing
    else:
        if compute_votes_available(stats, era) <= 0:
            raise_coded(
                403,
                ErrorCode.vote_budget_exhausted,
                "No votes remaining in your budget.",
            )

        cast = Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
        stats.votes_spent_this_era += 1
        session.add(cast)

    # ONE recalc for both branches, over all members (#1465).
    await session.flush()
    await recalculate_members_stats(praxis, session, era)
    await session.flush()
    await session.refresh(cast)

    # ``tally_votes`` answers for every id given, so the key is always present (#1378).
    tallies = await tally_votes([praxis.id], session)
    return VoteCast(vote=cast, tally=tallies[praxis.id], voter_stats=stats)


async def void_account_vote_on_join(
    praxis: Praxis,
    joiner: Character,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """On invite accept, delete the joiner's ACCOUNT's vote on ``praxis`` and re-tally
    (#2216).

    Otherwise a pre-invite vote becomes a self-vote. The re-tally is a no-op in
    today's reachable states but stays paired with the delete. Returns whether a
    vote was voided.
    """
    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_account_id == joiner.account_id,
        )
    )
    vote = result.scalar_one_or_none()
    if vote is None:
        return False

    # Refund the budget (keeps ``recompute_votes_spent_this_era``'s identity) to
    # the era the vote was CAST in, never today's (#1345).
    era_row = await _era_row_for_vote(vote, session)
    stats = await get_or_create_stats(session, vote.voter_character_id, era_row.id)
    if stats.votes_spent_this_era > 0:
        stats.votes_spent_this_era -= 1

    # Not via ``praxis.votes``: it is ``lazy="raise"``.
    await session.delete(vote)
    await session.flush()
    await recalculate_members_stats(praxis, session, era)
    return True


async def _era_row_for_vote(vote: Vote, session: AsyncSession) -> Era:
    """The era a vote was CAST in (budget is cast-time; scores are seal-time, #1345)."""
    result = await session.execute(
        select(Era)
        .where(Era.started_at <= vote.created_at)
        .order_by(Era.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none() or await get_current_era_row(session)


# Eligibility: permanent account-level rules A + B, shared by cast and UI (#998).


async def _voter_account_owns_praxis(
    voter: Character, praxis: Praxis, session: AsyncSession
) -> bool:
    """A. ``voter``'s ACCOUNT is any member of ``praxis`` (ADR-0013) or holds a pending
    invite.

    The pending invite counts as ownership here and nowhere else (#2216): sealed
    collabs can still have outstanding invites.
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
    if voter.account_id in member_account_ids:
        return True
    return bool(await _pending_invite_praxis_ids(voter.account_id, [praxis.id], session))


async def _pending_invite_praxis_ids(
    account_id: int, praxis_ids: list[int], session: AsyncSession
) -> set[int]:
    """Ids in ``praxis_ids`` with a pending invite to any life on ``account_id``.

    Queried because ``praxis.invites`` is ``lazy="raise"``.
    """
    if not praxis_ids:
        return set()
    result = await session.execute(
        select(PraxisInvite.praxis_id)
        .join(Character, Character.id == PraxisInvite.invitee_id)
        .where(
            PraxisInvite.praxis_id.in_(praxis_ids),
            PraxisInvite.status == PraxisInviteStatus.pending,
            Character.account_id == account_id,
        )
    )
    return set(result.scalars().all())


async def _voter_in_praxis_duel(
    voter: Character, praxis: Praxis, session: AsyncSession
) -> bool:
    """B. ``voter``'s ACCOUNT is in this praxis's duel: may rate neither side (#309)."""
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
    """``False`` only under the permanent rules A or B (#998); budget and C ignored,
    anonymous ``True``."""
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
    """Page-wide ``viewer_can_vote`` without an N+1; must agree with the per-praxis
    rules."""
    if voter is None:
        return {praxis.id: True for praxis in praxes}

    praxis_ids = {praxis.id for praxis in praxes}
    if not praxis_ids:
        return {}
    account_id = voter.account_id

    # A. Ownership.
    owned_result = await session.execute(
        select(PraxisMember.praxis_id)
        .join(Character, Character.id == PraxisMember.character_id)
        .where(
            PraxisMember.praxis_id.in_(praxis_ids),
            Character.account_id == account_id,
        )
    )
    blocked_ids = set(owned_result.scalars().all())

    # A'. Pending invites (#2216).
    blocked_ids |= await _pending_invite_praxis_ids(
        account_id, list(praxis_ids), session
    )

    # B. Block both sides of any duel the account is in; one duel query per page.
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


