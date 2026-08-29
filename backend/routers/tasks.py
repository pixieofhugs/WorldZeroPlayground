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
from services.praxis import gather_signup_facts
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
    is_admin: bool = Depends(get_viewer_is_admin),
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

    # `exclude_character_id` is passed through untouched (#2264). The route used
    # to default it to the viewer for #1229's "the browse hides tasks you have
    # already started" — but a route default reaches EVERY caller of GET /tasks,
    # not the browse, and it was applied unconditionally on `can_sign_up`. So a
    # faction page rendered a viewer-relative task COUNT (`Tasks · 0` where the
    # reader held a praxis on every one of that faction's tasks), the browse's
    # own `can_sign_up=0` escape hatch could not undo it, and Home's teaser and
    # random jump could never land on a task you were working. #2126 had already
    # carved out `created_by` by hand; a second carve-out per caller is not a
    # contract, it is a list of the surfaces somebody remembered.
    #
    # #1229's behaviour is not deleted, it is stated where it is true: the
    # exclusion IS gate 5 of the sign-up predicate, so `services.task.list_tasks`
    # arms it from the viewer whenever `can_sign_up` is on and the caller named
    # nobody. The browse asks for that filter by default, so it keeps the exact
    # list it had; every viewer-independent read now gets a viewer-independent
    # answer. #1229's other reason — clients echoing their own character id back
    # made the page fetch twice, once before /auth/me settled and once after — is
    # a client concern, and no client needs to send the id at all.
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
    account: Optional[Account] = Depends(get_current_account_optional),
    is_admin: bool = Depends(get_viewer_is_admin),
):
    # Deliberately no docstring: a route's docstring is published in the public
    # `openapi.json`, and the reasoning below is not something to hand out.
    #
    # #1725 — the same pending gate the browse applies, at the door it was never
    # applied to. A withheld proposal 404s rather than 403s, with the same detail
    # an absent id gets: task ids are sequential, so a 403 would confirm the row
    # exists and make the review window enumerable. `retired` and `active` are
    # unaffected — praxis link back to retired tasks.
    task = await get_task_for_viewer(session, task_id, viewer, is_admin=is_admin)
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
