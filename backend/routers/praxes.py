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
from models.meta_task import MetaTask, PraxisMetaTask
from models.praxis import MediaItem, MediaType, ModerationStatus, Praxis
from models.task import CharacterTask, Task
from schemas.praxis import MediaItemOut, PraxisCreate, PraxisOut
from services.praxis import (
    build_praxis_out,
    create_praxis,
    edit_praxis,
    flag_praxis,
    resubmit_praxis,
    withdraw_praxis,
)

router = APIRouter()


@router.get("", response_model=list[PraxisOut])
async def list_praxes(
    sort: Optional[str] = "recent",
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    moderation_status: Optional[str] = None,
    is_flagged: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
):
    query = select(Praxis).where(Praxis.moderation_status != ModerationStatus.hidden)
    if moderation_status:
        try:
            status_enum = ModerationStatus(moderation_status)
        except ValueError:
            pass
        else:
            query = select(Praxis).where(Praxis.moderation_status == status_enum)
    elif is_flagged:
        # Backward compat: ?is_flagged=true maps to moderation_status=flagged
        query = select(Praxis).where(Praxis.moderation_status == ModerationStatus.flagged)
    if task_id:
        query = query.where(Praxis.task_id == task_id)
    if character_id:
        query = query.where(Praxis.character_id == character_id)
    query = query.order_by(Praxis.created_at.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    praxis_list = result.scalars().all()
    return [await build_praxis_out(praxis, session) for praxis in praxis_list]


@router.get("/{praxis_id}", response_model=PraxisOut)
async def get_praxis(praxis_id: int, session: AsyncSession = Depends(get_db)):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session)


@router.post("", response_model=PraxisOut, status_code=201)
async def create_praxis_route(
    data: PraxisCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, data.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    meta_task: Optional[MetaTask] = None
    if data.meta_task_id is not None:
        meta_task = await session.get(MetaTask, data.meta_task_id)
        if meta_task is None:
            raise HTTPException(status_code=404, detail="Meta task not found.")
        if character.level < meta_task.level_required:
            raise HTTPException(
                status_code=403,
                detail=f"Meta task requires level {meta_task.level_required}.",
            )

    praxis = await create_praxis(character, task, data, session)

    if meta_task is not None:
        session.add(PraxisMetaTask(praxis_id=praxis.id, meta_task_id=meta_task.id))
        await session.commit()

    return await build_praxis_out(praxis, session)


@router.put("/{praxis_id}", response_model=PraxisOut)
async def edit_praxis_route(
    praxis_id: int,
    data: PraxisCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    if praxis.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot edit another character's praxis.")
    praxis = await edit_praxis(praxis, data, session)
    return await build_praxis_out(praxis, session)


@router.post("/{praxis_id}/withdraw", response_model=PraxisOut)
async def withdraw_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    praxis = await withdraw_praxis(praxis, character, session)
    return await build_praxis_out(praxis, session)


@router.post("/{praxis_id}/resubmit", response_model=PraxisOut)
async def resubmit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    praxis = await resubmit_praxis(praxis, character, session)
    return await build_praxis_out(praxis, session)


@router.post("/{praxis_id}/media", response_model=MediaItemOut, status_code=201)
async def upload_media(
    praxis_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    if praxis.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot add media to another character's praxis.")

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
    rel_dir = os.path.join(str(character.id), str(praxis_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    raw_name = os.path.basename(file.filename or "upload")
    filename = re.sub(r"[^\w.\-]", "_", raw_name)[:100] or "upload"
    abs_path = os.path.join(abs_dir, filename)
    rel_path = os.path.join(rel_dir, filename)

    try:
        os.makedirs(abs_dir, exist_ok=True)
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 100 MB).")
        with open(abs_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except OSError:
        logger.exception("Failed to save media for praxis %s", praxis_id)
        raise HTTPException(
            status_code=500,
            detail="We couldn't save your file. Please check the file and try again.",
        )

    media_item = MediaItem(
        praxis_id=praxis_id,
        type=media_type,
        file_path=rel_path,
        display_order=display_order,
    )
    session.add(media_item)
    await session.commit()
    await session.refresh(media_item)
    return MediaItemOut.model_validate(media_item)


@router.delete("/{praxis_id}/media/{media_id}", status_code=204)
async def delete_media(
    praxis_id: int,
    media_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    if praxis.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot delete media from another character's praxis.")
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.praxis_id != praxis_id:
        raise HTTPException(status_code=404, detail="Media item not found.")

    abs_path = os.path.join(settings.MEDIA_ROOT, media_item.file_path)
    try:
        os.remove(abs_path)
    except OSError:
        pass  # File already gone — proceed with DB cleanup

    await session.delete(media_item)
    await session.commit()
    return Response(status_code=204)



@router.post("/{praxis_id}/flag", response_model=PraxisOut)
async def flag_praxis_route(
    praxis_id: int,
    reason: str,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    praxis = await flag_praxis(praxis, character, reason, session)
    return await build_praxis_out(praxis, session)
