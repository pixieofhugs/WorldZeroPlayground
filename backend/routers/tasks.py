from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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
from schemas.task import TaskCreate, TaskOut
from services.auth import get_current_account
from services.praxis import gather_signup_facts
from services.task import (
    UNKNOWN_TASK_AUTHOR,
    authors_for_tasks,
    build_task_out,
    build_task_out_for_viewer,
    in_progress_counts_for_tasks,
    list_tasks as service_list_tasks,
    propose_task,
    TaskSort,
)

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: Optional[str] = None,
    can_sign_up: bool = False,
    # Repeated ``?faction=everymen&faction=ua`` is a union (#1364); one value
    # still narrows to one faction, and none at all filters nothing.
    faction: Optional[list[str]] = Query(None),
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
    # An unrecognised sort is an error, not a silent fall-back to the level
    # default (#1443) — matching GET /praxes, which has always raised here.
    # Substituting an ordering nobody asked for returns 200 with plausible
    # data, so a typo'd or retired value never surfaces. An ABSENT sort is
    # still legal and still means level-ascending: Tasks.tsx sends none.
    task_sort: Optional[TaskSort] = None
    if sort is not None:
        try:
            task_sort = TaskSort(sort)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid task sort: {sort}")

    is_admin = account is not None and await account_has_admin_role(
        account.id, session
    )
    # The viewer is the exclusion default (#1229): the browse hides tasks you
    # have already started, and the server already knows who you are. Clients
    # that echoed their own character id back made the page fetch twice — once
    # before /auth/me settled and once after. An explicit value still wins;
    # anonymous callers get None, which excludes nothing.
    if exclude_character_id is None and viewer is not None:
        exclude_character_id = viewer.id
    tasks = await service_list_tasks(
        session,
        status=status,
        can_sign_up=can_sign_up,
        faction=faction,
        min_points=min_points,
        max_points=max_points,
        exclude_character_id=exclude_character_id,
        created_by=created_by,
        task_type=task_type,
        q=q,
        sort=task_sort,
        limit=limit,
        offset=offset,
        viewer=viewer,
        skip_level_check=is_admin,
        is_admin=is_admin,
    )
    # One grouped query for the whole page (#1021) — never a per-task count.
    in_progress_counts = await in_progress_counts_for_tasks(
        [task.id for task in tasks], session
    )
    # One join for the whole page (#1029) — never a per-task author lookup.
    authors = await authors_for_tasks(tasks, session)
    # The viewer's sign-up facts for the whole page (#1377) — era row, stats,
    # bank count and page memberships, four queries once instead of six per row.
    signup_facts = (
        await gather_signup_facts(viewer, [task.id for task in tasks], session)
        if viewer is not None
        else None
    )
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
            signup_facts=signup_facts,
        )
        for task in tasks
    ]


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
