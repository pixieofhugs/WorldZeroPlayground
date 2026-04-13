"""Service for recomputing and persisting CharacterStats from current vote data."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.submission import Submission
from models.task import Task
from models.vote import Vote
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_faction_multiplier, compute_level, compute_submission_score, compute_vote_budget


async def recalculate_character_stats(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Sums point_value * faction_multiplier + total_stars across all submissions.
    Safe to call on submission creation (0 votes → base points only) or after
    any vote change.
    """
    era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    character_faction_slug = author.faction_slug if author else "na"

    submissions_result = await session.execute(
        select(Submission).where(Submission.character_id == character_id)
    )
    submissions = submissions_result.scalars().all()

    total_score = 0.0
    for submission in submissions:
        task = await session.get(Task, submission.task_id)
        if task is None:
            continue
        task_faction_slug = task.primary_faction_slug or "na"
        faction_multiplier = compute_faction_multiplier(character_faction_slug, task_faction_slug, era)
        sum_result = await session.execute(
            select(func.sum(Vote.stars)).where(Vote.submission_id == submission.id)
        )
        total_stars = int(sum_result.scalar_one_or_none() or 0)
        total_score += compute_submission_score(task.point_value, faction_multiplier, total_stars)

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
