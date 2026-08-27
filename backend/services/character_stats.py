"""Service for recomputing and persisting CharacterStats from current vote data."""

import dataclasses
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from faction_slugs import CROSS_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.praxis import (
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
    UNSCORED_MODERATION_STATUSES,
)
from models.task import Task
from models.vote import Vote
from services.character import (
    ALBESCENT_FACTION_SLUG,
    stamp_albescent_glimpse,
    stamp_albescent_unlock,
)
from services.era import (
    get_closing_era_id,
    get_current_era_row,
    get_era_row_for_praxis,
    get_next_era_row,
    get_or_create_stats,
)
from services.faction_service import unjoinable_faction_slugs
from services.praxis_scoring import Contribution, compute_contributions
from services.scoring import compute_level, exact, round_half_up
from services.taunt_service import emit_recalc_taunts

# Factions that never receive invitation letters (ADR-0022 / ADR-0019 sentinels).
_NON_INVITE_FACTION_SLUGS: frozenset[str] = frozenset(
    {UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG}
)

def _era_window_condition(
    era_row: Era,
    next_era_row: Era | None,
    timestamp_column: InstrumentedAttribute[Any] = Praxis.submitted_at,
) -> ColumnElement[bool]:
    """The seal-time bound that puts a praxis inside ``era_row``'s era (#1345).

    ``CharacterStats`` is one row per (character, era), so a gather that summed
    every praxis ever filed was crediting one era's row with another era's work
    — which is how an era reset silently undid itself on the next recalc.

    ``Praxis`` carries no ``era_id``, so era membership is a **seal-time** fact:
    ``[era.started_at, next_era.started_at)``, the same bound
    :class:`services.praxis.PraxisEraScope` reads (#1362). Both gathers below
    compose this with ``UNSCORED_MODERATION_STATUSES`` so they cannot drift.

    A NULL ``submitted_at`` counts for the **live** era only.
    ``services.collab_consensus._apply_seal`` establishes
    ``status == submitted ⟹ submitted_at IS NOT NULL``, so no honest row lands
    in that branch; it exists so corrupt data cannot silently zero a score, and
    confining it to the open era stops one such row scoring once per era that
    ever ran.

    ``timestamp_column`` defaults to the praxis seal because that is what both
    score gathers below bound. :func:`recompute_votes_spent_this_era` passes
    ``Vote.created_at`` instead — the vote *budget* is a CAST-time fact, not a
    seal-time one (``services.vote.cast_or_update_vote``: voting on a closed
    era's praxis still spends today's budget, #1345), so the column differs but
    the era bound must not. Parameterising it is how the two stay one
    definition. ``Vote.created_at`` is NOT NULL, so the null-tolerant branch is
    simply unreachable for that caller.

    ponytail: seal time is the bound because there is no column to read. #1398
    adds ``praxis.era_id`` stamped at submit — when it lands, this collapses to
    ``Praxis.era_id == era_row.id`` and both praxis callers below simplify with
    it. The vote caller does not: a vote has no era stamp either.
    """
    if next_era_row is None:
        return or_(
            timestamp_column.is_(None),
            timestamp_column >= era_row.started_at,
        )
    return and_(
        timestamp_column >= era_row.started_at,
        timestamp_column < next_era_row.started_at,
    )


async def _credit_all_time_score(
    character_id: int, from_era_id: int, delta: int, session: AsyncSession
) -> None:
    """Move ``all_time_score`` by ``delta`` on ``from_era_id``'s row and every later one.

    ``all_time_score`` is LIFETIME CUMULATIVE — a sum across eras, so era 1's 500
    plus era 2's 30 is 530 (#1345). Before the gather was era-bounded this fell
    out of ``max(all_time_score, total_score)`` by accident, because
    ``total_score`` *was* the lifetime sum; bounding the gather turns that same
    line into "your best single era".

    It is applied as a delta rather than re-derived as ``SUM(score)`` because
    ``EraConfig.reset_all_time_score`` lets an era declare a fresh lifetime, and
    that zero baseline lives in the row ``services.era.apply_era_reset`` wrote —
    a re-derivation would undo it exactly the way the unbounded gather undid a
    score reset. Crediting *forward* is what lets a vote on a closed era's
    praxis raise the author's lifetime figure without moving the ladder they are
    climbing today. In an ordinary live-era recalc there are no later rows, so
    this touches only the row the caller already holds.
    """
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id >= from_era_id,
        )
    )
    for stats in result.scalars():
        stats.all_time_score += delta


async def _deliver_earned_invitations(
    character: Character,
    praxes: list[Praxis],
    contributions: dict[int, Contribution],
    session: AsyncSession,
    era: EraConfig,
    era_row: Era,
) -> None:
    """Deliver any newly-earned faction invitation letters (ADR-0022).

    A character earns faction X's invite once it has ``era.invitation_task_threshold``
    completed (distinct) tasks for X **and** ``era.invitation_point_threshold`` points
    from X's tasks — both from this same submitted-praxis set recalc already scored, so
    vote-driven point gains trigger delivery too. Idempotent on the
    (character, faction, era) unique key.

    The character's *current* faction is excluded (#1425): you cannot be invited to
    join the faction you are already in, and doing your own faction's tasks is the
    most ordinary thing a player does. Keyed on membership at delivery time, not on
    history — with one exception, added by #2218: a faction this character has
    *defected from* and cannot rejoin is excluded too, because that letter is an
    invitation to an action the API refuses.
    """
    if not praxes:
        return

    uninvitable = _NON_INVITE_FACTION_SLUGS | {character.faction_slug}

    task_rows = await session.execute(
        select(Task.id, Task.primary_faction_slug).where(
            Task.id.in_({p.task_id for p in praxes})
        )
    )
    faction_by_task: dict[int, str] = {tid: slug for tid, slug in task_rows.all()}

    task_ids_by_faction: dict[str, set[int]] = {}
    # Decimal, not float (#1578): this sums many contribution totals and then
    # compares the sum to a threshold, so a binary tail could decide an invite
    # on a character sitting exactly on the line.
    points_by_faction: dict[str, Decimal] = {}
    for praxis in praxes:
        slug = faction_by_task.get(praxis.task_id) or CROSS_FACTION_SLUG
        if slug in uninvitable:
            continue
        task_ids_by_faction.setdefault(slug, set()).add(praxis.task_id)
        contribution = contributions.get(praxis.id)
        if contribution is not None:
            points_by_faction[slug] = points_by_faction.get(
                slug, Decimal(0)
            ) + exact(contribution.total)

    qualifying = {
        slug
        for slug, task_ids in task_ids_by_faction.items()
        if len(task_ids) >= era.invitation_task_threshold
        and points_by_faction.get(slug, Decimal(0))
        >= exact(era.invitation_point_threshold)
    }
    if not qualifying:
        return

    already = await session.execute(
        select(InvitationLetter.faction_slug).where(
            InvitationLetter.character_id == character.id,
            InvitationLetter.era_id == era_row.id,
        )
    )
    held = {slug for (slug,) in already.all()}
    pending = qualifying - held
    if not pending:
        return

    # #2218: never post a letter to a faction this character has walked out of
    # and cannot rejoin — the bell would offer a join `defect_to_faction`
    # answers with `faction_rejoin_forbidden`. This is the delivery half of the
    # retirement done there: the gather above re-reads every era praxis, so the
    # thresholds that earned a retired letter are still met and any vote would
    # post it straight back. It supersedes the re-invite this function used to
    # allow after a defection (#1425) — that re-invitation has been unusable
    # since #454 made the letter the door key. Read after the `held` cut so the
    # query only runs when a letter would actually be delivered.
    pending -= await unjoinable_faction_slugs(character.id, era_row.id, session, era)

    for slug in pending:
        # ponytail: the (character, faction, era) UNIQUE constraint is the real
        # backstop against a concurrent double-deliver; the held-set check avoids
        # the common case.
        session.add(
            InvitationLetter(character_id=character.id, faction_slug=slug, era_id=era_row.id)
        )


async def recalculate_character_stats(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    era_row: Era | None = None,
    *,
    emit_taunts: bool = True,
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Gathers the submitted praxes the character has a stake in **that belong to
    ``era_row``'s era** — solo/duel praxes they authored, plus collab praxes they
    are a member of — then delegates all scoring arithmetic to
    ``compute_contributions`` (ADR-0014). Praxes in an
    ``UNSCORED_MODERATION_STATUSES`` state are left out of the gather entirely,
    so they also stop counting toward faction invitations (ADR-0022).

    The era bound is the fix for #1345: the row being written is one era's
    (ADR-0042/ADR-0044), so summing every praxis ever filed made an era reset
    undo itself the next time anything triggered a recalc. See
    ``_era_window_condition`` for why it is a seal-time bound.

    ``era_row`` may be a **past** era — the vote path passes the era a praxis was
    sealed in, so a vote on closed-era work credits that era's row. In that case
    no faction invitation is delivered: the letters carry an ``era_id`` and an
    invite is a thing you receive in the era you are playing, not one recomputing
    history hands you now.

    ``score`` and ``level`` are per-era; ``all_time_score`` stays lifetime — see
    ``_credit_all_time_score``.

    This is also the ADR-0068 hook for the ``score_overtake`` and ``level_up``
    taunts: the before/after pair this function already computes *is* the lead
    flip. Pass ``emit_taunts=False`` from an admin backfill — a recomputation of
    facts that were already true is not news, and only organic play needles
    anyone. (The era-reset path never lands here at all: ``apply_era_reset``
    writes the new rows itself, which is why an era reset is silent for free.)

    Safe to call on praxis creation (0 votes → base points only) or after any
    vote change.

    Pass ``era_row`` when calling in a loop to avoid an extra query per iteration.
    """
    if era_row is None:
        era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    if author is None:
        return

    # Pre-fetch current stats to get the author's level for meta-task eligibility.
    # Slight staleness here is acceptable — the level is used only as a gate on
    # bonus points, not as the value being computed.
    stats = await get_or_create_stats(session, character_id, era_row.id)
    author_level = stats.level

    # None ⟹ era_row is the live era: no upper bound, and invitations may land.
    next_era_row = await get_next_era_row(era_row, session)
    within_era = _era_window_condition(era_row, next_era_row)

    # Gather solo praxes (including duel sides) authored by this character.
    solo_result = await session.execute(
        select(Praxis).where(
            Praxis.created_by_id == character_id,
            Praxis.type == PraxisType.solo,
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(UNSCORED_MODERATION_STATUSES)),
            within_era,
        )
    )
    solo_praxes = list(solo_result.scalars().all())

    # Gather collab praxes this character is a member of.
    collab_result = await session.execute(
        select(Praxis)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.type == PraxisType.collab,
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(UNSCORED_MODERATION_STATUSES)),
            within_era,
        )
    )
    collab_praxes = list(collab_result.scalars().all())

    all_praxes = solo_praxes + collab_praxes
    contributions = await compute_contributions(
        all_praxes, author, era, session, character_level=author_level
    )
    # The one rounding site in the scoring path, and it rounds the **sum of
    # every contribution** — not each contribution. A character's total score is
    # what levels, and compute_level is directly downstream; per-praxis totals
    # are displayed to one decimal place instead. #1578 kept it that way.
    #
    # round_half_up(), not round() and not int() (ADR-0053, extended by #1578):
    #   - int() truncates toward zero, so a true total of 49.9 banked as 49.
    #   - round() is banker's rounding, so 38.5 banked as 38 while 37.5 banked
    #     as 38 as well — a tie went up or down on the parity beneath it.
    # The sum is taken in Decimal so "exactly a half" is a fact about the score
    # and not about which side of the line IEEE-754 left it on.
    total_score = round_half_up(sum(exact(c.total) for c in contributions.values()))

    # Vote budget is computed on read (services.scoring.compute_votes_available)
    # from stats.score and stats.votes_spent_this_era, so no bookkeeping needed here.
    score_delta = total_score - stats.score
    previous_score = stats.score
    previous_level = stats.level
    stats.score = total_score
    stats.level = compute_level(total_score, era)
    if score_delta:
        await _credit_all_time_score(character_id, era_row.id, score_delta, session)

    if next_era_row is not None:
        # Recomputing a closed era. ADR-0022 invitations are current-era mail,
        # and a lead flip on a finished ladder is not news either (ADR-0068).
        return

    if emit_taunts and score_delta:
        await emit_recalc_taunts(
            author,
            session,
            era_id=era_row.id,
            old_score=previous_score,
            new_score=total_score,
            old_level=previous_level,
            new_level=stats.level,
        )

    # ADR-0022: deliver any faction invitations this submitted-praxis set now earns.
    await _deliver_earned_invitations(
        author, all_praxes, contributions, session, era, era_row
    )

    # #2399: and then ask whether this life has just earned the Albescent door
    # for its account. AFTER the delivery above, deliberately — a letter posted
    # by this same recalc is the seventh faction for someone, and asking first
    # would make them wait for an unrelated recalc to notice.
    #
    # This is the stamp point because it is the one place where BOTH halves of
    # the earn rule move: `stats.level` was just written a few lines up, and the
    # letters a line above that. The unlock is sticky and cannot be recomputed
    # after an era reset, so if it is not written here it is not written at all.
    await stamp_albescent_unlock(author, era_row.id, session, era)

    # #2770: and the same question one stage earlier — has this life reached the
    # level at which the account stops being shown NOTHING and starts being shown
    # ADR-0082's redacted row. Same stamp point, same stickiness, same reason it
    # cannot be derived after an era reset. `stats.level` is the value written a
    # few lines up, handed over rather than re-read.
    await stamp_albescent_glimpse(author, stats.level, session, era)


async def recalculate_members_stats(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    era_row: Era | None = None,
) -> None:
    """Recalculate stats for every member of ``praxis``, then flush (#492).

    **The member set is the unit of recalculation for anything that changes what
    a praxis is worth** — a seal, an unsubmit, a metatask, a moderation ruling,
    a vote. A collab is co-owned by all its members (ADR-0013) and the gather in
    :func:`recalculate_character_stats` picks collabs up by *membership*, so the
    whole tally lands on every member; recalculating ``created_by_id`` alone
    moves the starter and silently strands everyone else (#1465). A solo or duel
    praxis has exactly one member — its author — so this is the right call for
    every praxis type and there is no branch to get wrong.

    It lives here rather than in ``services.praxis`` because two of its three
    callers are *upstream* of that module in the import graph:
    ``services.praxis`` imports both ``services.vote`` and
    ``services.collab_consensus``, so neither could reach it there without a
    cycle (#1465). ``services.character_stats`` is imported by all three.

    Callers that already hold an ``era_row`` (e.g. a duel-forfeit recalc that
    reuses it) pass it in to avoid a re-fetch. ``leave_praxis`` deliberately does
    NOT use this — it recalcs only the single leaver, who is by then no longer a
    member.

    The era defaulted to is **the praxis's**, not the live one (#1345): scores
    are per-era, so a change to a closed era's praxis — a moderation ruling, a
    metatask, an unsubmit, a vote — has to move that era's row or it moves
    nothing at all. For a praxis sealed in the era in progress the two are the
    same row.
    """
    if era_row is None:
        era_row = await get_era_row_for_praxis(praxis, session)
    for member in praxis.members:
        await recalculate_character_stats(
            member.character_id, session, era, era_row=era_row
        )
    await session.flush()


@dataclasses.dataclass(frozen=True)
class VoteSpendRepair:
    """One character's ``votes_spent_this_era`` before and after a recompute."""

    character_id: int
    before: int
    after: int


async def recompute_votes_spent_this_era(
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    era_row: Era | None = None,
    *,
    dry_run: bool = False,
) -> list[VoteSpendRepair]:
    """Rebuild every ``votes_spent_this_era`` in ``era_row`` from the vote table (#1531).

    ``votes_spent_this_era`` is the one *stored* number in the budget —
    ``votes_available`` is derived from it and ``score`` on read
    (``services.scoring.compute_votes_available``). Anything that removes a vote
    row behind the service's back therefore leaves its caster permanently
    charged for a vote that no longer exists. Migration
    ``0011_vote_unique_per_account`` did exactly that: it deleted the surplus
    rows of 13 duplicated ``(praxis, account)`` pairs and deliberately left the
    counter for a follow-up, because the refund is an era attribution SQL cannot
    derive without guessing. That revision was collapsed into ``0002_squashed``
    by #1398 and no longer exists as a file; this function is not tied to it.

    **The identity this rests on: the counter equals the number of that
    character's vote rows cast inside the era window.** It holds because the
    counter moves in exactly two places, and they are a matched pair —
    ``services.vote.cast_or_update_vote`` increments it by one on a NEW cast
    (a re-rate takes the update branch, which is free), and
    ``services.vote.void_account_vote_on_join`` decrements it by one as it
    deletes the row (#2216), crediting the era the vote was cast in so the
    window still balances. That void is the only ``DELETE FROM vote`` in the
    application; the only other one outside a migration is
    ``scripts/seed_demo_praxes.py``, a local reseed, not a production path.

    Two things break the identity, and both are refused or ruled out here rather
    than silently invented:

    - **An era that carries spend forward.** ``apply_era_reset`` seeds the new
      row with the previous era's count when ``era.reset_vote_budget`` is False,
      so the counter is then a lifetime-ish total that no window can reproduce.
      This raises 409 in that case. Era 1 sets ``reset_vote_budget=True``, and
      an era with no predecessor cannot have carried anything in, so the live
      era is safe on both counts.
    - **An admin budget grant.** ``services.admin_service.set_character_stats``
      writes this same counter to translate a desired ``votes_available``
      (``votes_spent = cap - desired``), and nothing on the row records that it
      was hand-set. A recompute CANNOT tell such a row from a stale one and will
      revert the grant. There is no fix short of a provenance column; instead
      this returns the full before/after list and supports ``dry_run`` so an
      operator reads the diff before applying it.

    Bounded by ``_era_window_condition`` on ``Vote.created_at`` — the vote
    budget is a cast-time fact, so a vote on a closed era's praxis counts
    against the era it was *cast* in, exactly as ``cast_or_update_vote`` charges
    it (#1345).

    Only rows that actually change are reported. Characters with no votes in the
    window recompute to 0, which is the correct answer for a row whose era began
    at zero. Sequencing (#1531): run this BEFORE a score backfill, never in the
    same pass — both write ``CharacterStats``.
    """
    if era_row is None:
        era_row = await get_current_era_row(session)

    if not era.reset_vote_budget and await get_closing_era_id(era_row, session) is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This era carries the previous era's vote spend forward "
                "(reset_vote_budget is False), so votes_spent_this_era is not the "
                "count of votes cast in this era and cannot be rebuilt from the "
                "vote table."
            ),
        )

    next_era_row = await get_next_era_row(era_row, session)
    cast_within_era = _era_window_condition(era_row, next_era_row, Vote.created_at)

    counted = await session.execute(
        select(Vote.voter_character_id, func.count())
        .where(cast_within_era)
        .group_by(Vote.voter_character_id)
    )
    votes_cast_by_character: dict[int, int] = {
        character_id: count for character_id, count in counted.all()
    }

    stats_result = await session.execute(
        select(CharacterStats)
        .where(CharacterStats.era_id == era_row.id)
        .order_by(CharacterStats.character_id)
    )
    repairs: list[VoteSpendRepair] = []
    for stats in stats_result.scalars():
        recomputed = votes_cast_by_character.get(stats.character_id, 0)
        if recomputed == stats.votes_spent_this_era:
            continue
        repairs.append(
            VoteSpendRepair(
                character_id=stats.character_id,
                before=stats.votes_spent_this_era,
                after=recomputed,
            )
        )
        if not dry_run:
            stats.votes_spent_this_era = recomputed

    if not dry_run:
        await session.flush()
    return repairs
