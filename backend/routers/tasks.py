from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import (
    account_has_admin_role,
    get_current_account_optional,
    get_current_character,
    get_current_character_optional,
)
from models.account import Account
from models.character import Character
from models.task import Task
from schemas.task import TaskCreate, TaskOut, TaskSignupOut
from services.auth import get_current_account
from services.task import (
    UNKNOWN_TASK_AUTHOR,
    authors_for_tasks,
    build_task_out,
    build_task_out_for_viewer,
    build_task_signup_out,
    in_progress_counts_for_tasks,
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
    q: Optional[str] = None,
    sort: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
    account: Optional[Account] = Depends(get_current_account_optional),
):
    is_admin = account is not None and await account_has_admin_role(
        account.id, session
    )
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
        q=q,
        sort=sort,
        limit=limit,
        offset=offset,
        viewer=viewer,
        skip_level_check=is_admin,
    )
    # One grouped query for the whole page (#1021) — never a per-task count.
    in_progress_counts = await in_progress_counts_for_tasks(
        [task.id for task in tasks], session
    )
    # One join for the whole page (#1029) — never a per-task author lookup.
    authors = await authors_for_tasks(tasks, session)
    return [
        await build_task_out_for_viewer(
            task,
            viewer,
            session,
            in_progress_count=in_progress_counts.get(task.id, 0),
            # Explicit fallback rather than None: passing None would make the
            # builder resolve that one author itself, i.e. reintroduce the very
            # per-task query this precompute exists to avoid.
            author=authors.get(task.created_by, UNKNOWN_TASK_AUTHOR),
        )
        for task in tasks
    ]


@router.get("/{task_id}/signups", response_model=list[TaskSignupOut])
async def list_task_signups(
    task_id: int,
    session: AsyncSession = Depends(get_db),
) -> list[TaskSignupOut]:
    """List characters currently working on a task via praxis membership.

    ``response_model`` is the real schema, not ``list[dict]`` (#1051): the rows
    are now validated and the shape appears in the OpenAPI document, so the schema
    can no longer drift away from the route unnoticed.
    """
    rows = await list_signups_for_task(task_id, session)
    return [build_task_signup_out(*row) for row in rows]


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
    return await build_task_out(task, session)


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
    return await build_task_out(await update_task(task, data, character, session), session)
