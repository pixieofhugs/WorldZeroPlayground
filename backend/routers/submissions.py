import logging
import os
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from dependencies import get_current_character
from models.character import Character
from models.submission import MediaItem, MediaType, Submission
from models.task import CharacterTask, Task
from schemas.submission import MediaItemOut, SubmissionCreate, SubmissionOut
from services.submission import (
    compute_submission_score_from_db,
    create_submission,
    edit_submission,
    flag_submission,
)

router = APIRouter()


async def _build_submission_out(sub: Submission, session: AsyncSession) -> SubmissionOut:
    score = await compute_submission_score_from_db(sub, session)
    media_result = await session.execute(
        select(MediaItem)
        .where(MediaItem.submission_id == sub.id)
        .order_by(MediaItem.display_order)
    )
    media = [MediaItemOut.model_validate(media_item) for media_item in media_result.scalars().all()]

    character = await session.get(Character, sub.character_id)
    character_display_name = character.display_name if character else ""

    task = await session.get(Task, sub.task_id)
    task_title = task.title if task else ""
    task_point_value = task.point_value if task else 0

    return SubmissionOut(
        id=sub.id,
        task_id=sub.task_id,
        character_id=sub.character_id,
        character_display_name=character_display_name,
        task_title=task_title,
        task_point_value=task_point_value,
        title=sub.title,
        body_text=sub.body_text,
        is_flagged=sub.is_flagged,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        media=media,
        score=score,
    )


@router.get("", response_model=list[SubmissionOut])
async def list_submissions(
    sort: Optional[str] = "recent",
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
):
    query = select(Submission)
    if task_id:
        query = query.where(Submission.task_id == task_id)
    if character_id:
        query = query.where(Submission.character_id == character_id)
    query = query.order_by(Submission.created_at.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    submissions = result.scalars().all()
    return [await _build_submission_out(sub, session) for sub in submissions]


@router.get("/{submission_id}", response_model=SubmissionOut)
async def get_submission(submission_id: int, session: AsyncSession = Depends(get_db)):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return await _build_submission_out(sub, session)


@router.post("", response_model=SubmissionOut, status_code=201)
async def create_submission_route(
    data: SubmissionCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, data.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    sub = await create_submission(character, task, data, session)
    return await _build_submission_out(sub, session)


@router.put("/{submission_id}", response_model=SubmissionOut)
async def edit_submission_route(
    submission_id: int,
    data: SubmissionCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if sub.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot edit another character's submission.")
    sub = await edit_submission(sub, data, session)
    return await _build_submission_out(sub, session)


@router.post("/{submission_id}/media", response_model=MediaItemOut, status_code=201)
async def upload_media(
    submission_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if sub.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot add media to another character's submission.")

    # Determine media type from content type
    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        media_type = MediaType.image
    elif content_type.startswith("video/"):
        media_type = MediaType.video
    elif content_type.startswith("audio/"):
        media_type = MediaType.audio
    else:
        raise HTTPException(status_code=422, detail="Unsupported media type.")

    # Save file to local filesystem (relative path)
    rel_dir = os.path.join(str(character.id), str(submission_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    raw_name = os.path.basename(file.filename or "upload")
    filename = re.sub(r"[^\w.\-]", "_", raw_name)[:100] or "upload"
    abs_path = os.path.join(abs_dir, filename)
    rel_path = os.path.join(rel_dir, filename)

    try:
        os.makedirs(abs_dir, exist_ok=True)
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 50 MB).")
        with open(abs_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except OSError:
        logger.exception("Failed to save media for submission %s", submission_id)
        raise HTTPException(
            status_code=500,
            detail="We couldn't save your file. Please check the file and try again.",
        )

    media_item = MediaItem(
        submission_id=submission_id,
        type=media_type,
        file_path=rel_path,
        display_order=display_order,
    )
    session.add(media_item)
    await session.commit()
    await session.refresh(media_item)
    return MediaItemOut.model_validate(media_item)


@router.delete("/{submission_id}/media/{media_id}", status_code=204)
async def delete_media(
    submission_id: int,
    media_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if sub.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot delete media from another character's submission.")
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.submission_id != submission_id:
        raise HTTPException(status_code=404, detail="Media item not found.")

    abs_path = os.path.join(settings.MEDIA_ROOT, media_item.file_path)
    try:
        os.remove(abs_path)
    except OSError:
        pass  # File already gone — proceed with DB cleanup

    await session.delete(media_item)
    await session.commit()
    return Response(status_code=204)


@router.post("/{submission_id}/flag", response_model=SubmissionOut)
async def flag_submission_route(
    submission_id: int,
    reason: str,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    sub = await flag_submission(sub, character, reason, session)
    return await _build_submission_out(sub, session)
