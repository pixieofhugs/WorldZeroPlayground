from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.submission import Submission
from models.task import Task
from models.vote import Vote
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_level, compute_submission_score, compute_vote_budget


async def _recalculate_author_stats(
    author_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Recompute and persist score, level, and vote budget for a submission author."""
    era_row = await get_current_era_row(session)

    submissions_result = await session.execute(
        select(Submission).where(Submission.character_id == author_id)
    )
    submissions = submissions_result.scalars().all()

    total_score = 0.0
    for sub in submissions:
        task = await session.get(Task, sub.task_id)
        if task is None:
            continue
        avg_result = await session.execute(
            select(func.avg(Vote.stars)).where(Vote.submission_id == sub.id)
        )
        avg_stars = avg_result.scalar_one_or_none()
        if avg_stars is not None:
            total_score += compute_submission_score(float(avg_stars), task.point_value)

    new_score = int(total_score)
    stats = await get_or_create_stats(session, author_id, era_row.id)
    old_score = stats.score

    # Increase vote budget by the delta earned from the score gain
    old_budget_capacity = compute_vote_budget(old_score, era)
    new_budget_capacity = compute_vote_budget(new_score, era)
    budget_delta = new_budget_capacity - old_budget_capacity
    if budget_delta > 0:
        stats.votes_available += budget_delta

    stats.score = new_score
    stats.all_time_score = max(stats.all_time_score, new_score)
    stats.level = compute_level(new_score, era)


async def cast_or_update_vote(
    voter: Character,
    submission: Submission,
    stars: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    if not 1 <= stars <= 5:
        raise HTTPException(status_code=422, detail="Stars must be between 1 and 5.")

    result = await session.execute(
        select(Vote).where(
            Vote.submission_id == submission.id,
            Vote.voter_character_id == voter.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        # Update is free — no budget deduction
        existing.stars = stars
        await session.commit()
        await _recalculate_author_stats(submission.character_id, session, era)
        await session.commit()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget via CharacterStats
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if stats.votes_available <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    vote = Vote(
        submission_id=submission.id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        stars=stars,
    )
    stats.votes_available -= 1
    session.add(vote)
    await session.flush()  # persist vote before recalculating so avg includes it
    await _recalculate_author_stats(submission.character_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote
