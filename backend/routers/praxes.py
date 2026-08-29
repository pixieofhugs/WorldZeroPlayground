"""Unified praxis router.

Covers all praxis operations: solo, collaboration, and duel.
Replaces the old submissions, collaborations, and praxes routers.
"""

import logging
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


class InviteResponse(WireModel):
    accept: bool


class InviteResponseOut(WireModel):
    """Acknowledgement for answering a collab invite (#1383).

    Deliberately an ack and not the praxis. This route used to answer a full
    tally-bearing `PraxisOut`, which meant a `selectinload` of the invites and
    media plus the whole `build_praxis_out` fan-out — and every caller discarded
    it, then navigated or refreshed the feed. The two facts a responder actually
    needs are which praxis was answered and which way.

    Widening this to the updated feed row instead is the better end state, but it
    waits on #1419/ADR-0070 to settle what a request row is once requests leave
    the stream.
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
    _require_member,
    add_media_batch,
    can_view_praxis,
    cancel_invite,
    change_praxis_type,
    create_praxis,
    delete_media_item,
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
    account: Optional[Account] = Depends(get_current_account_optional),
    viewer_is_admin: bool = Depends(get_viewer_is_admin),
):
    # Five rejections of the same shape — a query parameter naming a value no
    # enum member matches — so they share one code and name their field in
    # `context`. Each raise spells its context as a literal on purpose: the
    # catalog-coverage guard reads it from the AST, and a shared helper would
    # hide all five siblings from it (`uncoded_error_scan._read_params`).
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
        # Optional auth; only the Albescent reveal flag is read from it (#2422),
        # for which an admin counts as revealed (#2400).
        viewer_account=account,
        viewer_is_admin=viewer_is_admin,
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
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


# `PUT /praxes/{praxis_id}` was the composer's debounced autosave and is gone
# (#1743, ADR-0073). Title and body are now written in the praxis's room and
# flushed to the record by the room server, so there is one write path for a
# praxis body and not two — see `tests/test_deleted_routes_stay_deleted.py`
# for why re-adding it is the argument to answer, not the fix.


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


@router.post("/{praxis_id}/done", response_model=PraxisOut)
async def set_done_route(
    praxis_id: int,
    data: PraxisDoneUpdate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    _require_member(praxis, character.id, "add media to")
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    _require_member(praxis, character.id, "delete media from")
    media_item = await session.get(MediaItem, media_id)
    if media_item is None or media_item.praxis_id != praxis_id:
        raise_coded(404, ErrorCode.media_item_not_found, "Media item not found.")

    await delete_media_item(praxis, media_item, session, era=CURRENT_ERA)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Collaboration / duel invite operations
# ---------------------------------------------------------------------------


@router.post("/{praxis_id}/invite", response_model=PraxisInviteOut)
async def invite_member_route(
    praxis_id: int,
    data: PraxisInviteCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> PraxisInviteOut:
    """Invite a character onto this praxis; answer the invite row.

    The ``response_model=None`` this replaced (#1400) was a suppression, not a
    description: ``_build_invite_out`` has always returned a ``PraxisInviteOut``,
    so the only thing the annotation achieved was keeping the shape out of the
    schema. Not to be confused with the *respond* route below, which answers an
    ack rather than an invite.
    """
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
    session: AsyncSession = Depends(get_db),
):
    """Accept or decline a collab invite; answer an ack (#1383).

    See `InviteResponseOut` for why this is an ack rather than the praxis.
    """
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
    session: AsyncSession = Depends(get_db),
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
    session: AsyncSession = Depends(get_db),
):
    """Poke everyone this praxis is still waiting on, in one request (#1415).

    Takes no body: the crew is every member who has not filed yet, minus you,
    and the server derives it from the roster it already has. One press, one
    round trip — the alternative was N calls to the route above with the client
    swallowing the 422s, which would put the cooldown rule in two places.

    Returns **one entry per recipient**, in roster order, each carrying either
    the recorded ``NudgeOut`` or the refusal that recipient alone earned. The
    200 says "the request was processed", not "everyone was poked": inside the
    24h window some of the crew are routinely refused, so read every entry.
    Nobody outstanding is an empty list, not an error.

    Batch-wide verdicts are still whole-request: 404 for a missing praxis, 422
    once it is published, 403 unless the sender is a member who has already
    filed. Authorisation is identical to the single route by construction —
    both call ``services.nudge._send_nudges``.
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
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
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


@router.post("/{praxis_id}/vote", response_model=VoteCastOut)
async def cast_vote_route(
    praxis_id: int,
    data: PraxisVoteIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Cast or re-rate a star, and hand back everything the cast changed (#1382).

    The response is the client's SOLE source of post-cast truth: the praxis's new
    tally, the star that now stands, and the voter's budget. Returning a bare
    ``VoteOut`` here is what made the client keep a delta-arithmetic overlay
    store and reload ``/auth/me`` once per star.
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


@router.delete("/{praxis_id}/metatasks/{task_id}", response_model=PraxisOut)
async def remove_metatask_route(
    praxis_id: int,
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Detach a previously applied metatask from a praxis.

    Answers with the re-scored praxis, like its apply sibling (#2464). Peeling a
    seal off changes ``score`` and ``metatask_points``, and ``remove_metatask``
    has already recomputed both — a bare 204 left the composer's score stamp
    printing the higher total until a reload.
    """
    praxis = await remove_metatask(
        praxis_id=praxis_id,
        task_id=task_id,
        character_id=character.id,
        session=session,
        era=CURRENT_ERA,
    )
    return await build_praxis_out(praxis, session, viewer=character)
