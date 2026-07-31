"""Service for recomputing and persisting CharacterStats from current vote data."""

from sqlalchemy import ColumnElement, and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task
from services.era import (
    get_current_era_row,
    get_era_row_for_praxis,
    get_next_era_row,
    get_or_create_stats,
)
from services.praxis_scoring import Contribution, compute_contributions
from services.scoring import compute_level

# Factions that never receive invitation letters (ADR-0022 / ADR-0019 sentinels).
_NON_INVITE_FACTION_SLUGS: frozenset[str] = frozenset({"na", "albescent"})

# Moderation states that earn nobody points (#1373). ``hidden`` is off the site
# entirely; ``failed`` is an admin ruling that the work was not done, so it keeps
# its banner and its place in the feed but banks nothing. Both praxis gathers
# below read this one set so they cannot drift apart. It mirrors the accepted set
# in ``services.character.py``'s Albescent-unlock query, which has always counted
# only ``visible`` + ``flagged`` — a flagged praxis is merely *awaiting* a ruling.
_UNSCORED_MODERATION_STATUSES: frozenset[ModerationStatus] = frozenset(
    {ModerationStatus.hidden, ModerationStatus.failed}
)


def _era_window_condition(
    era_row: Era, next_era_row: Era | None
) -> ColumnElement[bool]:
    """The seal-time bound that puts a praxis inside ``era_row``'s era (#1345).

    ``CharacterStats`` is one row per (character, era), so a gather that summed
    every praxis ever filed was crediting one era's row with another era's work
    — which is how an era reset silently undid itself on the next recalc.

    ``Praxis`` carries no ``era_id``, so era membership is a **seal-time** fact:
    ``[era.started_at, next_era.started_at)``, the same bound
    :class:`services.praxis.PraxisEraScope` reads (#1362). Both gathers below
    compose this with ``_UNSCORED_MODERATION_STATUSES`` so they cannot drift.

    A NULL ``submitted_at`` counts for the **live** era only.
    ``services.collab_consensus._apply_seal`` establishes
    ``status == submitted ⟹ submitted_at IS NOT NULL``, so no honest row lands
    in that branch; it exists so corrupt data cannot silently zero a score, and
    confining it to the open era stops one such row scoring once per era that
    ever ran.

    ponytail: seal time is the bound because there is no column to read. #1398
    adds ``praxis.era_id`` stamped at submit — when it lands, this collapses to
    ``Praxis.era_id == era_row.id`` and both callers below simplify with it.
    """
    if next_era_row is None:
        return or_(
            Praxis.submitted_at.is_(None),
            Praxis.submitted_at >= era_row.started_at,
        )
    return and_(
        Praxis.submitted_at >= era_row.started_at,
        Praxis.submitted_at < next_era_row.started_at,
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
    history — defect away from X and re-cross X's thresholds and X re-invites you.
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
    points_by_faction: dict[str, float] = {}
    for praxis in praxes:
        slug = faction_by_task.get(praxis.task_id) or "na"
        if slug in uninvitable:
            continue
        task_ids_by_faction.setdefault(slug, set()).add(praxis.task_id)
        contribution = contributions.get(praxis.id)
        if contribution is not None:
            points_by_faction[slug] = points_by_faction.get(slug, 0.0) + contribution.total

    qualifying = {
        slug
        for slug, task_ids in task_ids_by_faction.items()
        if len(task_ids) >= era.invitation_task_threshold
        and points_by_faction.get(slug, 0.0) >= era.invitation_point_threshold
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
    for slug in qualifying - held:
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
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Gathers the submitted praxes the character has a stake in **that belong to
    ``era_row``'s era** — solo/duel praxes they authored, plus collab praxes they
    are a member of — then delegates all scoring arithmetic to
    ``compute_contributions`` (ADR-0014). Praxes in an
    ``_UNSCORED_MODERATION_STATUSES`` state are left out of the gather entirely,
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
            Praxis.moderation_status.notin_(list(_UNSCORED_MODERATION_STATUSES)),
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
            Praxis.moderation_status.notin_(list(_UNSCORED_MODERATION_STATUSES)),
            within_era,
        )
    )
    collab_praxes = list(collab_result.scalars().all())

    all_praxes = solo_praxes + collab_praxes
    contributions = await compute_contributions(
        all_praxes, author, era, session, character_level=author_level
    )
    # round(), not int(): int() truncates toward zero, so a true total of 49.9
    # banked as 49 (ADR-0053). compute_level is directly downstream.
    total_score = round(sum(c.total for c in contributions.values()))

    # Vote budget is computed on read (services.scoring.compute_votes_available)
    # from stats.score and stats.votes_spent_this_era, so no bookkeeping needed here.
    score_delta = total_score - stats.score
    stats.score = total_score
    stats.level = compute_level(total_score, era)
    if score_delta:
        await _credit_all_time_score(character_id, era_row.id, score_delta, session)

    if next_era_row is not None:
        # Recomputing a closed era. ADR-0022 invitations are current-era mail.
        return

    # ADR-0022: deliver any faction invitations this submitted-praxis set now earns.
    await _deliver_earned_invitations(
        author, all_praxes, contributions, session, era, era_row
    )


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
