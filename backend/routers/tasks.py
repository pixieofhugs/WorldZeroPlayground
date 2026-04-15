from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.task import CharacterTask, CharacterTaskStatus, Task, TaskStatus
from schemas.task import CharacterTaskOut, TaskCreate, TaskOut, TaskSignupOut
from services.task import build_task_out, drop_task, list_tasks as service_list_tasks, propose_task, signup_for_task

router = APIRouter()


def _build_character_task_out(ct: CharacterTask) -> CharacterTaskOut:
    task = ct.task
    return CharacterTaskOut(
        id=ct.id,
        task=TaskOut(
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
        ),
        status=ct.status.value,
        signed_up_at=ct.signed_up_at,
    )


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: Optional[str] = None,
    level: Optional[int] = None,
    faction: Optional[str] = None,
    min_points: Optional[int] = None,
    max_points: Optional[int] = None,
    exclude_character_id: Optional[int] = None,
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
        limit=limit,
        offset=offset,
    )
    return [build_task_out(task) for task in tasks]


@router.get("/my-tasks", response_model=list[CharacterTaskOut])
async def list_my_tasks(
    status: Optional[str] = None,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """List the authenticated character's task signups, optionally filtered by status."""
    query = select(CharacterTask).where(CharacterTask.character_id == character.id)
    if status:
        try:
            query = query.where(CharacterTask.status == CharacterTaskStatus[status])
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    else:
        query = query.where(CharacterTask.status == CharacterTaskStatus.in_progress)
    query = query.order_by(CharacterTask.signed_up_at.desc())
    result = await session.execute(query)
    character_tasks = result.scalars().all()
    return [_build_character_task_out(ct) for ct in character_tasks]


@router.get("/{task_id}/signups", response_model=list[TaskSignupOut])
async def list_task_signups(
    task_id: int,
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    result = await session.execute(
        select(CharacterTask)
        .where(
            CharacterTask.task_id == task_id,
            CharacterTask.status.in_([CharacterTaskStatus.in_progress, CharacterTaskStatus.submitted]),
        )
        .order_by(CharacterTask.signed_up_at.asc())
    )
    character_tasks = result.scalars().all()
    return [
        TaskSignupOut(
            character_id=ct.character.id,
            display_name=ct.character.display_name,
            avatar_url=ct.character.avatar_url,
            faction_slug=ct.character.faction_slug,
            status=ct.status.value,
            signed_up_at=ct.signed_up_at,
        )
        for ct in character_tasks
    ]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, session: AsyncSession = Depends(get_db)):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
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


@router.post("", response_model=TaskOut, status_code=201)
async def propose_task_route(
    data: TaskCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    task = await propose_task(character, data, session)
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


@router.post("/{task_id}/signup", response_model=CharacterTaskOut, status_code=201)
async def signup_for_task_route(
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status != TaskStatus.active:
        raise HTTPException(status_code=422, detail="Can only sign up for active tasks.")
    # Block signup for tasks belonging to hidden factions
    if task.primary_faction_slug:
        faction = await session.get(Faction, task.primary_faction_slug)
        if faction and faction.status != FactionStatus.visible:
            raise HTTPException(status_code=422, detail="Cannot sign up for tasks from a hidden faction.")
    ct = await signup_for_task(character, task, session)
    return await _build_character_task_out(ct, session)


@router.delete("/{task_id}/signup", status_code=204)
async def drop_task_route(
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == task_id,
            CharacterTask.status == CharacterTaskStatus.in_progress,
        )
    )
    ct = result.scalar_one_or_none()
    if ct is None:
        raise HTTPException(status_code=404, detail="Signup not found.")
    await drop_task(ct, session)


@router.post("/{task_id}/drop", status_code=204)
async def drop_task_post_route(
    task_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Drop an in-progress task to free a slot.

    Alias for DELETE /{task_id}/signup, available as POST for the invite-accept
    task-list-full flow where DELETE semantics are inconvenient for clients.
    """
    result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == task_id,
            CharacterTask.status == CharacterTaskStatus.in_progress,
        )
    )
    ct = result.scalar_one_or_none()
    if ct is None:
        raise HTTPException(status_code=404, detail="Signup not found.")
    await drop_task(ct, session)
