"""Service for recomputing and persisting CharacterStats from current vote data."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.collaboration import Collaboration, CollaborationMember, CollaborationStatus
from models.praxis import ModerationStatus, Praxis
from models.task import Task
from models.vote import Vote
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_DUEL,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_level,
    compute_praxis_score,
    compute_vote_budget,
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


async def _get_duel_vote_totals(
    collaboration_id: int, session: AsyncSession
) -> dict[int, int]:
    """Return {character_id: total_stars} for all duel votes on a collaboration."""
    result = await session.execute(
        select(Vote.duel_vote_for, func.sum(Vote.stars)).where(
            Vote.collaboration_id == collaboration_id,
            Vote.duel_vote_for.is_not(None),
        ).group_by(Vote.duel_vote_for)
    )
    return {character_id: int(stars) for character_id, stars in result.all()}


async def recalculate_character_stats(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Sums scores across:
    - All solo praxis records (formula: (base + meta) × faction × duel_multiplier + stars)
    - All published collaborations/duels the character is a member of

    Safe to call on praxis creation (0 votes → base points only) or after any vote change.
    """
    era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    character_faction_slug = author.faction_slug if author else "na"

    total_score = 0.0

    # ── Solo praxes ───────────────────────────────────────────────────────────
    praxis_result = await session.execute(
        select(Praxis).where(
            Praxis.character_id == character_id,
            Praxis.moderation_status != ModerationStatus.hidden,
            Praxis.is_withdrawn == False,
        )
    )
    for praxis in praxis_result.scalars().all():
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
            praxis.id, author.level if author else 0, session
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

    # ── Published collaborations and duels ────────────────────────────────────
    member_result = await session.execute(
        select(CollaborationMember).where(
            CollaborationMember.character_id == character_id,
        )
    )
    for member in member_result.scalars().all():
        collab = await session.get(Collaboration, member.collaboration_id)
        if collab is None or collab.status != CollaborationStatus.published:
            continue

        task = await session.get(Task, collab.task_id)
        if task is None:
            continue

        task_faction_slug = task.primary_faction_slug or "na"
        mode = collab.mode.value  # "collaboration" or "duel"

        if mode == "duel":
            # Determine duel outcome for this member
            vote_totals = await _get_duel_vote_totals(collab.id, session)
            member_stars = vote_totals.get(character_id, 0)

            other_member_result = await session.execute(
                select(CollaborationMember).where(
                    CollaborationMember.collaboration_id == collab.id,
                    CollaborationMember.character_id != character_id,
                )
            )
            other_members = other_member_result.scalars().all()
            opponent_id = other_members[0].character_id if other_members else None
            opponent_stars = vote_totals.get(opponent_id, 0) if opponent_id else 0

            opponent = await session.get(Character, opponent_id) if opponent_id else None
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
        else:
            # Collaboration
            faction_multiplier = compute_faction_multiplier(
                character_faction_slug,
                task_faction_slug,
                era,
                collaboration_mode=COLLABORATION_MODE_COLLAB,
            )
            # Votes on collaborations use praxis-style voting (no duel_vote_for needed)
            sum_result = await session.execute(
                select(func.sum(Vote.stars)).where(Vote.collaboration_id == collab.id)
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
    stats = await get_or_create_stats(session, character_id, era_row.id)
    old_score = stats.score

    old_budget_capacity = compute_vote_budget(old_score, era)
    new_budget_capacity = compute_vote_budget(new_score, era)
    budget_delta = new_budget_capacity - old_budget_capacity
    if budget_delta > 0:
        stats.votes_available += budget_delta

    stats.score = new_score
    stats.all_time_score = max(stats.all_time_score, new_score)
    stats.level = compute_level(new_score, era)
