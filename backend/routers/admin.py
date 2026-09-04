import hmac
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import ConfigDict
from schemas.base import WireModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from db import get_db
from dependencies import get_current_character_optional, require_admin
from models.account import Account
from models.character import Character, CharacterStatus
from models.praxis import ModerationStatus, Praxis
from models.task import TaskStatus
from schemas.admin import (
    AccountDetail,
    AccountSummary,
    AdminTaskPatch,
    BanAction,
    BanActionOut,
    CharacterStatsPatch,
    CharacterStatsOut,
    CharacterSummary,
    CliTokenResponse,
    EraOption,
    EraRollIn,
    EraRollOut,
    FlaggedCommentOut,
    FlaggedPraxisOut,
    ModerationAction,
    OverviewStats,
    SuspendAction,
    SuspendActionOut,
    TaskImportResult,
    TaskStatusAction,
)
from schemas.task import TaskOut
from schemas.praxis import PraxisOut
from schemas.comment import CommentModerationIn, CommentOut
from services.praxis import moderate_praxis
from services.praxis_out import build_praxis_out
from services.vote_tally import crowned_praxis_ids
from services.comment import build_comment_out, list_flagged_comments, moderate_comment
from services.task import build_task_out, in_progress_counts_for_tasks
from services.admin_service import (
    admin_edit_task,
    apply_ban,
    archive_message,
    find_admin_accounts,
    flags_for_comments,
    flags_for_praxes,
    game_overview,
    get_account_detail,
    list_accounts,
    list_characters,
    list_contact_messages,
    list_pending_tasks_with_proposer,
    list_registered_eras,
    roll_into_era,
    set_character_stats,
    suspend_account,
    update_task_status,
)
from services.task_import import (
    TaskImportError,
    import_tasks_from_csv,
)
from services.scoring import compute_votes_available
from services.auth import create_jwt

router = APIRouter()


class ContactMessageOut(WireModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    message: str
    is_archived: bool = False
    created_at: datetime


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


@router.get("/overview", response_model=OverviewStats)
async def admin_overview(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> OverviewStats:
    return await game_overview(session)


@router.get("/messages", response_model=list[ContactMessageOut])
async def admin_list_messages(
    archived: bool = False,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[ContactMessageOut]:
    messages = await list_contact_messages(session, archived=archived)
    return [ContactMessageOut.model_validate(message) for message in messages]


@router.patch("/messages/{message_id}/archive", response_model=ContactMessageOut)
async def admin_archive_message(
    message_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> ContactMessageOut:
    message = await archive_message(message_id, session)
    return ContactMessageOut.model_validate(message)


@router.get("/accounts", response_model=list[AccountSummary])
async def admin_list_accounts(
    email: str | None = None,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[AccountSummary]:
    return await list_accounts(session, email_filter=email)


@router.get("/accounts/{account_id}", response_model=AccountDetail)
async def admin_get_account(
    account_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> AccountDetail:
    return await get_account_detail(account_id, session)


@router.get("/characters", response_model=list[CharacterSummary])
async def admin_list_characters(
    faction: str | None = None,
    status: CharacterStatus | None = None,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[CharacterSummary]:
    return await list_characters(session, faction=faction, status=status)


# ---------------------------------------------------------------------------
# Adjust Game State
# ---------------------------------------------------------------------------


@router.patch("/characters/{character_id}/stats", response_model=CharacterStatsOut)
async def admin_patch_character_stats(
    character_id: int,
    patch: CharacterStatsPatch,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> CharacterStatsOut:
    stats = await set_character_stats(character_id, patch, session)
    return CharacterStatsOut(
        id=stats.id,
        character_id=stats.character_id,
        era_id=stats.era_id,
        score=stats.score,
        all_time_score=stats.all_time_score,
        level=stats.level,
        votes_available=compute_votes_available(stats),
    )


# ---------------------------------------------------------------------------
# Role & Account Management
# ---------------------------------------------------------------------------


@router.post(
    "/accounts/{account_id}/suspend", response_model=SuspendActionOut, status_code=200
)
async def admin_suspend_account(
    account_id: int,
    data: SuspendAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> SuspendActionOut:
    account = await suspend_account(account_id, data.suspended, session)
    return SuspendActionOut(account_id=account.id, status=account.status.value)


# ---------------------------------------------------------------------------
# CLI Auth (for skill/programmatic access)
# ---------------------------------------------------------------------------


@router.post("/cli-token", response_model=CliTokenResponse)
async def admin_cli_token(
    x_admin_cli_secret: str = Header(..., alias="X-Admin-Cli-Secret"),
    session: AsyncSession = Depends(get_db),
) -> CliTokenResponse:
    """Return a JWT for the first admin account when the CLI secret matches."""
    # One indistinguishable refusal for both "not configured" and "wrong
    # secret". Two different messages told an unauthenticated prober whether
    # ADMIN_CLI_SECRET is set at all, which is the reconnaissance step before
    # attacking it — and this one header is the ENTIRE authentication boundary
    # for a 7-day full-admin JWT.
    #
    # compare_digest, not `!=`: Python string comparison short-circuits on
    # length and on the first differing block, so `!=` leaks the secret's shape
    # through response timing. Impractical over a network, but the whole
    # privilege of the endpoint rests on this single comparison.
    if not settings.ADMIN_CLI_SECRET or not hmac.compare_digest(
        x_admin_cli_secret, settings.ADMIN_CLI_SECRET
    ):
        raise HTTPException(status_code=403, detail="Invalid CLI secret.")

    admins = await find_admin_accounts(session)
    if not admins:
        raise HTTPException(status_code=500, detail="No admin account found. Run seed first.")
    return CliTokenResponse(access_token=create_jwt(admins[0].id))


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------


@router.get("/praxes/flagged", response_model=list[FlaggedPraxisOut])
async def admin_list_flagged_praxes(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    """Return praxes with moderation_status == flagged, each with its flag rows (#237)."""
    # NB: this docstring is published verbatim into `backend/openapi.json`, a
    # committed artifact in a public repo — the rationale below stays a comment.
    #
    # `require_admin` resolves an Account, but the viewer-relative fields on this
    # payload (`viewer_can_vote`, `can_flag`) are the moderator's CHARACTER's, so
    # the optional character dependency rides along. Without it the builder got
    # `viewer=None` and answered every viewer-relative question as if nobody were
    # signed in — `viewer_can_vote=True` on the moderator's own praxis (#1974).
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.moderation_status == ModerationStatus.flagged)
        .order_by(Praxis.created_at.desc())
    )
    praxis_list = result.scalars().all()
    # Task Crown (ADR-0028): one windowed query for the whole list — not per card.
    crowned = await crowned_praxis_ids(
        {praxis.task_id for praxis in praxis_list}, session
    )
    flags_by_praxis = await flags_for_praxes(
        {praxis.id for praxis in praxis_list}, session
    )
    return [
        FlaggedPraxisOut(
            **(
                await build_praxis_out(
                    praxis, session, viewer=viewer, crowned_ids=crowned
                )
            ).model_dump(),
            flags=flags_by_praxis.get(praxis.id, []),
        )
        for praxis in praxis_list
    ]


@router.patch("/praxes/{praxis_id}/moderate", response_model=PraxisOut)
async def admin_moderate_praxis(
    praxis_id: int,
    data: ModerationAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    """Rule on a praxis and return it as the moderator sees it."""
    # The praxis detail page feeds this response straight back into its praxis
    # state (`usePraxisDetail.handleModerate`), so the viewer-relative fields have
    # to be the moderator's own. Built with no viewer, this put the vote widget
    # back on a moderator's own praxis the moment they hid or failed it (#1974).
    praxis = await moderate_praxis(praxis_id, data.status, data.admin_note, session)
    return await build_praxis_out(praxis, session, viewer=viewer)


@router.get("/comments/flagged", response_model=list[FlaggedCommentOut])
async def admin_list_flagged_comments(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Return comments with moderation_status == flagged, each with its flag rows (#237)."""
    comments = await list_flagged_comments(session)
    flags_by_comment = await flags_for_comments(
        {comment.id for comment in comments}, session
    )
    return [
        FlaggedCommentOut(
            **build_comment_out(comment).model_dump(),
            flags=flags_by_comment.get(comment.id, []),
        )
        for comment in comments
    ]


@router.patch("/comments/{comment_id}/moderate", response_model=CommentOut)
async def admin_moderate_comment(
    comment_id: int,
    data: CommentModerationIn,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    comment = await moderate_comment(comment_id, data.status, session)
    return build_comment_out(comment)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def admin_patch_task(
    task_id: int,
    data: AdminTaskPatch,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    task = await admin_edit_task(task_id, data, session)
    return await build_task_out(task, session)


@router.put("/tasks/{task_id}/status", response_model=TaskOut)
async def admin_update_task_status(
    task_id: int,
    data: TaskStatusAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    new_status = TaskStatus(data.status)
    task = await update_task_status(task_id, new_status, session)
    return await build_task_out(task, session)


# ---------------------------------------------------------------------------
# Existing endpoints (unchanged)
# ---------------------------------------------------------------------------


class PendingTaskOut(TaskOut):
    created_by_name: str = ""
    # The proposer's note to the reviewing admin (#1823). It lives here and not
    # on ``TaskOut`` on purpose: the field is labelled "Notes to admin" and is
    # written in the expectation that a reviewer reads it, not the whole player
    # base. ``TaskOut`` is the public browse/detail payload, so putting it there
    # would publish it. This route is the one behind ``require_admin``.
    notes: str = ""


@router.get("/tasks/pending", response_model=list[PendingTaskOut])
async def list_pending_tasks(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    rows = await list_pending_tasks_with_proposer(session)
    # One grouped query for the whole page (#1021) — never a per-task count.
    # (Pending tasks are ordinarily signup-free, but era config can carve out
    # factions allowed to act on a still-pending task — era.allow_praxis_on_-
    # pending_task_factions — so this reads the real count, not an assumed 0.)
    in_progress_counts = await in_progress_counts_for_tasks(
        [task.id for task, _ in rows], session
    )
    return [
        PendingTaskOut(
            id=task.id,
            title=task.title,
            description=task.description,
            point_value=task.point_value,
            level_required=task.level_required,
            status=task.status,
            task_type=task.task_type,
            created_by=task.created_by,
            primary_faction_slug=task.primary_faction_slug,
            metatask_faction_slug=task.metatask_faction_slug,
            created_at=task.created_at,
            in_progress_count=in_progress_counts.get(task.id, 0),
            created_by_name=display_name or "",
            notes=task.notes,
        )
        for task, display_name in rows
    ]


@router.post(
    "/characters/{character_id}/ban", response_model=BanActionOut, status_code=200
)
async def ban_character(
    character_id: int,
    data: BanAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> BanActionOut:
    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    await apply_ban(character, data.banned, session)
    return BanActionOut(character_id=character_id, banned=data.banned)


@router.post("/tasks/import-csv", response_model=TaskImportResult, status_code=201)
async def admin_import_tasks_csv(
    file: UploadFile = File(...),
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Admin-only: bulk-create tasks from an uploaded CSV (#1376).

    Atomic — either every row becomes a task or none does. Rejections come back
    as a 422 whose ``detail`` is one ``{row, msg}`` object per failing row, so the
    admin can fix the whole file in one pass. Nothing is added to the session
    before validation succeeds, and ``get_db`` rolls back on the raise besides.
    """
    try:
        outcome = await import_tasks_from_csv(await file.read(), admin, session)
    except TaskImportError as exc:
        raise HTTPException(
            status_code=422,
            detail=[{"row": error.row, "msg": error.msg} for error in exc.errors],
        )
    return TaskImportResult(
        created_count=outcome.created_count,
        created_titles=outcome.created_titles,
        warnings=outcome.warnings,
    )


# ---------------------------------------------------------------------------
# Era rollover (#827, ADR-0091)
# ---------------------------------------------------------------------------


@router.get("/eras", response_model=list[EraOption])
async def admin_list_eras(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[EraOption]:
    """Admin-only: the eras a rollover may target, and which one is live.

    Which rulesets exist is a code fact; which one is **live** is a database one
    — the latest ``Era`` row (ADR-0091), which is also what ``PUT /eras/live``
    refuses against. Reading it from the process binding instead would let the
    selector offer an era the ``PUT`` then rejects, in the one state where the
    two can disagree.
    """
    return await list_registered_eras(session)


@router.put("/eras/live", response_model=EraRollOut)
async def admin_roll_into_era(
    data: EraRollIn,
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> EraRollOut:
    """Admin-only: end the live era and open the one named. **No undo.**

    Everyone's score, level, vote budget and faction reset per the incoming
    era's flags; every unresolved duel freezes into a permanent result (#824);
    the whole board retires; and the process starts playing by the new rules
    before this response is written.

    ``PUT`` rather than ``POST`` because the resource is "the live era" and this
    sets it — and unlike the append it wraps, the call itself settles: repeating
    it with the key that is now live is refused with **409
    ``ERA_ALREADY_LIVE``** rather than opening a second era, and two calls that
    overlap are serialized by an advisory lock, so the second one sees the first
    one's row and refuses on it. What is still not idempotent is rolling on:
    naming a *different* era opens another one every time, and the only thing
    between a mod and that is the confirmation on the admin page — the
    equivalent gate on ``scripts/era_reset.py`` is its ``--yes``.

    This route restores an entry point #1667 deleted, deliberately and on the
    other side of the argument that deleted it: ``PUT /admin/era/reset`` went
    because it was unreachable from any UI and re-instantiated the same era, so
    a destructive rollover sat behind any admin session for no gain. It comes
    back because #827 gives it the two things it lacked — a target to choose,
    and a mod control that chooses it.
    """
    return await roll_into_era(data.config_key, admin, session)
