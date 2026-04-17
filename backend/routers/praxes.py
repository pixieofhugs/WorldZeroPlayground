"""Unified praxis router.

Covers all praxis operations: solo, collaboration, and duel.
Replaces the old submissions, collaborations, and praxes routers.
"""

import logging
import os
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from dependencies import get_current_character
from game_config import CURRENT_ERA
from models.character import Character
from models.praxis import MediaItem, MediaType, ModerationStatus, Praxis, PraxisType
from pydantic import BaseModel
from schemas.praxis import (
    DuelVoteSummary,
    MediaItemOut,
    PraxisCardOut,
    PraxisCreate,
    PraxisInviteCreate,
    PraxisOut,
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
    apply_metatask,
    build_praxis_card_out,
    build_praxis_out,
    create_praxis,
    delete_praxis,
    flag_praxis,
    invite_to_praxis,
    kick_member,
    list_praxes,
    remove_metatask,
    reopen_praxis,
    resubmit_praxis,
    respond_to_invite,
    submit_praxis,
    update_praxis,
    withdraw_praxis,
)
from services.vote import cast_or_update_duel_vote, cast_or_update_vote

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# List / detail
# ---------------------------------------------------------------------------


@router.get("", response_model=list[PraxisCardOut])
async def list_praxes_route(
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    moderation_status: Optional[str] = None,
    sort: Optional[str] = "recent",
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
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
        praxis_type=praxis_type,
        status=praxis_status,
        moderation_status=moderation_status,
        limit=limit,
        offset=offset,
    )
    return [await build_praxis_card_out(praxis, session) for praxis in praxes]


@router.get("/{praxis_id}", response_model=PraxisOut)
async def get_praxis_route(
    praxis_id: int,
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden.value:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session)


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
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    )
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


@router.post("/{praxis_id}/resubmit", response_model=PraxisOut)
async def resubmit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await resubmit_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


@router.post("/{praxis_id}/reopen", response_model=PraxisOut)
async def reopen_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await reopen_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
    )
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    if praxis.created_by_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot add media to another character's praxis.")

    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        media_type = MediaType.image
    elif content_type.startswith("video/"):
        media_type = MediaType.video
    elif content_type.startswith("audio/"):
        media_type = MediaType.audio
    else:
        raise HTTPException(status_code=422, detail="Unsupported media type.")

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
        with open(abs_path, "wb") as file_handle:
            file_handle.write(contents)
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
async def delete_media_route(
    praxis_id: int,
    media_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    if praxis.created_by_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot delete media from another character's praxis.")
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.praxis_id != praxis_id:
        raise HTTPException(status_code=404, detail="Media item not found.")

    abs_path = os.path.join(settings.MEDIA_ROOT, media_item.file_path)
    try:
        os.remove(abs_path)
    except OSError:
        pass

    await session.delete(media_item)
    await session.commit()
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
    from schemas.praxis import PraxisInviteOut
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
    praxis = await session.get(Praxis, invite.praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
    """Cast a vote on a praxis.

    - Solo/collab: omit ``praxis_member_id``. Uses ``cast_or_update_vote``.
    - Duel: ``praxis_member_id`` must be set to a duel member's row id.
    """
    from models.praxis import PraxisType
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden.value:
        raise HTTPException(status_code=404, detail="Praxis not found.")

    if praxis.type == PraxisType.duel:
        if data.praxis_member_id is None:
            raise HTTPException(status_code=422, detail="praxis_member_id is required for duel votes.")
        vote = await cast_or_update_duel_vote(
            voter=character,
            praxis_id=praxis_id,
            praxis_member_id=data.praxis_member_id,
            stars=data.stars,
            session=session,
            era=CURRENT_ERA,
        )
    else:
        # Solo or collaboration — anti-self-vote at account level
        if praxis.created_by_id is not None:
            author = await session.get(Character, praxis.created_by_id)
            if author and author.account_id == character.account_id:
                raise HTTPException(status_code=403, detail="Cannot vote on your own praxis.")
        vote = await cast_or_update_vote(
            voter=character,
            praxis=praxis,
            stars=data.stars,
            session=session,
            era=CURRENT_ERA,
        )
    return VoteOut.model_validate(vote)


@router.get("/{praxis_id}/votes", response_model=list[DuelVoteSummary])
async def get_vote_summary_route(
    praxis_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Get live vote tally for a duel praxis."""
    from services.praxis import _build_duel_vote_summary
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await _build_duel_vote_summary(praxis, session)


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
    return await build_praxis_out(praxis, session, viewer_character_id=character.id)


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
