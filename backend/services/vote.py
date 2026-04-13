from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.submission import Submission
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats


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
        await recalculate_character_stats(submission.character_id, session, era)
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
    await recalculate_character_stats(submission.character_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote
