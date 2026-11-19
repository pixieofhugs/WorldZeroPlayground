from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import EraConfig
from models.task import Task, TaskStatus


async def tasks_to_reactivate(session: AsyncSession, era: EraConfig) -> list[Task]:
    """The tasks ``era.reactivate_tasks`` names, one per title.

    Refuses (409) a title matching none or several, so a typo cannot quietly
    reopen the wrong task. ``Task.title`` is not unique; deleted rows do not count.
    """
    found: list[Task] = []
    for title in era.reactivate_tasks:
        rows = (
            await session.execute(
                select(Task).where(
                    Task.title == title, Task.status != TaskStatus.deleted
                )
            )
        ).scalars().all()
        if len(rows) != 1:
            raise_coded(
                409,
                ErrorCode.era_reactivate_ambiguous,
                f"Reactivation title {title!r} matches {len(rows)} tasks, not 1.",
            )
        found.append(rows[0])
    return found


async def sync_era_tasks(
    session: AsyncSession, era: EraConfig, created_by_id: int
) -> int:
    """Create the ``era.tasks`` missing from the board, keyed on title. Returns
    rows added. Never touches existing rows: the deploy seeder must not undo an
    admin's retirement."""
    existing_titles = set((await session.execute(select(Task.title))).scalars())
    added = 0
    for task_def in era.tasks:
        if task_def.title in existing_titles:
            continue
        session.add(Task(
            title=task_def.title,
            description=task_def.description,
            point_value=task_def.point_value,
            level_required=task_def.level_required,
            status=TaskStatus.active,
            created_by_id=created_by_id,
            primary_faction_slug=task_def.faction_slug,
        ))
        added += 1
    await session.flush()
    return added
