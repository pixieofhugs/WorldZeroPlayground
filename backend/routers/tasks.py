from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate, TaskOut
from services.auth import get_current_account
from services.task import (
    build_task_out,
    list_tasks as service_list_tasks,
    propose_task,
)

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: Optional[str] = None,
    level: Optional[int] = None,
    faction: Optional[str] = None,
    min_points: Optional[int] = None,
    max_points: Optional[int] = None,
    exclude_character_id: Optional[int] = None,
    task_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
):
    tasks = await service_list_tasks(
        session,
        status=status,
        level=level,
        faction=faction,
        min_points=min_points,
        max_points=max_points,
        exclude_character_id=exclude_character_id,
        task_type=task_type,
        limit=limit,
        offset=offset,
    )
    return [build_task_out(task) for task in tasks]


@router.get("/{task_id}/signups", response_model=list[dict])
async def list_task_signups(
    task_id: int,
    session: AsyncSession = Depends(get_db),
):
    """List characters currently working on a task via praxis membership."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    result = await session.execute(
        select(PraxisMember, Character, Praxis)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .join(Character, PraxisMember.character_id == Character.id)
        .where(
            Praxis.task_id == task_id,
            Praxis.status == PraxisStatus.in_progress,
            Praxis.is_withdrawn == False,  # noqa: E712
        )
        .order_by(PraxisMember.joined_at.asc())
    )
    rows = result.all()
    return [
        {
            "character_id": character.id,
            "display_name": character.display_name,
            "avatar_url": character.avatar_url,
            "faction_slug": character.faction_slug,
            "praxis_type": praxis.type.value,
            "joined_at": member.joined_at,
        }
        for member, character, praxis in rows
    ]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, session: AsyncSession = Depends(get_db)):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return build_task_out(task)


@router.post("", response_model=TaskOut, status_code=201)
async def propose_task_route(
    data: TaskCreate,
    character: Character = Depends(get_current_character),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    admin_result = await session.execute(
        select(AccountRole)
        .join(Role, AccountRole.role_id == Role.id)
        .where(AccountRole.account_id == account.id, Role.name == "admin")
    )
    is_admin = admin_result.scalar_one_or_none() is not None
    task = await propose_task(character, data, session, skip_level_check=is_admin)
    return build_task_out(task)


@router.put("/{task_id}", response_model=TaskOut)
async def update_task_route(
    task_id: int,
    data: TaskCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    # Proposer can edit their own pending tasks only
    if task.created_by != character.id or task.status != TaskStatus.pending:
        raise HTTPException(
            status_code=403,
            detail="Only the proposer can edit a pending task.",
        )
    task.title = data.title
    task.description = data.description or ""
    task.point_value = data.point_value
    task.level_required = data.level_required
    task.primary_faction_slug = data.primary_faction_slug or "na"
    # Only allow editing metatask_faction_slug for metatasks.
    if task.task_type == TaskType.metatask and data.metatask_faction_slug is not None:
        task.metatask_faction_slug = data.metatask_faction_slug
    await session.commit()
    await session.refresh(task)
    return build_task_out(task)
