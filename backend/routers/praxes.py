"""Unified praxis router.

Covers all praxis operations: solo, collaboration, and duel.
Replaces the old submissions, collaborations, and praxes routers.
"""

import logging
import os
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
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
from schemas.comment import FlagIn
from schemas.praxis import (
    MediaItemOut,
    MediaUploadResultOut,
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
from schemas.nudge import NudgeOut
from schemas.vote import VoteOut
from services.praxis import (
    _build_invite_out,
    _require_member,
    add_media_batch,
    apply_metatask,
    build_praxis_cards,
    build_praxis_out,
    can_view_praxis,
    cancel_invite,
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
    PraxisEraScope,
    PraxisSort,
    VotedFilter,
    remove_metatask,
    respond_to_invite,
    submit_praxis,
    update_praxis,
    unsubmit_praxis,
)
from services.media import process_and_save_media
from services.nudge import send_nudge
from services.vote import cast_vote_on_praxis

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
    faction: Optional[List[str]] = Query(None),
    q: Optional[str] = None,
    sort: Optional[str] = None,
    era_scope: str = PraxisEraScope.this_era.value,
    voted: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    praxis_sort: Optional[PraxisSort] = None
    if sort is not None:
        try:
            praxis_sort = PraxisSort(sort)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid praxis sort: {sort}")

    try:
        era_scope_value = PraxisEraScope(era_scope)
    except ValueError:
        raise HTTPException(
            status_code=422, detail=f"Invalid praxis era scope: {era_scope}"
        )

    voted_filter: Optional[VotedFilter] = None
    if voted is not None:
        try:
            voted_filter = VotedFilter(voted)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid voted filter: {voted}")

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
        search=q,
        sort=praxis_sort,
        era_scope=era_scope_value,
        voted=voted_filter,
        viewer_id=viewer.id if viewer else None,
        viewer_account_id=viewer.account_id if viewer else None,
        limit=limit,
        offset=offset,
    )
    return await build_praxis_cards(praxes, session, viewer)


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
    if not await can_view_praxis(viewer, praxis, session):
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


@router.post("/{praxis_id}/unsubmit", response_model=PraxisOut)
async def unsubmit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    praxis = await unsubmit_praxis(
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


@router.post(
    "/{praxis_id}/media/batch",
    response_model=List[MediaUploadResultOut],
    status_code=201,
)
async def upload_media_batch_route(
    praxis_id: int,
    files: List[UploadFile] = File(...),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Upload N media files in one multipart request (#1298).

    Returns one entry per submitted file, **in request order**, each carrying
    either the created ``MediaItemOut`` or an error naming that file. The 201 says
    "the request was processed", not "everything succeeded": one rejected file
    fails only itself, so read every entry. The praxis 404 and the membership 403
    are batch-wide and are settled before any file is touched.

    ``display_order`` is derived from request position and appended after any
    media already on the praxis; this route takes no ``display_order`` field. The
    single-file ``POST /{praxis_id}/media`` is unchanged and still owns the
    crop/rotate path, which uploads one file at a time by design (#514).

    **Body-size ceiling** — what is verifiable from this codebase:

    * **Per file: 100 MB** (``services.media.MEDIA_MAX_BYTES``), enforced per file
      and reported as a per-file 413 entry. Never a batch-wide failure.
    * **Per request: 1000 files** — Starlette's ``max_files`` default, which
      FastAPI does not override. Exceeding it fails the *whole* request with a
      bare 400 before this handler runs, so clients must chunk below it.
    * **Total request bytes: no application-level cap.** Uvicorn serves the app
      directly (``backend/Dockerfile`` → ``start.sh``); there is no nginx or
      body-size middleware in front of it. Starlette spools each file part to a
      temp file above 1 MB, so a batch's whole payload transits the container's
      ephemeral filesystem before this handler sees it.
    * Render's edge proxy limit is **not discoverable from this repository** and
      is deliberately not guessed here — see the note on issue #1298. Until it is
      measured against the deployed service, clients should chunk a large
      selection into several batched requests rather than assume any single
      figure holds.
    """
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    _require_member(praxis, character.id, "add media to")
    return await add_media_batch(
        praxis=praxis,
        uploads=files,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )


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
    # Each upload owns its directory (#1336), so removing the file leaves that
    # directory empty. rmdir refuses a non-empty one, which is exactly the guard
    # we want for pre-#1336 rows that still share a per-praxis directory.
    try:
        os.rmdir(os.path.dirname(abs_path))
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


@router.delete("/{praxis_id}/invite/{invite_id}", status_code=204)
async def cancel_invite_route(
    praxis_id: int,
    invite_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    await cancel_invite(
        praxis_id=praxis_id,
        invite_id=invite_id,
        inviter_id=character.id,
        session=session,
    )
    return Response(status_code=204)


@router.post("/{praxis_id}/nudge/{character_id}", response_model=NudgeOut)
async def nudge_route(
    praxis_id: int,
    character_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Poke the player this praxis is still waiting on (#1083).

    ``praxis_id`` is the praxis the RECIPIENT owes — the shared collab, or the
    rival's own side of the duel (ADR-0011), never the sender's. That is what
    the recipient's feed card links to, and what the rate limit is keyed on.

    Every rule (member-who-has-cast for a collab, participant-of-an-active-duel
    for a duel, one per 24h) lives in ``services.nudge``; this handler is thin on
    purpose so a second caller cannot acquire a second set of them.
    """
    nudge = await send_nudge(
        praxis_id=praxis_id,
        from_character_id=character.id,
        to_character_id=character_id,
        session=session,
    )
    return NudgeOut.model_validate(nudge)


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
    data: FlagIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Flag a praxis. Reason is the shared vocabulary (ADR-0037) — same FlagIn
    payload as the comment flag route."""
    praxis = await flag_praxis(
        praxis_id=praxis_id,
        flagged_by=character,
        reason=data.reason,
        session=session,
        reason_detail=data.reason_detail,
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
