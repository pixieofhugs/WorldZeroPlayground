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
from services.praxis_duel import get_duel_for_praxis
from services.scoring import compute_votes_available
from services.vote_tally import VoteTally, tally_votes


@dataclasses.dataclass(frozen=True)
class VoteCast:
    """A completed cast plus the state the client would otherwise go fetch (#1382).

    The tally is computed here rather than left to the caller because this
    function has just changed it: returning the vote alone is what forced the
    client to keep a delta-arithmetic overlay store and reconstruct the new
    numbers by hand (#626, stale-bugged as #1142 and #1239).

    ``voter_stats`` is the *voter's* row, not the author's. Casting cannot move
    the voter's score or level — ``recalculate_members_stats`` recalculates the
    praxis MEMBERS and anti-self-vote guarantees the voter is never one — so the
    only field a cast actually moves here is the on-read vote budget.
    """

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
) -> VoteCast:
    """Cast or update a vote on a solo or collab praxis.

    Every rule here is account-level (ADR-0041): alt characters on one account
    cannot vote on each other's praxes, cannot rate a duel any of them is in,
    and — since #1150 — cannot hold more than one vote on the same praxis. The
    third is not an extra rejection: an alt's second rating *updates* the
    account's existing vote, which is free (no budget deduction).

    The vote *budget* stays per character by owner ruling (#1150) — one
    ``CharacterStats`` row per (character, era). An account with several
    characters deliberately carries several budgets; it just cannot spend them
    twice on one praxis.

    There is deliberately **no era gate**: a closed era's praxis stays votable
    (#1345). The vote spends *this* era's budget, but it is credited to the era
    the praxis was sealed in — so it makes the historical record and the
    author's lifetime ``all_time_score`` more accurate without moving the ladder
    anyone is climbing today.

    A vote is credited to every **member** of the praxis, not to its
    ``created_by_id`` (#1465). On a collab the starter is only one co-owner
    (ADR-0013) and the whole tally lands on each of them; on a solo or duel
    praxis the member set is exactly the author, so one call covers every type.

    Returns a :class:`VoteCast`, not a bare ``Vote`` (#1382): this function has
    just moved the praxis's tally and the voter's budget, and handing back only
    the row made the client rebuild both by hand.
    """
    if not 1 <= value <= 5:
        raise HTTPException(status_code=422, detail="Vote value must be between 1 and 5.")

    # Account-level anti-self-vote (A) and duel anti-participation (B) are the two
    # PERMANENT ineligibility rules. They are factored into helpers so this
    # enforcement path and the ``viewer_can_vote`` predicate that drives the UI
    # share one source of truth (#998). Budget (below) is deliberately NOT part
    # of that predicate — it is temporary and re-rating an existing vote is free.
    # Nor is one-vote-per-account (C, below) part of it: it never denies a vote,
    # it routes the second one into an update, so ``viewer_can_vote`` stays True.
    if await _voter_account_owns_praxis(voter, praxis, session):
        raise HTTPException(status_code=403, detail="Cannot vote on your own praxis.")
    if await _voter_in_praxis_duel(voter, praxis, session):
        raise HTTPException(
            status_code=403,
            detail="Cannot vote on a duel you're a participant in.",
        )

    # C. One vote per praxis per ACCOUNT (#1150) — matched on the account, not
    # the character, so an alt life re-rates the account's existing vote instead
    # of falling through as a brand-new one. This is the lookup half of the
    # ``uq_vote_praxis_account`` constraint; the constraint is the backstop.
    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_account_id == voter.account_id,
        )
    )
    existing = result.scalar_one_or_none()

    # The voter's own stats row, resolved for BOTH branches (#1382). The new-cast
    # path needs it to charge the budget; the re-rate path needs it only to
    # report the budget back, which is why this used to live inside the else.
    # The budget is always the *voter's current* era, whatever era the praxis is
    # from: voting on old work still costs a vote today (#1345).
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if existing is not None:
        # Update is free — no budget deduction, whichever life re-rates. The
        # account holds one vote; ``voter_character_id`` follows the life that
        # set the value that stands, so the voter list, the activity feed and
        # the character-scoped ``viewer_vote`` star all name the same character.
        existing.voter_character_id = voter.id
        existing.value = value
        cast = existing
    else:
        # New vote — deduct from budget via CharacterStats (on-read recomputation).
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

    # ONE recalc for both branches (#1465). Keeping a copy inside each is how the
    # two drifted before: the new-cast path and the re-rate path each recalculated
    # ``created_by_id`` alone, so a collab's co-members were stranded on the way up
    # *and* left holding unsupported points on the way down.
    await session.flush()
    await recalculate_members_stats(praxis, session, era)
    await session.flush()
    await session.refresh(cast)

    # The tally AFTER the write — the whole point of #1382. One extra aggregate
    # query, and it retires a client-side overlay store plus a `/auth/me` reload
    # per star. ``tally_votes`` answers for every id it is given, so the praxis
    # is always present even when this cast is somehow the only row (#1378).
    tallies = await tally_votes([praxis.id], session)
    return VoteCast(vote=cast, tally=tallies[praxis.id], voter_stats=stats)


async def void_account_vote_on_join(
    praxis: Praxis,
    joiner: Character,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Delete ``joiner``'s account's vote on ``praxis`` and re-tally (#2216).

    Called from ``services.praxis.respond_to_invite`` when an invitation is
    accepted. The gate above only stops *future* votes; a vote cast before the
    invitation arrived would otherwise be grandfathered into exactly the state
    the gate exists to prevent — a co-owner holding a rating on their own praxis.
    Blocking the accept instead was ruled out: it punishes the invitee for a rule
    they could not have known about when they voted.

    Account-scoped, not character-scoped, because that is what the vote is: an
    alt life's rating becomes a self-vote the moment any life on the account
    joins (ADR-0041, and the ``uq_vote_praxis_account`` key).

    The re-tally is ``recalculate_members_stats`` — the one recalculation for
    anything that changes what a praxis is worth, and the same call the cast path
    makes. It is a no-op in today's reachable states (``respond_to_invite``
    refuses a submitted praxis, and an unsealed praxis is unscored), but the
    delete and the re-tally are one act and splitting them is how they drift.

    Returns whether a vote was actually voided.
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

    # The budget follows the row out. ``recompute_votes_spent_this_era`` rests on
    # "the counter equals that character's vote rows inside the era window" and
    # states that nothing in the application deletes a vote; leaving the caster
    # charged would break that identity, and the operator repair would hand the
    # vote back later anyway. Charged to the era the vote was CAST in (#1345), so
    # that is the row credited — never today's, or a vote from a closed era would
    # buy a free vote in this one.
    era_row = await _era_row_for_vote(vote, session)
    stats = await get_or_create_stats(session, vote.voter_character_id, era_row.id)
    if stats.votes_spent_this_era > 0:
        stats.votes_spent_this_era -= 1

    # ``session.delete``, not removal through ``praxis.votes``: that collection is
    # ``lazy="raise"``, so it is never loaded on this path and there is no cached
    # list to keep consistent.
    await session.delete(vote)
    await session.flush()
    await recalculate_members_stats(praxis, session, era)
    return True


async def _era_row_for_vote(vote: Vote, session: AsyncSession) -> Era:
    """The era a vote was CAST in — the latest era that started at or before it.

    The mirror of :func:`services.era.get_era_row_for_praxis`, which answers the
    same question for a *seal*. They are deliberately different facts: a praxis's
    score belongs to the era it was sealed in, while the vote *budget* is a
    cast-time fact (``cast_or_update_vote`` charges ``get_current_era_row``), and
    #1345 is the ruling that keeps the two apart.
    """
    result = await session.execute(
        select(Era)
        .where(Era.started_at <= vote.created_at)
        .order_by(Era.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none() or await get_current_era_row(session)


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

    **A pending invitation counts as ownership here and nowhere else** (#2216).
    ``praxis.members`` is current members only and a ``PraxisMember`` row is
    written only on accept (``services.praxis.respond_to_invite``), so an invitee
    who has not answered yet was invisible to this check and could rate a praxis
    they were one click from co-owning. Sealing a collab does not rescind its
    pending invites — only the collab→solo conversion does — so the praxis can be
    Live and public with the invitation still outstanding, which is the shape the
    bug was reported in. The invite buys nothing else: no points, no roster seat,
    no member row.
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
    """Praxis ids among ``praxis_ids`` that ``account_id`` holds a pending invite on.

    Queried rather than read off ``praxis.invites``: that relationship is
    ``lazy="raise"`` on purpose (only the detail and moderation flows load
    invites), and the vote path runs per card.

    Account-level, not character-level, like every other rule in this module
    (ADR-0041): the invitation reaches one life, but an alt on the same account
    rating the collab that account is about to co-own is the same hole the gate
    exists to close.
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
    """B. Duel participation (#309) — ``voter``'s ACCOUNT is a participant in this
    praxis's duel, on either side. A duel participant — any life on their
    account — cannot rate EITHER side of a duel they're in, not just their own.
    Uses the same active-duel window (pending/active/settled) as
    :func:`services.praxis_duel.get_duel_for_praxis`.
    """
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
    out-of-budget viewers. One-vote-per-account (#1150) is not considered
    either, for the same reason: an account that has already voted may still
    re-rate, so an existing vote never turns this ``False``. Anonymous viewers
    (``voter is None``) get ``True`` — the client shows its own login gate
    regardless.
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

    # A'. An outstanding invitation is ownership for this gate alone (#2216) —
    # the same rule ``_voter_account_owns_praxis`` applies per praxis, batched
    # here so the feed's flag can never disagree with what the cast enforces.
    blocked_ids |= await _pending_invite_praxis_ids(
        account_id, list(praxis_ids), session
    )

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


