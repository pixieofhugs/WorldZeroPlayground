"""Unified praxis router.

Covers all praxis operations: solo, collaboration, and duel.
Replaces the old submissions, collaborations, and praxes routers.
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from db import get_db
from dependencies import get_current_character, get_current_character_optional
from game_config import CURRENT_ERA
from models.character import Character
from models.praxis import MediaItem, ModerationStatus, Praxis, PraxisType
from pydantic import BaseModel
from schemas.praxis import (
    MediaItemOut,
    PraxisCardOut,
    PraxisCreate,
    PraxisInviteCreate,
    PraxisOut,
    PraxisTypeChange,
    PraxisUpdate,
    PraxisVoteIn,
)


class InviteResponse(BaseModel):
    accept: bool


class MetataskApply(BaseModel):
    task_id: int
from schemas.vote import VoteOut
from services.praxis import (
    _build_invite_out,
    _require_member,
    apply_metatask,
    build_praxis_card_out,
    build_praxis_out,
    can_view_praxis,
    cancel_pending_publish_on_edit,
    change_praxis_type,
    create_praxis,
    delete_praxis,
    flag_praxis,
    get_praxis,
    invite_to_praxis,
    kick_member,
    leave_praxis,
    list_praxes,
    remove_metatask,
    respond_to_invite,
    submit_praxis,
    update_praxis,
    withdraw_praxis,
)
from services.media import process_and_save_media
from services.vote import cast_vote_on_praxis
from services.vote_tally import crowned_praxis_ids

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# List / detail
# ---------------------------------------------------------------------------


@router.get("", response_model=list[PraxisCardOut])
async def list_praxes_route(
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    member_id: Optional[int] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    moderation_status: Optional[str] = None,
    faction: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    praxis_type: Optional[PraxisType] = None
    if type is not None:
        try:
            praxis_type = PraxisType(type)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid praxis type: {type}")

    from models.praxis import PraxisStatus
    praxis_status: Optional[PraxisStatus] = None
    if status is not None:
        try:
            praxis_status = PraxisStatus(status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid praxis status: {status}")

    praxes = await list_praxes(
        session=session,
        task_id=task_id,
        character_id=character_id,
        member_id=member_id,
        praxis_type=praxis_type,
        status=praxis_status,
        moderation_status=moderation_status,
        faction=faction,
        viewer_id=viewer.id if viewer else None,
        limit=limit,
        offset=offset,
    )
    # Task Crown (ADR-0028): one windowed query for the whole page — not per card.
    crowned = await crowned_praxis_ids({praxis.task_id for praxis in praxes}, session)
    return [
        await build_praxis_card_out(praxis, session, crowned_ids=crowned)
        for praxis in praxes
    ]


@router.get("/{praxis_id}", response_model=PraxisOut)
async def get_praxis_route(
    praxis_id: int,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    # Route through the service loader so the lazy-on-access publish timeout
    # (ADR-0012) fires on this read path.
    praxis = await get_praxis(praxis_id, session)
    # 404 (not 403) when not viewable — don't reveal existence of hidden or
    # of another character's in_progress draft (ADR-0024).
    if not can_view_praxis(viewer, praxis):
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session, viewer=viewer)


# ---------------------------------------------------------------------------
# Create / edit / delete
# ---------------------------------------------------------------------------


@router.post("", response_model=PraxisOut, status_code=201)
async def create_praxis_route(
    data: PraxisCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await create_praxis(
        task_id=data.task_id,
        praxis_type=data.type,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
        title=data.title,
        body_text=data.body_text,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.put("/{praxis_id}", response_model=PraxisOut)
async def update_praxis_route(
    praxis_id: int,
    data: PraxisUpdate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await update_praxis(
        praxis_id=praxis_id,
        data=data,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/change-type", response_model=PraxisOut)
async def change_praxis_type_route(
    praxis_id: int,
    data: PraxisTypeChange,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Flip a praxis between solo and collab in place (#321), preserving content/media."""
    praxis = await change_praxis_type(
        praxis_id=praxis_id,
        new_type=data.type,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.delete("/{praxis_id}", status_code=204)
async def delete_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    await delete_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
    )
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/withdraw", response_model=PraxisOut)
async def withdraw_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await withdraw_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/submit", response_model=PraxisOut)
async def submit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await submit_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/media", response_model=MediaItemOut, status_code=201)
async def upload_media_route(
    praxis_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    _require_member(praxis, character.id, "add media to")
    media_item = await process_and_save_media(
        file, praxis_id, character.id, display_order
    )
    session.add(media_item)
    await session.flush()
    await session.refresh(media_item)
    # Media is part of the shared document — adding it cancels a pending publish (ADR-0012).
    await cancel_pending_publish_on_edit(praxis, session)
    return MediaItemOut.model_validate(media_item)


@router.delete("/{praxis_id}/media/{media_id}", status_code=204)
async def delete_media_route(
    praxis_id: int,
    media_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    _require_member(praxis, character.id, "delete media from")
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.praxis_id != praxis_id:
        raise HTTPException(status_code=404, detail="Media item not found.")

    abs_path = os.path.join(settings.MEDIA_ROOT, media_item.file_path)
    try:
        os.remove(abs_path)
    except OSError:
        pass

    await session.delete(media_item)
    await session.flush()
    # Removing media edits the shared document — cancels a pending publish (ADR-0012).
    await cancel_pending_publish_on_edit(praxis, session)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Collaboration / duel invite operations
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/invite", response_model=None)
async def invite_member_route(
    praxis_id: int,
    data: PraxisInviteCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    invite = await invite_to_praxis(
        praxis_id=praxis_id,
        invitee_id=data.invitee_id,
        inviter_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return _build_invite_out(invite)


@router.post("/{praxis_id}/invite/{invite_id}/respond", response_model=PraxisOut)
async def respond_to_invite_route(
    praxis_id: int,
    invite_id: int,
    data: InviteResponse,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    invite = await respond_to_invite(
        invite_id=invite_id,
        character_id=character.id,
        accept=data.accept,
        session=session,
        era=CURRENT_ERA,
    )
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.id == invite.praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/kick/{member_id}", response_model=PraxisOut)
async def kick_member_route(
    praxis_id: int,
    member_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    await kick_member(
        praxis_id=praxis_id,
        member_id=member_id,
        requester_id=character.id,
        session=session,
    )
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.id == praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/leave", response_model=PraxisOut)
async def leave_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await leave_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


# ---------------------------------------------------------------------------
# Flagging
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/flag", response_model=PraxisOut)
async def flag_praxis_route(
    praxis_id: int,
    reason: str,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await flag_praxis(
        praxis_id=praxis_id,
        flagged_by=character,
        reason=reason,
        session=session,
    )
    return await build_praxis_out(praxis, session, viewer=character)


# ---------------------------------------------------------------------------
# Voting
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/vote", response_model=VoteOut)
async def cast_vote_route(
    praxis_id: int,
    data: PraxisVoteIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    vote = await cast_vote_on_praxis(
        character, praxis_id, data.value, session, era=CURRENT_ERA,
    )
    return VoteOut.model_validate(vote)


# ---------------------------------------------------------------------------
# Metatask apply / remove
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/metatasks", response_model=PraxisOut, status_code=201)
async def apply_metatask_route(
    praxis_id: int,
    data: MetataskApply,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Attach a metatask (task with task_type='metatask') to a praxis.

    Access gates are enforced in the service — see ``apply_metatask``.
    """
    praxis = await apply_metatask(
        praxis_id=praxis_id,
        task_id=data.task_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.delete("/{praxis_id}/metatasks/{task_id}", status_code=204)
async def remove_metatask_route(
    praxis_id: int,
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Detach a previously applied metatask from a praxis."""
    await remove_metatask(
        praxis_id=praxis_id,
        task_id=task_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return Response(status_code=204)
