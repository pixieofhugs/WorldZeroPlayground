from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from dependencies import require_admin
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
from models.contact import ContactMessage
from models.era import Era
from models.roles import AccountRole, Role
from models.praxis import ModerationStatus, Praxis
from models.task import Task, TaskStatus, TaskType
from schemas.admin import (
    AccountDetail,
    AccountSummary,
    AdminCharacterCreate,
    AdminTaskPatch,
    CharacterStatsPatch,
    CharacterStatsOut,
    CharacterSummary,
    CliTokenResponse,
    FactionCreate,
    FactionOut,
    ModerationAction,
    OverviewStats,
    RoleAction,
    SuspendAction,
    TaskStatusAction,
)
from schemas.task import TaskCreate, TaskOut
from schemas.praxis import PraxisOut
from services.praxis import build_praxis_out, moderate_praxis
from services.task import build_task_out
from services.admin_service import (
    admin_create_character,
    admin_edit_task,
    archive_message,
    assign_or_revoke_role,
    create_faction,
    game_overview,
    get_account_detail,
    list_accounts,
    list_characters,
    reactivate_task,
    set_character_stats,
    suspend_account,
    update_task_status,
)
from services.character_stats import recalculate_character_stats
from services.era import apply_era_reset, get_current_era_row
from services.scoring import compute_votes_available
from services.auth import create_jwt

router = APIRouter()


class BanAction(BaseModel):
    banned: bool


class ContactMessageOut(BaseModel):
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
    query = select(ContactMessage).where(
        ContactMessage.is_archived == archived
    ).order_by(ContactMessage.created_at.desc())
    result = await session.execute(query)
    return [ContactMessageOut.model_validate(m) for m in result.scalars().all()]


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
    status: str | None = None,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[CharacterSummary]:
    return await list_characters(session, faction=faction, status=status)


# ---------------------------------------------------------------------------
# Seed / Insert
# ---------------------------------------------------------------------------


@router.post("/factions", response_model=FactionOut, status_code=201)
async def admin_create_faction(
    data: FactionCreate,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> FactionOut:
    faction = await create_faction(data, session)
    return FactionOut(
        slug=faction.slug,
        name=faction.name,
        description=faction.description,
        status=faction.status.value,
        created_at=faction.created_at,
    )


@router.post("/characters", status_code=201)
async def admin_create_character_endpoint(
    data: AdminCharacterCreate,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    character = await admin_create_character(data, session)
    return {
        "id": character.id,
        "account_id": character.account_id,
        "username": character.username,
        "display_name": character.display_name,
        "faction_slug": character.faction_slug,
        "status": character.status.value,
        "created_at": character.created_at,
    }


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


@router.post("/characters/backfill-stats", status_code=200)
async def backfill_all_character_stats(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Recompute CharacterStats for every character using current vote data.

    Safe to call repeatedly. Use after a scoring formula change to bring all
    persisted scores in sync.
    """
    result = await session.execute(
        select(Character).where(Character.status != CharacterStatus.banned)
    )
    characters = result.scalars().all()
    for character in characters:
        await recalculate_character_stats(character.id, session)
    await session.commit()
    return {"recalculated": len(characters)}


@router.put("/era/reset", status_code=200)
async def admin_era_reset(
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger an era reset: create a new Era row and reset all character stats.

    Behaviour controlled by EraConfig reset flags (reset_score, reset_level,
    reset_faction, reset_vote_budget, reset_all_time_score).
    """
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=admin.id,
    )
    session.add(new_era_row)
    await session.flush()

    result = await session.execute(select(Character).where(Character.status != CharacterStatus.banned))
    characters = result.scalars().all()

    await apply_era_reset(characters, new_era_row, session)

    return {"era_id": new_era_row.id, "characters_reset": len(characters)}


@router.post("/tasks/{task_id}/reactivate", response_model=TaskOut)
async def admin_reactivate_task(
    task_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> TaskOut:
    task = await reactivate_task(task_id, session)
    return build_task_out(task)


# ---------------------------------------------------------------------------
# Role & Account Management
# ---------------------------------------------------------------------------


@router.post("/accounts/{account_id}/role", status_code=200)
async def admin_manage_role(
    account_id: int,
    data: RoleAction,
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    await assign_or_revoke_role(
        account_id=account_id,
        role_name=data.role,
        action=data.action,
        admin_account_id=admin.id,
        session=session,
    )
    return {"account_id": account_id, "role": data.role, "action": data.action}


@router.post("/accounts/{account_id}/suspend", status_code=200)
async def admin_suspend_account(
    account_id: int,
    data: SuspendAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    account = await suspend_account(account_id, data.suspended, session)
    return {"account_id": account.id, "status": account.status.value}


# ---------------------------------------------------------------------------
# CLI Auth (for skill/programmatic access)
# ---------------------------------------------------------------------------


@router.post("/cli-token", response_model=CliTokenResponse)
async def admin_cli_token(
    x_admin_cli_secret: str = Header(..., alias="X-Admin-Cli-Secret"),
    session: AsyncSession = Depends(get_db),
) -> CliTokenResponse:
    """Return a JWT for the admin account using a static secret.

    Requires ADMIN_CLI_SECRET to be set in the environment. Returns 403 if
    the secret is blank (disabled) or does not match.
    """
    if not settings.ADMIN_CLI_SECRET:
        raise HTTPException(status_code=403, detail="CLI token endpoint is disabled.")
    if x_admin_cli_secret != settings.ADMIN_CLI_SECRET:
        raise HTTPException(status_code=403, detail="Invalid CLI secret.")

    # Find the admin account (first account with the admin role)
    result = await session.execute(
        select(Account)
        .join(AccountRole, AccountRole.account_id == Account.id)
        .join(Role, Role.id == AccountRole.role_id)
        .where(Role.name == "admin")
        .limit(1)
    )
    admin_account = result.scalar_one_or_none()

    if admin_account is None:
        raise HTTPException(status_code=500, detail="No admin account found. Run seed first.")

    token = create_jwt(admin_account.id)
    return CliTokenResponse(access_token=token)


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------


@router.get("/praxes/flagged", response_model=list[PraxisOut])
async def admin_list_flagged_praxes(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Return praxes with moderation_status == flagged."""
    result = await session.execute(
        select(Praxis)
        .where(Praxis.moderation_status == ModerationStatus.flagged.value)
        .order_by(Praxis.created_at.desc())
    )
    praxis_list = result.scalars().all()
    return [await build_praxis_out(praxis, session) for praxis in praxis_list]


@router.patch("/praxes/{praxis_id}/moderate", response_model=PraxisOut)
async def admin_moderate_praxis(
    praxis_id: int,
    data: ModerationAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    praxis = await moderate_praxis(praxis_id, data.status, data.admin_note, session)
    return await build_praxis_out(praxis, session)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def admin_patch_task(
    task_id: int,
    data: AdminTaskPatch,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    task = await admin_edit_task(task_id, data, session)
    return build_task_out(task)


@router.put("/tasks/{task_id}/status", response_model=TaskOut)
async def admin_update_task_status(
    task_id: int,
    data: TaskStatusAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    new_status = TaskStatus(data.status)
    task = await update_task_status(task_id, new_status, session)
    return build_task_out(task)


# ---------------------------------------------------------------------------
# Existing endpoints (unchanged)
# ---------------------------------------------------------------------------


class PendingTaskOut(TaskOut):
    created_by_name: str = ""


@router.get("/tasks/pending", response_model=list[PendingTaskOut])
async def list_pending_tasks(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Task, Character.display_name)
        .outerjoin(Character, Character.id == Task.created_by)
        .where(Task.status == TaskStatus.pending)
        .order_by(Task.created_at)
    )
    rows = result.all()
    return [
        PendingTaskOut(
            id=task.id,
            title=task.title,
            description=task.description,
            point_value=task.point_value,
            level_required=task.level_required,
            status=task.status.value,
            task_type=task.task_type.value,
            created_by=task.created_by,
            primary_faction_slug=task.primary_faction_slug,
            metatask_faction_slug=task.metatask_faction_slug,
            is_task_vision_eligible=task.is_task_vision_eligible,
            created_at=task.created_at,
            created_by_name=display_name or "",
        )
        for task, display_name in rows
    ]


@router.put("/tasks/{task_id}/approve", response_model=TaskOut)
async def approve_task(
    task_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status != TaskStatus.pending:
        raise HTTPException(status_code=422, detail="Only pending tasks can be approved.")
    task.status = TaskStatus.active
    await session.commit()
    await session.refresh(task)
    return build_task_out(task)


@router.put("/tasks/{task_id}/retire", response_model=TaskOut)
async def retire_task(
    task_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status != TaskStatus.active:
        raise HTTPException(status_code=422, detail="Only active tasks can be retired.")
    task.status = TaskStatus.retired
    await session.commit()
    await session.refresh(task)
    return build_task_out(task)


class TaskVisionToggle(BaseModel):
    is_task_vision_eligible: bool


@router.patch("/tasks/{task_id}/task-vision", response_model=TaskOut)
async def admin_toggle_task_vision(
    task_id: int,
    data: TaskVisionToggle,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Admin-only: toggle whether Journeymen/Albescent can access a retired task."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    task.is_task_vision_eligible = data.is_task_vision_eligible
    await session.commit()
    await session.refresh(task)
    return build_task_out(task)


@router.delete("/praxes/{praxis_id}", status_code=204)
async def admin_delete_praxis(
    praxis_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    praxis.moderation_status = ModerationStatus.hidden.value
    await session.commit()


@router.post("/characters/{character_id}/ban", status_code=200)
async def ban_character(
    character_id: int,
    data: BanAction,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    character.status = CharacterStatus.banned if data.banned else CharacterStatus.active
    await session.commit()
    return {"character_id": character_id, "banned": data.banned}


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def admin_create_task(
    data: TaskCreate,
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Admin-only: create a task directly in active status."""
    result = await session.execute(
        select(Character)
        .where(
            Character.account_id == admin.id,
            Character.status == CharacterStatus.active,
        )
        .limit(1)
    )
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=422, detail="Admin must have an active character.")

    # Resolve task_type; admins can create metatask rows directly.
    task_type = TaskType.standard
    if data.task_type:
        try:
            task_type = TaskType(data.task_type)
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Invalid task_type: {data.task_type}"
            )
    if task_type == TaskType.metatask and not data.metatask_faction_slug:
        raise HTTPException(
            status_code=422,
            detail="metatask_faction_slug is required for metatask creation.",
        )
    task = Task(
        title=data.title,
        description=data.description or "",
        point_value=data.point_value,
        level_required=data.level_required,
        primary_faction_slug=data.primary_faction_slug or "na",
        metatask_faction_slug=(
            data.metatask_faction_slug if task_type == TaskType.metatask else None
        ),
        task_type=task_type,
        created_by=character.id,
        status=TaskStatus.active,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return build_task_out(task)
