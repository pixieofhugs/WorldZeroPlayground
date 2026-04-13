from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from dependencies import require_admin
from models.account import Account
from models.character import Character, CharacterStatus
from models.roles import AccountRole, Role
from models.submission import Submission
from models.task import Task, TaskStatus
from schemas.admin import (
    AccountDetail,
    AccountSummary,
    AdminCharacterCreate,
    CharacterStatsPatch,
    CharacterStatsOut,
    CharacterSummary,
    CliTokenResponse,
    FactionCreate,
    FactionOut,
    OverviewStats,
    RoleAction,
    SuspendAction,
)
from schemas.task import TaskCreate, TaskOut
from services.admin_service import (
    admin_create_character,
    assign_or_revoke_role,
    create_faction,
    game_overview,
    get_account_detail,
    list_accounts,
    list_characters,
    reactivate_task,
    set_character_stats,
    suspend_account,
)
from services.character_stats import recalculate_character_stats
from services.auth import create_jwt

router = APIRouter()


class BanAction(BaseModel):
    banned: bool


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


@router.get("/overview", response_model=OverviewStats)
async def admin_overview(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> OverviewStats:
    return await game_overview(session)


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
        votes_available=stats.votes_available,
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


@router.post("/tasks/{task_id}/reactivate", response_model=TaskOut)
async def admin_reactivate_task(
    task_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> TaskOut:
    task = await reactivate_task(task_id, session)
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status.value,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
    )


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
# Existing endpoints (unchanged)
# ---------------------------------------------------------------------------


@router.get("/tasks/pending", response_model=list[TaskOut])
async def list_pending_tasks(
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Task).where(Task.status == TaskStatus.pending).order_by(Task.created_at)
    )
    tasks = result.scalars().all()
    return [
        TaskOut(
            id=task.id,
            title=task.title,
            description=task.description,
            point_value=task.point_value,
            level_required=task.level_required,
            status=task.status.value,
            created_by=task.created_by,
            primary_faction_slug=task.primary_faction_slug,
            is_task_vision_eligible=task.is_task_vision_eligible,
            created_at=task.created_at,
        )
        for task in tasks
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
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status.value,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
    )


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
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status.value,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
    )


@router.delete("/submissions/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: int,
    _: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    await session.delete(sub)
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

    task = Task(
        title=data.title,
        description=data.description or "",
        point_value=data.point_value,
        level_required=data.level_required,
        primary_faction_slug=data.primary_faction_slug or "na",
        created_by=character.id,
        status=TaskStatus.active,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status.value,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
    )
