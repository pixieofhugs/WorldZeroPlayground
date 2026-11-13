from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import (
    account_has_admin_role,
    get_current_account_optional,
    get_current_character,
    get_current_character_optional,
    get_viewer_is_admin,
)
from models.account import Account
from models.character import Character
from schemas.task import TaskCreate, TaskOut, TaskSignupOut
from services.auth import get_current_account
from services.signup_eligibility import gather_signup_facts
from services.task import (
    UNKNOWN_TASK_AUTHOR,
    authors_for_tasks,
    build_task_out,
    build_task_out_for_viewer,
    build_task_signup_out,
    get_task_for_viewer,
    in_progress_counts_for_tasks,
    list_signups_for_task,
    list_tasks as service_list_tasks,
    propose_task,
    TaskSort,
)

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: Optional[str] = None,
    can_sign_up: bool = False,
    # Repeated ``?faction=`` is a union (#1364).
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
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Optional[Character] = Depends(get_current_character_optional),
    account: Optional[Account] = Depends(get_current_account_optional),
    is_admin: bool = Depends(get_viewer_is_admin),
):
    # Unknown sort → 422, not a silent fallback (#1443); absent = level-ascending.
    task_sort: Optional[TaskSort] = None
    if sort is not None:
        try:
            task_sort = TaskSort(sort)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid task sort: {sort}")

    # Don't default `exclude_character_id` to the viewer here (#2264): a route
    # default hits every caller. The service arms it as sign-up gate 5 when
    # `can_sign_up` is on and nobody was named.
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
        viewer_account=account,
        skip_level_check=is_admin,
        is_admin=is_admin,
    )
    # Page-wide batches below (#1021, #1029, #1377): never per-task queries.
    in_progress_counts = await in_progress_counts_for_tasks(
        [task.id for task in tasks], session
    )
    authors = await authors_for_tasks(tasks, session)
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
            # Not None: None makes the builder query the author per task.
            author=authors.get(task.created_by, UNKNOWN_TASK_AUTHOR),
            signup_facts=signup_facts,
        )
        for task in tasks
    ]


@router.get("/{task_id}/signups", response_model=list[TaskSignupOut])
async def list_task_signups(
    task_id: int,
    session: AsyncSession = Depends(get_db, scope="function"),
) -> list[TaskSignupOut]:
    """List characters currently working on a task via praxis membership."""
    rows = await list_signups_for_task(task_id, session)
    return [build_task_signup_out(*row) for row in rows]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: int,
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Optional[Character] = Depends(get_current_character_optional),
    account: Optional[Account] = Depends(get_current_account_optional),
    is_admin: bool = Depends(get_viewer_is_admin),
):
    # No docstring: it would be published in the public openapi.json.
    # A withheld pending proposal 404s like an absent id (#1725): ids are
    # sequential, so a 403 would make the review queue enumerable.
    task = await get_task_for_viewer(session, task_id, viewer, is_admin=is_admin)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return await build_task_out_for_viewer(task, viewer, session)


@router.post("", response_model=TaskOut, status_code=201)
async def propose_task_route(
    data: TaskCreate,
    character: Character = Depends(get_current_character),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    is_admin = await account_has_admin_role(account.id, session)
    task = await propose_task(character, data, session, skip_level_check=is_admin)
    return await build_task_out(task, session)
