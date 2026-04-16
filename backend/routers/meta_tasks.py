from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.account import Account
from models.character import Character
from models.meta_task import BonusType, MetaTask
from models.roles import AccountRole, Role
from models.task import Task
from schemas.meta_task import MetaTaskCreate, MetaTaskOut
from services.auth import get_current_account

GENERIC_FACTION_SLUG = "na"

router = APIRouter()


@router.get("", response_model=list[MetaTaskOut])
async def list_meta_tasks(
    task_id: Optional[int] = None,
    session: AsyncSession = Depends(get_db),
) -> list[MetaTaskOut]:
    """List meta tasks.

    If task_id is provided, returns meta tasks applicable to that task (matching
    faction or generic). If omitted, returns all meta tasks ordered by level_required.
    """
    if task_id is not None:
        task = await session.get(Task, task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found.")
        result = await session.execute(
            select(MetaTask).where(
                or_(
                    MetaTask.faction_slug == task.primary_faction_slug,
                    MetaTask.faction_slug == GENERIC_FACTION_SLUG,
                )
            ).order_by(MetaTask.level_required.asc())
        )
    else:
        result = await session.execute(
            select(MetaTask).order_by(MetaTask.level_required.asc())
        )
    return [MetaTaskOut.model_validate(meta_task) for meta_task in result.scalars().all()]


@router.post("", response_model=MetaTaskOut, status_code=201)
async def create_meta_task(
    data: MetaTaskCreate,
    character: Character = Depends(get_current_character),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
) -> MetaTaskOut:
    """Create a meta task. Requires level 5+ or admin."""
    admin_result = await session.execute(
        select(AccountRole)
        .join(Role, AccountRole.role_id == Role.id)
        .where(AccountRole.account_id == account.id, Role.name == "admin")
    )
    is_admin = admin_result.scalar_one_or_none() is not None

    if not is_admin and character.level < 5:
        raise HTTPException(
            status_code=403,
            detail="Creating meta tasks requires level 5 or higher.",
        )

    if data.faction_slug == GENERIC_FACTION_SLUG:
        raise HTTPException(
            status_code=422,
            detail="Meta tasks must belong to a specific faction, not 'na'.",
        )

    meta_task = MetaTask(
        name=data.name,
        description=data.description,
        faction_slug=data.faction_slug,
        bonus_type=BonusType.flat,
        bonus_value=float(data.bonus_value),
        level_required=data.level_required,
    )
    session.add(meta_task)
    await session.commit()
    await session.refresh(meta_task)
    return MetaTaskOut.model_validate(meta_task)
