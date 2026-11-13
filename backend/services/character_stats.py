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
    record_level_reached,
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

_NON_INVITE_FACTION_SLUGS: frozenset[str] = frozenset(
    {UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG}
)

def _era_window_condition(
    era_row: Era,
    next_era_row: Era | None,
    timestamp_column: InstrumentedAttribute[Any] = Praxis.submitted_at,
) -> ColumnElement[bool]:
    """``[era.started_at, next_era.started_at)`` on ``timestamp_column`` (#1345).

    Same bound as :class:`services.praxis.PraxisEraScope` (#1362). A NULL
    timestamp counts for the live era only, so corrupt rows cannot zero a score
    or score once per era. The vote budget passes ``Vote.created_at``: it is a
    cast-time fact.

    ponytail: seal time, as Praxis has no era column; collapses to
    ``Praxis.era_id == era_row.id`` once #1398 stamps it (votes still need this).
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

    Lifetime cumulative across eras (#1345). A delta, not ``SUM(score)``, so a
    ``reset_all_time_score`` baseline written by ``apply_era_reset`` survives.
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
    """Deliver newly-earned faction invitation letters (ADR-0022).

    Task-count and point thresholds per faction, from the scored praxis set.
    Excludes the current faction (#1425) and unrejoinable ones (#2218).
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
    # Decimal, not float (#1578): the sum is compared to a threshold.
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

    # #2218: thresholds stay met after defection, so without this a retired
    # letter would be re-posted. After the `held` cut to skip the query.
    pending -= await unjoinable_faction_slugs(character.id, era_row.id, session, era)

    for slug in pending:
        # ponytail: UNIQUE (character, faction, era) backstops concurrent delivery.
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
    """Recompute score, level and vote budget for one character in ``era_row``.

    Gathers that era's scored solo/duel and collab praxes (ADR-0014). A past
    ``era_row`` credits that era's row but delivers no invitations or taunts.
    Also the ADR-0068 taunt hook; pass ``emit_taunts=False`` from backfills.
    """
    if era_row is None:
        era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    if author is None:
        return

    # Pre-recalc level gates metatask bonus; slight staleness is acceptable.
    stats = await get_or_create_stats(session, character_id, era_row.id)
    author_level = stats.level

    # None ⟹ era_row is the live era: no upper bound, and invitations may land.
    next_era_row = await get_next_era_row(era_row, session)
    within_era = _era_window_condition(era_row, next_era_row)

    # Solo includes duel sides.
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
    # The one rounding site: round the sum, not each contribution. Decimal +
    # round_half_up, never int() or banker's round() (ADR-0053, #1578).
    total_score = round_half_up(sum(exact(c.total) for c in contributions.values()))

    # Vote budget is derived on read (compute_votes_available).
    score_delta = total_score - stats.score
    previous_score = stats.score
    previous_level = stats.level
    stats.score = total_score
    stats.level = compute_level(total_score, era)
    record_level_reached(author, stats.level)
    if score_delta:
        await _credit_all_time_score(character_id, era_row.id, score_delta, session)

    if next_era_row is not None:
        # Closed era: no invitations (ADR-0022) or taunts (ADR-0068).
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

    await _deliver_earned_invitations(
        author, all_praxes, contributions, session, era, era_row
    )

    # #2399: after delivery, so a letter just posted counts. The only place both
    # halves of the earn rule move; sticky, so it is written here or never.
    await stamp_albescent_unlock(author, era_row.id, session, era)

    # #2770: the ADR-0082 glimpse floor, same stamp point and stickiness.
    await stamp_albescent_glimpse(author, stats.level, session, era)


async def recalculate_members_stats(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    era_row: Era | None = None,
) -> None:
    """Recalculate stats for every member of ``praxis``, then flush (#492).

    The member set is the unit of recalculation for anything that changes a
    praxis's worth: recalculating only ``created_by_id`` strands collab members
    (#1465). Lives here to avoid an import cycle. Era defaults to the praxis's
    own, not the live one (#1345).
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

    Rests on: counter == votes cast in the era window (cast increments, the
    join-void decrements, #2216). Raises 409 for an era that carries spend
    forward. Hazard: an admin budget grant (``set_character_stats``) is
    indistinguishable from drift and gets reverted, so use ``dry_run`` first.
    Returns changed rows only. Run BEFORE a score backfill, never in one pass.
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
