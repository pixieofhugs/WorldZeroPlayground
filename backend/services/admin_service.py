"""Admin-only service functions for ad-hoc database management."""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.faction import Faction, FactionStatus
from models.roles import AccountRole, Role
from models.contact import ContactMessage
from models.praxis import ModerationStatus, Praxis
from models.task import Task, TaskStatus
from models.vote import Vote
from schemas.admin import (
    AccountDetail,
    AccountSummary,
    AdminCharacterCreate,
    AdminTaskPatch,
    CharacterBrief,
    CharacterStatsPatch,
    CharacterSummary,
    FactionCreate,
    OverviewStats,
)
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_votes_available


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


async def list_accounts(
    session: AsyncSession,
    email_filter: str | None = None,
) -> list[AccountSummary]:
    query = select(Account).order_by(Account.created_at.desc())
    if email_filter:
        query = query.where(Account.email.ilike(f"%{email_filter}%"))
    result = await session.execute(query)
    accounts = result.scalars().all()
    return [
        AccountSummary(
            id=account.id,
            email=account.email,
            status=account.status.value,
            created_at=account.created_at,
        )
        for account in accounts
    ]


async def get_account_detail(account_id: int, session: AsyncSession) -> AccountDetail:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    result = await session.execute(
        select(Character).where(Character.account_id == account_id).order_by(Character.created_at)
    )
    characters = result.scalars().all()

    return AccountDetail(
        id=account.id,
        email=account.email,
        status=account.status.value,
        created_at=account.created_at,
        characters=[
            CharacterBrief(
                id=character.id,
                username=character.username,
                display_name=character.display_name,
                faction_slug=character.faction_slug,
                status=character.status.value,
            )
            for character in characters
        ],
    )


async def list_characters(
    session: AsyncSession,
    faction: str | None = None,
    status: str | None = None,
    era: EraConfig = CURRENT_ERA,
) -> list[CharacterSummary]:
    era_row = await get_current_era_row(session)

    query = (
        select(Character, CharacterStats)
        .outerjoin(
            CharacterStats,
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_row.id),
        )
        .order_by(Character.created_at.desc())
    )
    if faction:
        query = query.where(Character.faction_slug == faction)
    if status:
        try:
            status_enum = CharacterStatus(status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
        query = query.where(Character.status == status_enum)

    result = await session.execute(query)
    rows = result.all()

    return [
        CharacterSummary(
            id=character.id,
            account_id=character.account_id,
            username=character.username,
            display_name=character.display_name,
            faction_slug=character.faction_slug,
            status=character.status.value,
            score=stats.score if stats else 0,
            level=stats.level if stats else 0,
            votes_available=compute_votes_available(stats, era) if stats else era.vote_budget_base,
            created_at=character.created_at,
        )
        for character, stats in rows
    ]


async def game_overview(session: AsyncSession) -> OverviewStats:
    account_count_result = await session.execute(select(func.count()).select_from(Account))
    character_count_result = await session.execute(select(func.count()).select_from(Character))
    active_task_count_result = await session.execute(
        select(func.count()).select_from(Task).where(Task.status == TaskStatus.active)
    )
    praxis_count_result = await session.execute(select(func.count()).select_from(Praxis))
    vote_count_result = await session.execute(select(func.count()).select_from(Vote))
    flagged_count_result = await session.execute(
        select(func.count()).select_from(Praxis).where(
            Praxis.moderation_status == ModerationStatus.flagged.value
        )
    )
    suspended_count_result = await session.execute(
        select(func.count()).select_from(Account).where(
            Account.status == AccountStatus.suspended
        )
    )

    return OverviewStats(
        accounts=account_count_result.scalar_one(),
        characters=character_count_result.scalar_one(),
        active_tasks=active_task_count_result.scalar_one(),
        praxis=praxis_count_result.scalar_one(),
        votes=vote_count_result.scalar_one(),
        flagged_praxis=flagged_count_result.scalar_one(),
        suspended_accounts=suspended_count_result.scalar_one(),
    )


# ---------------------------------------------------------------------------
# Seed / Insert
# ---------------------------------------------------------------------------


async def create_faction(data: FactionCreate, session: AsyncSession) -> Faction:
    existing = await session.get(Faction, data.slug)
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Faction with slug '{data.slug}' already exists.")

    faction = Faction(
        slug=data.slug,
        name=data.name,
        description=data.description,
        status=FactionStatus.hidden if data.hidden else FactionStatus.visible,
    )
    session.add(faction)
    await session.commit()
    await session.refresh(faction)
    return faction


async def admin_create_character(
    data: AdminCharacterCreate,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Character:
    """Create a character on any account, bypassing the level-3 gate."""
    account = await session.get(Account, data.account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    # Verify username is unique
    existing = await session.execute(
        select(Character).where(Character.username == data.username)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"Username '{data.username}' is already taken.")

    era_row = await get_current_era_row(session)

    character = Character(
        account_id=data.account_id,
        username=data.username,
        display_name=data.display_name,
        bio=data.bio,
        avatar_url=data.avatar_url,
        location=data.location,
        faction_slug=data.faction_slug,
    )
    session.add(character)
    await session.flush()

    await get_or_create_stats(
        session,
        character_id=character.id,
        era_id=era_row.id,
    )

    await session.commit()
    await session.refresh(character)
    return character


# ---------------------------------------------------------------------------
# Adjust Game State
# ---------------------------------------------------------------------------


async def set_character_stats(
    character_id: int,
    patch: CharacterStatsPatch,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CharacterStats:
    era_row = await get_current_era_row(session)

    stats = await get_or_create_stats(
        session,
        character_id=character_id,
        era_id=era_row.id,
    )

    if patch.level is not None:
        stats.level = patch.level
    if patch.score is not None:
        stats.score = patch.score
    if patch.all_time_score is not None:
        stats.all_time_score = patch.all_time_score
    if patch.votes_available is not None:
        # Translate a desired `votes_available` into `votes_spent_this_era`
        # so the on-read formula lands on the requested value.
        # votes_spent = cap - desired (clamped at 0).
        score_for_cap = patch.score if patch.score is not None else stats.score
        cap = era.vote_budget_base + int(era.vote_budget_multiplier * score_for_cap)
        stats.votes_spent_this_era = max(0, cap - patch.votes_available)

    await session.commit()
    await session.refresh(stats)
    return stats


async def reactivate_task(task_id: int, session: AsyncSession) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status != TaskStatus.retired:
        raise HTTPException(status_code=422, detail="Only retired tasks can be reactivated.")
    task.status = TaskStatus.active
    await session.commit()
    await session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Role & Account Management
# ---------------------------------------------------------------------------


async def assign_or_revoke_role(
    account_id: int,
    role_name: str,
    action: str,
    admin_account_id: int,
    session: AsyncSession,
) -> None:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    role_result = await session.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalar_one_or_none()

    if action == "grant":
        if role is None:
            role = Role(name=role_name, description="")
            session.add(role)
            await session.flush()

        existing_result = await session.execute(
            select(AccountRole).where(
                AccountRole.account_id == account_id,
                AccountRole.role_id == role.id,
            )
        )
        if existing_result.scalar_one_or_none() is not None:
            return  # Already has the role — idempotent

        account_role = AccountRole(
            account_id=account_id,
            role_id=role.id,
            granted_by=admin_account_id,
        )
        session.add(account_role)
        await session.commit()

    elif action == "revoke":
        if role is None:
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' does not exist.")

        existing_result = await session.execute(
            select(AccountRole).where(
                AccountRole.account_id == account_id,
                AccountRole.role_id == role.id,
            )
        )
        account_role = existing_result.scalar_one_or_none()
        if account_role is None:
            return  # Doesn't have the role — idempotent

        await session.delete(account_role)
        await session.commit()


async def suspend_account(
    account_id: int,
    suspended: bool,
    session: AsyncSession,
) -> Account:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    account.status = AccountStatus.suspended if suspended else AccountStatus.active
    await session.commit()
    await session.refresh(account)
    return account


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------


async def moderate_praxis(
    praxis_id: int,
    new_status: ModerationStatus,
    admin_note: str | None,
    session: AsyncSession,
) -> Praxis:
    """Set the moderation status of a praxis. Admin can override any state."""
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")

    praxis.moderation_status = new_status.value

    if new_status == ModerationStatus.failed:
        praxis.admin_note = admin_note or ""
    elif new_status == ModerationStatus.visible:
        praxis.admin_note = None

    await session.commit()
    await session.refresh(praxis)
    return praxis


async def archive_message(
    message_id: int,
    session: AsyncSession,
) -> ContactMessage:
    """Toggle is_archived on a contact message."""
    message = await session.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.is_archived = not message.is_archived
    await session.commit()
    await session.refresh(message)
    return message


async def update_task_status(
    task_id: int,
    new_status: TaskStatus,
    session: AsyncSession,
) -> Task:
    """Unified task status change with transition validation."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    VALID_TRANSITIONS = {
        TaskStatus.pending: {TaskStatus.active, TaskStatus.retired},
        TaskStatus.active: {TaskStatus.retired},
        TaskStatus.retired: {TaskStatus.active},
    }

    allowed = VALID_TRANSITIONS.get(task.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from {task.status.value} to {new_status.value}.",
        )

    task.status = new_status
    await session.commit()
    await session.refresh(task)
    return task


async def admin_edit_task(
    task_id: int,
    data: AdminTaskPatch,
    session: AsyncSession,
) -> Task:
    """Edit editable fields on a pending or retired task. Active tasks are locked."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status == TaskStatus.active:
        raise HTTPException(
            status_code=400,
            detail="Active tasks cannot be edited. Retire the task first.",
        )
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.point_value is not None:
        task.point_value = data.point_value
    if data.level_required is not None:
        task.level_required = data.level_required
    await session.commit()
    await session.refresh(task)
    return task
