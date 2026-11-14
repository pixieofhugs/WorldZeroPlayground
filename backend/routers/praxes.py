"""Praxis routes: solo, collab and duel."""

from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Query,
    Response,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from db import get_db
from dependencies import (
    get_current_account_optional,
    get_current_character,
    get_current_character_optional,
    get_viewer_is_admin,
)
from errors import DETAIL_CONTEXT_PARAM, ErrorCode, raise_coded
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.praxis import MediaItem, Praxis, PraxisType
from schemas.base import WireModel
from schemas.comment import FlagIn
from schemas.google_photos import GooglePhotosIngestIn
from schemas.praxis import (
    MediaItemOut,
    MediaUploadResultOut,
    PraxisCardOut,
    PraxisCreate,
    PraxisDoneUpdate,
    PraxisInviteCreate,
    PraxisInviteOut,
    PraxisOut,
    PraxisTypeChange,
    PraxisVoteIn,
)
from services import google_photos


class InviteResponse(WireModel):
    accept: bool


class InviteResponseOut(WireModel):
    """Ack for answering a collab invite (#1383).

    Not the praxis: every caller discarded a full `PraxisOut` and refetched.
    Could become the updated feed row once #1419/ADR-0070 settles.
    """

    praxis_id: int
    accepted: bool


class MetataskApply(WireModel):
    task_id: int
from schemas.nudge import NudgeOut, NudgeResultOut
from schemas.vote import VoteCastOut, VoteOut, VoteTallyOut, ViewerStatsOut
from services.collab_consensus import on_member_edit
from services.scoring import compute_votes_available
from services.praxis import (
    add_media_batch,
    can_view_praxis,
    cancel_invite,
    change_praxis_type,
    create_praxis,
    delete_media_item,
    delete_praxis,
    flag_praxis,
    get_praxis_settling_consensus,
    get_praxis_settling_consensus_for_member,
    invite_to_praxis,
    kick_member,
    leave_praxis,
    list_praxes,
    PraxisEraScope,
    PraxisSort,
    VotedFilter,
    respond_to_invite,
    set_member_done,
    submit_praxis,
    unsubmit_praxis,
)
from services.praxis_metatask import apply_metatask, remove_metatask
from services.praxis_out import (
    _build_invite_out,
    build_praxis_cards,
    build_praxis_out,
)
from services.media import process_and_save_media
from services.nudge import nudge_the_crew, send_nudge
from services.vote import cast_vote_on_praxis


router = APIRouter()


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
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Optional[Character] = Depends(get_current_character_optional),
    account: Optional[Account] = Depends(get_current_account_optional),
    viewer_is_admin: bool = Depends(get_viewer_is_admin),
):
    # Context stays a literal per raise: the catalog-coverage guard reads it from
    # the AST, so a shared helper would hide these (`uncoded_error_scan`).
    praxis_sort: Optional[PraxisSort] = None
    if sort is not None:
        try:
            praxis_sort = PraxisSort(sort)
        except ValueError:
            raise_coded(
                422,
                ErrorCode.praxis_filter_value_invalid,
                f"Invalid praxis sort: {sort}",
                {DETAIL_CONTEXT_PARAM: "sort", "value": sort},
            )

    try:
        era_scope_value = PraxisEraScope(era_scope)
    except ValueError:
        raise_coded(
            422,
            ErrorCode.praxis_filter_value_invalid,
            f"Invalid praxis era scope: {era_scope}",
            {DETAIL_CONTEXT_PARAM: "era_scope", "value": era_scope},
        )

    voted_filter: Optional[VotedFilter] = None
    if voted is not None:
        try:
            voted_filter = VotedFilter(voted)
        except ValueError:
            raise_coded(
                422,
                ErrorCode.praxis_filter_value_invalid,
                f"Invalid voted filter: {voted}",
                {DETAIL_CONTEXT_PARAM: "voted", "value": voted},
            )

    praxis_type: Optional[PraxisType] = None
    if type is not None:
        try:
            praxis_type = PraxisType(type)
        except ValueError:
            raise_coded(
                422,
                ErrorCode.praxis_filter_value_invalid,
                f"Invalid praxis type: {type}",
                {DETAIL_CONTEXT_PARAM: "type", "value": type},
            )

    from models.praxis import PraxisStatus
    praxis_status: Optional[PraxisStatus] = None
    if status is not None:
        try:
            praxis_status = PraxisStatus(status)
        except ValueError:
            raise_coded(
                422,
                ErrorCode.praxis_filter_value_invalid,
                f"Invalid praxis status: {status}",
                {DETAIL_CONTEXT_PARAM: "status", "value": status},
            )

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
        # Only the Albescent reveal flag is read (#2422); admins count as revealed.
        viewer_account=account,
        viewer_is_admin=viewer_is_admin,
        limit=limit,
        offset=offset,
    )
    return await build_praxis_cards(praxes, session, viewer)


@router.get("/{praxis_id}", response_model=PraxisOut)
async def get_praxis_route(
    praxis_id: int,
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    # ADR-0012: no scheduler, so a lapsed pending-publish window settles here.
    praxis = await get_praxis_settling_consensus(praxis_id, session)
    # 404 not 403: don't reveal hidden praxes or others' drafts (ADR-0024).
    if not await can_view_praxis(viewer, praxis, session):
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    return await build_praxis_out(praxis, session, viewer=viewer)


@router.post("", response_model=PraxisOut, status_code=201)
async def create_praxis_route(
    data: PraxisCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
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


# No `PUT /praxes/{id}`: the room server is the one body write path (ADR-0073;
# see tests/test_deleted_routes_stay_deleted.py).


@router.post("/{praxis_id}/change-type", response_model=PraxisOut)
async def change_praxis_type_route(
    praxis_id: int,
    data: PraxisTypeChange,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
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
    session: AsyncSession = Depends(get_db, scope="function"),
):
    await delete_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
    )
    return Response(status_code=204)


@router.post("/{praxis_id}/unsubmit", response_model=PraxisOut)
async def unsubmit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await unsubmit_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/done", response_model=PraxisOut)
async def set_done_route(
    praxis_id: int,
    data: PraxisDoneUpdate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await set_member_done(
        praxis_id=praxis_id,
        character_id=character.id,
        is_done=data.is_done,
        session=session,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/submit", response_model=PraxisOut)
async def submit_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await submit_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/media", response_model=MediaItemOut, status_code=201)
async def upload_media_route(
    praxis_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character.id, "add media to", session, CURRENT_ERA
    )
    media_item = await process_and_save_media(
        file, praxis_id, character.id, display_order
    )
    session.add(media_item)
    await session.flush()
    await session.refresh(media_item)
    # Media is part of the shared document — adding it cancels a pending publish (ADR-0012).
    await on_member_edit(praxis, session)
    return MediaItemOut.model_validate(media_item)


@router.post(
    "/{praxis_id}/media/google-photos",
    response_model=List[MediaUploadResultOut],
    status_code=201,
)
async def ingest_google_photos_route(
    praxis_id: int,
    data: GooglePhotosIngestIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Attach Google Photos picker items (#559); ``/media/batch`` shape."""
    await google_photos.require_google_account(character.account_id, session)
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character.id, "add media to", session, CURRENT_ERA
    )
    return await google_photos.ingest_picked_media(
        praxis=praxis,
        character_id=character.id,
        account_id=character.account_id,
        session_id=data.session_id,
        session=session,
        era=CURRENT_ERA,
    )


@router.post(
    "/{praxis_id}/media/batch",
    response_model=List[MediaUploadResultOut],
    status_code=201,
)
async def upload_media_batch_route(
    praxis_id: int,
    files: List[UploadFile] = File(...),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Upload N media files in one request (#1298).

    One entry per file, in request order: a ``MediaItemOut`` or that file's error.
    201 means processed, not all succeeded. 404/403 are batch-wide.
    ``display_order`` follows request position, after existing media.

    Limits: 100 MB per file (``MEDIA_MAX_BYTES``, per-file 413); 1000 files per
    request (Starlette ``max_files``, whole-request 400); no app-level total cap
    (parts spool to temp files); edge proxy limit unknown, so clients chunk.
    """
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character.id, "add media to", session, CURRENT_ERA
    )
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
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character.id, "delete media from", session, CURRENT_ERA
    )
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.praxis_id != praxis_id:
        raise_coded(404, ErrorCode.media_item_not_found, "Media item not found.")

    await delete_media_item(praxis, media_item, session, era=CURRENT_ERA)
    return Response(status_code=204)


@router.post("/{praxis_id}/invite", response_model=PraxisInviteOut)
async def invite_member_route(
    praxis_id: int,
    data: PraxisInviteCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> PraxisInviteOut:
    """Invite a character onto this praxis; answer the invite row."""
    invite = await invite_to_praxis(
        praxis_id=praxis_id,
        invitee_id=data.invitee_id,
        inviter_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return _build_invite_out(invite)


@router.post("/{praxis_id}/invite/{invite_id}/respond", response_model=InviteResponseOut)
async def respond_to_invite_route(
    praxis_id: int,
    invite_id: int,
    data: InviteResponse,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Accept or decline a collab invite; answer an ack (see `InviteResponseOut`)."""
    invite = await respond_to_invite(
        invite_id=invite_id,
        character_id=character.id,
        accept=data.accept,
        session=session,
        era=CURRENT_ERA,
    )
    return InviteResponseOut(praxis_id=invite.praxis_id, accepted=data.accept)


@router.delete("/{praxis_id}/invite/{invite_id}", status_code=204)
async def cancel_invite_route(
    praxis_id: int,
    invite_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    await cancel_invite(
        praxis_id=praxis_id,
        invite_id=invite_id,
        requester_id=character.id,
        session=session,
    )
    return Response(status_code=204)


@router.post("/{praxis_id}/nudge/{character_id}", response_model=NudgeOut)
async def nudge_route(
    praxis_id: int,
    character_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Poke the player this praxis is still waiting on (#1083).

    ``praxis_id`` is the praxis the RECIPIENT owes (for a duel, the rival's side,
    ADR-0011); the rate limit keys on it. Rules live in ``services.nudge``.
    """
    return await send_nudge(
        praxis_id=praxis_id,
        from_character_id=character.id,
        to_character_id=character_id,
        session=session,
    )


@router.post("/{praxis_id}/nudge", response_model=List[NudgeResultOut])
async def nudge_crew_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Poke every unfiled member but you, in one request (#1415).

    One entry per recipient in roster order: a ``NudgeOut`` or that recipient's
    refusal (cooldown refusals are routine), so read every entry. 404/422/403 are
    whole-request; auth matches the single route via ``_send_nudges``.
    """
    return await nudge_the_crew(
        praxis_id=praxis_id,
        from_character_id=character.id,
        session=session,
    )


@router.post("/{praxis_id}/kick/{member_id}", response_model=PraxisOut)
async def kick_member_route(
    praxis_id: int,
    member_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/leave", response_model=PraxisOut)
async def leave_praxis_route(
    praxis_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    praxis = await leave_praxis(
        praxis_id=praxis_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/flag", response_model=PraxisOut)
async def flag_praxis_route(
    praxis_id: int,
    data: FlagIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Flag a praxis; reason vocabulary per ADR-0037."""
    praxis = await flag_praxis(
        praxis_id=praxis_id,
        flagged_by=character,
        reason=data.reason,
        session=session,
        reason_detail=data.reason_detail,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.post("/{praxis_id}/vote", response_model=VoteCastOut)
async def cast_vote_route(
    praxis_id: int,
    data: PraxisVoteIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Cast or re-rate a star (#1382).

    The client's sole post-cast truth: new tally, standing star, voter budget.
    """
    cast = await cast_vote_on_praxis(
        character, praxis_id, data.value, session, era=CURRENT_ERA,
    )
    return VoteCastOut(
        **VoteOut.model_validate(cast.vote).model_dump(),
        tally=VoteTallyOut(
            points_from_votes=cast.tally.points_from_votes,
            voter_count=cast.tally.voter_count,
        ),
        viewer_vote=cast.vote.value,
        viewer_stats=ViewerStatsOut(
            score=cast.voter_stats.score,
            level=cast.voter_stats.level,
            votes_available=compute_votes_available(cast.voter_stats, CURRENT_ERA),
        ),
    )


@router.post("/{praxis_id}/metatasks", response_model=PraxisOut, status_code=201)
async def apply_metatask_route(
    praxis_id: int,
    data: MetataskApply,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Attach a metatask to a praxis; gates live in ``apply_metatask``."""
    praxis = await apply_metatask(
        praxis_id=praxis_id,
        task_id=data.task_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)


@router.delete("/{praxis_id}/metatasks/{task_id}", response_model=PraxisOut)
async def remove_metatask_route(
    praxis_id: int,
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Detach a metatask; answers the re-scored praxis (#2464)."""
    praxis = await remove_metatask(
        praxis_id=praxis_id,
        task_id=task_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)
