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
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate, TaskOut
from services.auth import get_current_account
from services.era import get_current_era_row, get_or_create_stats
from services.task import (
    build_task_out,
    build_task_out_for_viewer,
    list_signups_for_task,
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
        task_type=task_type,
        limit=limit,
        offset=offset,
    )
    # Fetch viewer-scoped rows ONCE per request and pass them through to
    # build_task_out_for_viewer for each task. Without this, every task in
    # the list would re-fetch the same era row and the same character stats
    # row, producing an N+1 (2 redundant queries per task).
    era_row = None
    viewer_stats = None
    if viewer is not None:
        era_row = await get_current_era_row(session)
        viewer_stats = await get_or_create_stats(session, viewer.id, era_row.id)
    return [
        await build_task_out_for_viewer(
            task,
            viewer,
            session,
            era_row=era_row,
            character_stats=viewer_stats,
        )
        for task in tasks
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
    await session.flush()
    await session.refresh(task)
    return build_task_out(task)
