"""Service for recomputing and persisting CharacterStats from current vote data."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.praxis import (
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task
from models.vote import Vote
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_level,
    compute_praxis_score,
)


async def _get_meta_task_points(
    praxis_id: int, character_level: int, session: AsyncSession
) -> int:
    """Return flat bonus points from any meta task attached to a solo praxis.

    Returns 0 if the character does not meet the meta task's level_required.
    """
    from models.meta_task import MetaTask, PraxisMetaTask

    result = await session.execute(
        select(PraxisMetaTask).where(PraxisMetaTask.praxis_id == praxis_id)
    )
    praxis_meta_task = result.scalar_one_or_none()
    if praxis_meta_task is None:
        return 0
    meta_task = await session.get(MetaTask, praxis_meta_task.meta_task_id)
    if meta_task is None:
        return 0
    if character_level < meta_task.level_required:
        return 0
    # bonus_type "flat" adds bonus_value directly; "percentage" is not yet implemented.
    if meta_task.bonus_type.value == "flat":
        return int(meta_task.bonus_value)
    return 0


async def _get_duel_vote_totals_by_member(
    praxis_id: int, session: AsyncSession
) -> dict[int, int]:
    """Return {praxis_member_id: total_stars} for all duel votes on a praxis."""
    result = await session.execute(
        select(Vote.praxis_member_id, func.sum(Vote.stars)).where(
            Vote.praxis_id == praxis_id,
            Vote.praxis_member_id.is_not(None),
        ).group_by(Vote.praxis_member_id)
    )
    return {member_id: int(stars) for member_id, stars in result.all()}


async def recalculate_character_stats(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Sums scores across:
    - All solo praxis records (formula: (base + meta) × faction × duel_multiplier + stars)
    - All submitted collaborations/duels the character is a member of

    Safe to call on praxis creation (0 votes → base points only) or after any vote change.
    """
    era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    character_faction_slug = author.faction_slug if author else "na"

    # Pre-fetch current stats to get author level for meta task lookups.
    # This is the *current* level before recalculation; it's used only for
    # meta-task eligibility checks, where slight staleness is acceptable.
    current_stats = await get_or_create_stats(session, character_id, era_row.id)
    author_level = current_stats.level

    total_score = 0.0

    # ── Solo praxes ───────────────────────────────────────────────────────────
    solo_result = await session.execute(
        select(Praxis).where(
            Praxis.type == PraxisType.solo,
            Praxis.created_by_id == character_id,
            Praxis.moderation_status != "hidden",
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    for praxis in solo_result.scalars().all():
        task = await session.get(Task, praxis.task_id)
        if task is None:
            continue
        task_faction_slug = task.primary_faction_slug or "na"
        faction_multiplier = compute_faction_multiplier(
            character_faction_slug,
            task_faction_slug,
            era,
            collaboration_mode=COLLABORATION_MODE_SOLO,
        )
        meta_task_points = await _get_meta_task_points(
            praxis.id, author_level, session
        )
        sum_result = await session.execute(
            select(func.sum(Vote.stars)).where(Vote.praxis_id == praxis.id)
        )
        total_stars = int(sum_result.scalar_one_or_none() or 0)
        total_score += compute_praxis_score(
            task.point_value,
            faction_multiplier,
            total_stars,
            meta_task_points=meta_task_points,
            duel_multiplier=1.0,
        )

    # ── Submitted collaborations and duels ────────────────────────────────────
    member_result = await session.execute(
        select(PraxisMember).where(
            PraxisMember.character_id == character_id,
        )
    )
    for member in member_result.scalars().all():
        praxis = await session.get(Praxis, member.praxis_id)
        if praxis is None or praxis.status != PraxisStatus.submitted:
            continue
        if praxis.is_withdrawn:
            continue

        task = await session.get(Task, praxis.task_id)
        if task is None:
            continue

        task_faction_slug = task.primary_faction_slug or "na"

        if praxis.type == PraxisType.duel:
            # Determine duel outcome for this member
            vote_totals = await _get_duel_vote_totals_by_member(praxis.id, session)
            member_stars = vote_totals.get(member.id, 0)

            other_member_result = await session.execute(
                select(PraxisMember).where(
                    PraxisMember.praxis_id == praxis.id,
                    PraxisMember.character_id != character_id,
                )
            )
            other_members = other_member_result.scalars().all()
            opponent_member = other_members[0] if other_members else None
            opponent_member_id = opponent_member.id if opponent_member else None
            opponent_stars = vote_totals.get(opponent_member_id, 0) if opponent_member_id else 0

            opponent = await session.get(Character, opponent_member.character_id) if opponent_member else None
            opponent_faction_slug = opponent.faction_slug if opponent else "na"

            is_tied = member_stars == opponent_stars
            is_winner = member_stars > opponent_stars

            faction_multiplier = compute_faction_multiplier(
                character_faction_slug,
                task_faction_slug,
                era,
                collaboration_mode=COLLABORATION_MODE_SOLO,  # own/other task, no duel mode
            )
            duel_multiplier = compute_duel_multiplier(
                character_faction_slug,
                opponent_faction_slug,
                is_winner=is_winner,
                is_tied=is_tied,
                era=era,
            )
            total_score += compute_praxis_score(
                task.point_value,
                faction_multiplier,
                member_stars,
                meta_task_points=0,  # meta tasks on collaborations not yet wired
                duel_multiplier=duel_multiplier,
            )
        elif praxis.type == PraxisType.collab:
            # Collaboration
            faction_multiplier = compute_faction_multiplier(
                character_faction_slug,
                task_faction_slug,
                era,
                collaboration_mode=COLLABORATION_MODE_COLLAB,
            )
            # Votes on collaborations use praxis-wide voting (no praxis_member_id)
            sum_result = await session.execute(
                select(func.sum(Vote.stars)).where(Vote.praxis_id == praxis.id)
            )
            total_stars = int(sum_result.scalar_one_or_none() or 0)
            total_score += compute_praxis_score(
                task.point_value,
                faction_multiplier,
                total_stars,
                meta_task_points=0,
                duel_multiplier=1.0,
            )

    new_score = int(total_score)
    stats = current_stats

    # Vote budget is computed on read (services.scoring.compute_votes_available)
    # from stats.score and stats.votes_spent_this_era, so no bookkeeping is
    # needed here when score changes.
    stats.score = new_score
    stats.all_time_score = max(stats.all_time_score, new_score)
    stats.level = compute_level(new_score, era)

    if author:
        from services.character import check_faction_graduation
        new_faction = check_faction_graduation(author, stats, era)
        if new_faction:
            author.faction_slug = new_faction
