from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate, TaskOut
from services.era import get_current_era_row, get_or_create_stats
from services.praxis import (
    active_member_task_ids_subquery,
    allowed_praxis_modes,
    can_submit_praxis_for_task,
    is_task_eligible_for_character,
)


async def propose_task(
    character: Character,
    data: TaskCreate,
    session: AsyncSession,
    skip_level_check: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> Task:
    """Propose a new task. Returns the pending Task.

    ``task_type`` on the incoming payload selects the gate:
    - ``standard`` (default): ``era.level_to_propose_task`` unless ``skip_level_check`` (admin).
    - ``metatask``: ``era.level_to_propose_metatask`` unless ``skip_level_check`` (admin).
      Additionally requires ``metatask_faction_slug`` to be set.
    """
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character.id, era_row.id)

    task_type = TaskType.standard
    if data.task_type:
        try:
            task_type = TaskType(data.task_type)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid task_type: {data.task_type}",
            )

    if task_type == TaskType.metatask:
        if not skip_level_check and stats.level < era.level_to_propose_metatask:
            raise HTTPException(
                status_code=403,
                detail=f"Must be level {era.level_to_propose_metatask} or above to propose metatasks.",
            )
        if not data.metatask_faction_slug:
            raise HTTPException(
                status_code=422,
                detail="metatask_faction_slug is required for metatask proposals.",
            )
    else:
        if not skip_level_check and stats.level < era.level_to_propose_task:
            raise HTTPException(
                status_code=403,
                detail=f"Must be level {era.level_to_propose_task} or above to propose tasks.",
            )

    task = Task(
        title=data.title,
        description=data.description or "",
        point_value=data.point_value,
        level_required=data.level_required,
        primary_faction_slug=data.primary_faction_slug or "na",
        metatask_faction_slug=(
            data.metatask_faction_slug if task_type == TaskType.metatask else None
        ),
        task_type=task_type,
        created_by=character.id,
        status=TaskStatus.pending,
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task


async def update_task(
    task: Task,
    data: TaskCreate,
    character: Character,
    session: AsyncSession,
) -> Task:
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
    if task.task_type == TaskType.metatask and data.metatask_faction_slug is not None:
        task.metatask_faction_slug = data.metatask_faction_slug
    await session.flush()
    await session.refresh(task)
    return task


def build_task_out(task: Task) -> TaskOut:
    """Convert a Task ORM instance to a TaskOut schema.

    This builder does not compute any viewer-relative fields; flags such as
    ``can_submit_praxis``, ``allowed_modes``, and ``eligible_for_current_user``
    are left at their safe defaults. Use :func:`build_task_out_for_viewer`
    from a route that has an authenticated viewer available.
    """
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status,
        task_type=task.task_type,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        metatask_faction_slug=task.metatask_faction_slug,
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
    )


async def build_task_out_for_viewer(
    task: Task,
    viewer: Optional[Character],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> TaskOut:
    """Build a :class:`TaskOut` with viewer-relative capability flags.

    Populates ``can_submit_praxis``, ``allowed_modes``, and
    ``eligible_for_current_user`` using the authenticated viewer's character
    (``None`` for anonymous callers). All three flags default to the same
    safe values as :func:`build_task_out` when ``viewer`` is ``None``.
    """
    base = build_task_out(task)

    if viewer is None:
        return base

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)

    base.can_submit_praxis = await can_submit_praxis_for_task(viewer, task, session, era)
    base.allowed_modes = [m.value for m in allowed_praxis_modes(viewer, stats.level, era)]
    base.eligible_for_current_user = is_task_eligible_for_character(
        viewer, task, stats.level
    )
    return base


async def list_signups_for_task(
    task_id: int,
    session: AsyncSession,
) -> list[tuple[PraxisMember, Character, Praxis]]:
    """List in-progress praxis members for a task (characters currently working on it).

    Raises 404 if the task does not exist.
    """
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
        )
        .order_by(PraxisMember.joined_at.asc())
    )
    return list(result.all())


#: ``sort`` value that orders the task list by creation time, newest first.
SORT_NEWEST = "newest"


async def list_tasks(
    session: AsyncSession,
    *,
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
) -> list[Task]:
    """Query tasks with optional filters, excluding hidden-faction tasks.

    If ``task_type`` is None or 'all', both standard and metatask rows are
    returned. Pass 'standard' or 'metatask' to filter.

    ``sort='newest'`` orders by creation time (newest first); the default
    ordering surfaces the easiest, highest-value tasks first.
    """
    # Collect hidden faction slugs to exclude their tasks
    hidden_result = await session.execute(
        select(Faction.slug).where(Faction.status != FactionStatus.visible)
    )
    hidden_slugs = [row[0] for row in hidden_result.all()]

    query = select(Task)

    if created_by is not None:
        query = query.where(Task.created_by == created_by)

    if status and status != "all":
        try:
            query = query.where(Task.status == TaskStatus[status])
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    elif not status:
        if created_by is not None:
            # Proposer's profile: show approved tasks (active + retired); pending
            # rows are admin-review submissions and stay hidden from all viewers.
            query = query.where(Task.status != TaskStatus.pending)
        else:
            query = query.where(Task.status == TaskStatus.active)
    # status == "all" -> no status filter, return tasks of every status

    # Task type filter — default (None) and "all" both return every task type.
    # Pass task_type="standard" or task_type="metatask" to filter.
    if task_type is not None and task_type != "all":
        try:
            query = query.where(Task.task_type == TaskType(task_type))
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Invalid task_type: {task_type}"
            )

    if level is not None:
        query = query.where(Task.level_required >= level)
    if faction:
        query = query.where(Task.primary_faction_slug == faction)
    if min_points is not None:
        query = query.where(Task.point_value >= min_points)
    if max_points is not None:
        query = query.where(Task.point_value <= max_points)

    # Exclude tasks from hidden/deprecated factions
    if hidden_slugs:
        query = query.where(Task.primary_faction_slug.notin_(hidden_slugs))

    # Exclude tasks the character has already started or completed (via praxis membership)
    if exclude_character_id is not None:
        query = query.where(Task.id.notin_(active_member_task_ids_subquery(exclude_character_id)))

    if sort == SORT_NEWEST:
        query = query.order_by(Task.created_at.desc(), Task.id.desc())
    else:
        query = query.order_by(Task.level_required.asc(), Task.point_value.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())
