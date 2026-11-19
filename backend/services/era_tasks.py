from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import EraConfig
from models.task import Task, TaskStatus


async def sync_era_tasks(
    session: AsyncSession,
    era: EraConfig,
    created_by_id: int,
    *,
    reactivate: bool = False,
) -> tuple[int, int]:
    """Make the board carry ``era.tasks``, keyed on title. Returns (created, back).

    ``reactivate`` is for the era roll only: the deploy seeder must not undo an
    admin's retirement. Only ``retired`` rows come back; a deleted task stays deleted.
    """
    existing = {
        task.title: task for task in (await session.execute(select(Task))).scalars()
    }
    created = reactivated = 0
    for task_def in era.tasks:
        task = existing.get(task_def.title)
        if task is None:
            session.add(Task(
                title=task_def.title,
                description=task_def.description,
                point_value=task_def.point_value,
                level_required=task_def.level_required,
                status=TaskStatus.active,
                created_by_id=created_by_id,
                primary_faction_slug=task_def.faction_slug,
            ))
            created += 1
        elif reactivate and task.status == TaskStatus.retired:
            task.status = TaskStatus.active
            reactivated += 1
    await session.flush()
    return created, reactivated
