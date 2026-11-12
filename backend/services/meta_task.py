"""Metatask rules. A metatask is a ``TaskType.metatask`` Task whose
``point_value`` is a flat bonus on praxes it's applied to.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.meta_task import PraxisMetaTask
from models.task import Task, TaskType


def faction_bypasses_metatask_level(
    faction_slug: Optional[str],
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """May this faction apply a metatask below ``era.metatask_apply_level``? (#1871)

    False for unknown slugs, like ``faction_level_jump_reach``.
    """
    if faction_slug is None:
        return False
    faction_config = era.factions.get(faction_slug)
    if faction_config is None:
        return False
    return faction_config.can_apply_metatask_at_any_level


def character_sees_metatasks(
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Does the metatask list open for a character at this level? (#453, #2280)

    The SEE rule, used by ``list_tasks`` and the activity feed. **No faction
    bypass**: Albescent's perk lifts only the APPLY gate. Callers handle
    anonymous viewers themselves.
    """
    return character_level >= era.level_to_see_metatasks


def metatask_cap_for_level(character_level: int, era: EraConfig) -> int:
    """Max metatasks one praxis may hold, by the applier's level. No faction bypass."""
    if character_level >= era.metatasks_per_praxis_max_level:
        return era.metatasks_per_praxis_max
    return era.metatasks_per_praxis_base


async def get_meta_task_points_bulk(
    praxis_ids: list[int], character_level: int, session: AsyncSession
) -> dict[int, int]:
    """``{praxis_id: flat bonus}`` from attached metatasks, in one query.

    Counts only metatasks whose ``level_required`` the viewer meets. Missing
    key = 0.
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
