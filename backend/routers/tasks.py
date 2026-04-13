from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.character import Character
from models.faction import Faction, FactionStatus
from models.task import CharacterTask, CharacterTaskStatus, Task, TaskStatus
from schemas.task import CharacterTaskOut, TaskCreate, TaskOut
from services.task import drop_task, propose_task, signup_for_task

router = APIRouter()


async def _build_character_task_out(ct: CharacterTask, session: AsyncSession) -> CharacterTaskOut:
    task = await session.get(Task, ct.task_id)
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
    # Collect hidden faction slugs to exclude their tasks
    hidden_result = await session.execute(
        select(Faction.slug).where(Faction.status != FactionStatus.visible)
    )
    hidden_slugs = [row[0] for row in hidden_result.all()]

    query = select(Task)
    if status:
        try:
            query = query.where(Task.status == TaskStatus[status])
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    else:
        query = query.where(Task.status == TaskStatus.active)
    if level is not None:
        query = query.where(Task.level_required <= level)
    if faction:
        query = query.where(Task.primary_faction_slug == faction)
    if min_points is not None:
        query = query.where(Task.point_value >= min_points)
    if max_points is not None:
        query = query.where(Task.point_value <= max_points)

    # Exclude tasks from hidden/deprecated factions
    if hidden_slugs:
        query = query.where(Task.primary_faction_slug.notin_(hidden_slugs))

    # Exclude tasks the character has already signed up for or completed
    if exclude_character_id is not None:
        active_task_ids = select(CharacterTask.task_id).where(
            CharacterTask.character_id == exclude_character_id,
            CharacterTask.status.in_([CharacterTaskStatus.in_progress, CharacterTaskStatus.submitted]),
        )
        query = query.where(Task.id.notin_(active_task_ids))

    query = query.order_by(Task.level_required.asc(), Task.point_value.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    tasks = result.scalars().all()
    return [
        TaskOut(
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
        for task in tasks
    ]


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
    return [await _build_character_task_out(ct, session) for ct in character_tasks]


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
