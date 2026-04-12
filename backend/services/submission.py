from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.flag import Flag
from models.submission import Submission
from models.task import CharacterTask, CharacterTaskStatus, Task
from models.vote import Vote
from schemas.submission import SubmissionCreate
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_submission_score


async def create_submission(
    character: Character,
    task: Task,
    data: SubmissionCreate,
    session: AsyncSession,
) -> Submission:
    character_task_result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == task.id,
            CharacterTask.status != CharacterTaskStatus.abandoned,
        )
    )
    character_task = character_task_result.scalar_one_or_none()
    if character_task is None:
        raise HTTPException(status_code=403, detail="Must be signed up for this task to submit proof.")

    submission = Submission(
        task_id=task.id,
        character_id=character.id,
        title=data.title,
        body_text=data.body_text or "",
    )
    session.add(submission)
    character_task.status = CharacterTaskStatus.submitted
    await session.commit()
    await session.refresh(submission)
    return submission


async def edit_submission(
    submission: Submission,
    data: SubmissionCreate,
    session: AsyncSession,
) -> Submission:
    for field, value in data.model_dump(exclude_unset=True, exclude={"task_id"}).items():
        if value is None:
            value = ""
        setattr(submission, field, value)
    await session.commit()
    await session.refresh(submission)
    return submission


async def flag_submission(
    submission: Submission,
    flagged_by: Character,
    reason: str,
    session: AsyncSession,
) -> Submission:
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, flagged_by.id, era_row.id)

    if stats.level < 4:
        raise HTTPException(
            status_code=403,
            detail="Must be level 4 or above to flag submissions.",
        )
    if flagged_by.id == submission.character_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own submission.")

    submission.is_flagged = True
    submission.flagged_at = datetime.now(timezone.utc)

    flag = Flag(
        submission_id=submission.id,
        flagged_by=flagged_by.id,
        reason=reason or "",
    )
    session.add(flag)
    await session.commit()
    await session.refresh(submission)
    return submission


async def compute_submission_score_from_db(
    submission_id: int,
    task_point_value: int,
    session: AsyncSession,
) -> float:
    result = await session.execute(
        select(func.avg(Vote.stars)).where(Vote.submission_id == submission_id)
    )
    avg_stars = result.scalar_one_or_none()
    if avg_stars is None:
        return 0.0
    return compute_submission_score(float(avg_stars), task_point_value)
