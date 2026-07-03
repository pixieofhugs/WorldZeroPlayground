from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import (
    account_has_admin_role,
    get_current_character,
    get_current_character_optional,
)
from models.account import Account
from models.character import Character
from models.task import Task
from schemas.task import TaskCreate, TaskOut
from services.auth import get_current_account
from services.task import (
    build_task_out,
    build_task_out_for_viewer,
    list_signups_for_task,
    list_tasks as service_list_tasks,
    propose_task,
    update_task,
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
    created_by: Optional[int] = None,
    task_type: Optional[str] = None,
    sort: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    tasks = await service_list_tasks(
        session,
        status=status,
        level=level,
        faction=faction,
        min_points=min_points,
        max_points=max_points,
        exclude_character_id=exclude_character_id,
        created_by=created_by,
        task_type=task_type,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return [
        await build_task_out_for_viewer(task, viewer, session) for task in tasks
    ]


def _build_signup_dict(member, character, praxis) -> dict:
    return {
        "character_id": character.id,
        "display_name": character.display_name,
        "avatar_url": character.avatar_url,
        "faction_slug": character.faction_slug,
        "praxis_type": praxis.type.value,
        "joined_at": member.joined_at,
    }


@router.get("/{task_id}/signups", response_model=list[dict])
async def list_task_signups(
    task_id: int,
    session: AsyncSession = Depends(get_db),
):
    """List characters currently working on a task via praxis membership."""
    rows = await list_signups_for_task(task_id, session)
    return [_build_signup_dict(*row) for row in rows]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: int,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return await build_task_out_for_viewer(task, viewer, session)


@router.post("", response_model=TaskOut, status_code=201)
async def propose_task_route(
    data: TaskCreate,
    character: Character = Depends(get_current_character),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    is_admin = await account_has_admin_role(account.id, session)
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
    return build_task_out(await update_task(task, data, character, session))
