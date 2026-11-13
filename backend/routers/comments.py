"""Comment routes; registered with no prefix (paths embed their prefixes)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character, get_current_character_optional
from models.character import Character
from schemas.comment import CommentIn, CommentOut, FlagIn
from services.comment import (
    build_comment_out,
    create_comment,
    edit_comment,
    flag_comment,
    list_comments,
    withdraw_comment,
)
from services.praxis import can_view_praxis, get_praxis_settling_consensus

router = APIRouter()


@router.get("/praxes/{praxis_id}/comments", response_model=list[CommentOut])
async def list_praxis_comments(
    praxis_id: int,
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    # Mirror the detail 404 for drafts (ADR-0024). Settles first (#2874) since
    # visibility depends on published-ness.
    praxis = await get_praxis_settling_consensus(praxis_id, session)
    if not await can_view_praxis(viewer, praxis, session):
        raise HTTPException(status_code=404, detail="Praxis not found.")
    comments = await list_comments(praxis_id=praxis_id, session=session)
    return [build_comment_out(c) for c in comments]


@router.post(
    "/praxes/{praxis_id}/comments", response_model=CommentOut, status_code=201
)
async def create_praxis_comment(
    praxis_id: int,
    data: CommentIn,
    author: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    comment = await create_comment(
        author, praxis_id=praxis_id, body_text=data.body_text, session=session
    )
    return build_comment_out(comment)


@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
async def list_task_comments(
    task_id: int, session: AsyncSession = Depends(get_db, scope="function")
):
    comments = await list_comments(task_id=task_id, session=session)
    return [build_comment_out(c) for c in comments]


@router.post("/tasks/{task_id}/comments", response_model=CommentOut, status_code=201)
async def create_task_comment(
    task_id: int,
    data: CommentIn,
    author: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    comment = await create_comment(
        author, task_id=task_id, body_text=data.body_text, session=session
    )
    return build_comment_out(comment)


@router.patch("/comments/{comment_id}", response_model=CommentOut)
async def edit_comment_route(
    comment_id: int,
    data: CommentIn,
    author: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    comment = await edit_comment(comment_id, author, data.body_text, session)
    return build_comment_out(comment)


@router.delete("/comments/{comment_id}", status_code=204)
async def withdraw_comment_route(
    comment_id: int,
    author: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    await withdraw_comment(comment_id, author, session)


@router.post("/comments/{comment_id}/flag", response_model=CommentOut)
async def flag_comment_route(
    comment_id: int,
    data: FlagIn,
    flagged_by: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    comment = await flag_comment(
        comment_id, flagged_by, data.reason, session, reason_detail=data.reason_detail
    )
    return build_comment_out(comment)
