"""Shared metatask scoring helper.

A metatask is a Task row with ``task_type == TaskType.metatask``. Its
``point_value`` is the flat bonus added to any praxis it has been applied to
(subject to the viewing character's level meeting the metatask's
``level_required``). This helper centralises the lookup so scoring code in
``services.praxis`` and ``services.character_stats`` stays in sync.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import EraConfig
from models.meta_task import PraxisMetaTask
from models.task import Task, TaskType


def metatask_cap_for_level(character_level: int, era: EraConfig) -> int:
    """Max metatasks one praxis may hold, keyed off the applying character's level.

    Below ``era.metatasks_per_praxis_max_level`` the cap is
    ``metatasks_per_praxis_base``; at or above it, ``metatasks_per_praxis_max``.
    Level-based only — no faction bypass (Albescent's apply-gate bypass does not
    lift the quantity cap).
    """
    if character_level >= era.metatasks_per_praxis_max_level:
        return era.metatasks_per_praxis_max
    return era.metatasks_per_praxis_base


async def get_meta_task_points(
    praxis_id: int, character_level: int, session: AsyncSession
) -> int:
    """Return flat bonus points from metatask tasks attached to a praxis.

    A metatask is a Task row with ``task_type == TaskType.metatask``. Its flat
    bonus is ``task.point_value``. Applied only when the viewing character
    meets the metatask's own ``level_required``. Sums across every attached
    metatask; standard tasks should never be linked here (service guards
    prevent that) but are defensively skipped if encountered.
    """
    result = await session.execute(
        select(Task)
        .join(PraxisMetaTask, PraxisMetaTask.task_id == Task.id)
        .where(PraxisMetaTask.praxis_id == praxis_id)
    )
    total = 0
    for task in result.scalars().all():
        if task.task_type != TaskType.metatask:
            continue
        if character_level < task.level_required:
            continue
        total += int(task.point_value)
    return total


async def get_meta_task_points_bulk(
    praxis_ids: list[int], character_level: int, session: AsyncSession
) -> dict[int, int]:
    """Bulk version of ``get_meta_task_points`` — one query for many praxes.

    Returns ``{praxis_id: total_points}`` with zero entries for praxes whose
    attached tasks don't qualify. Praxes with no attached metatasks are
    omitted from the result (callers should treat a missing key as 0).
    """
    if not praxis_ids:
        return {}

    result = await session.execute(
        select(PraxisMetaTask.praxis_id, Task)
        .join(Task, Task.id == PraxisMetaTask.task_id)
        .where(PraxisMetaTask.praxis_id.in_(praxis_ids))
    )
    totals: dict[int, int] = {}
    for praxis_id, task in result.all():
        if task.task_type != TaskType.metatask:
            continue
        if character_level < task.level_required:
            continue
        totals[praxis_id] = totals.get(praxis_id, 0) + int(task.point_value)
    return totals
