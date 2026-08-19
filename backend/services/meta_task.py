"""Shared metatask scoring helper.

A metatask is a Task row with ``task_type == TaskType.metatask``. Its
``point_value`` is the flat bonus added to any praxis it has been applied to
(subject to the viewing character's level meeting the metatask's
``level_required``). This helper centralises the lookup so scoring code in
``services.praxis`` and ``services.character_stats`` stays in sync.
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
    """May this faction apply a metatask below ``era.metatask_apply_level``?

    The one statement of the rule, and the only thing
    ``services.praxis_metatask`` asks. Until #1871 this was a literal
    ``if character.faction_slug == ALBESCENT_FACTION_SLUG`` inside that module —
    a faction ability no era could re-tune and no era file mentioned, which meant
    Era 2 inherited it without saying so. It is a ``FactionConfig`` field now,
    read the way ``level_jump_reach`` and ``habit_bonus_points`` are read.

    False for anonymous/unaffiliated characters and for any slug the era does not
    define, matching :func:`services.level_jump.faction_level_jump_reach`: a
    character carrying a slug from a previous era gets no ability rather than an
    error.
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
    """Does the metatask list open for a character at this level? (#453)

    The one statement of the SEE rule, and deliberately separate from the APPLY
    rule above. Until #2280 it was an inline comparison inside
    ``services.task.list_tasks`` and nowhere else, which was fine while exactly
    one surface asked. The activity feed is the second (a metatask is a ``Task``
    row, so it rode the ``global_task`` source into the bell of characters for
    whom the list does not open), and two copies of a threshold is how the two
    drift.

    **No faction bypass, and that is the point.**
    ``can_apply_metatask_at_any_level`` — Albescent's own perk — lifts
    ``era.metatask_apply_level`` and nothing else, so a novice Albescent may
    apply a metatask but still cannot browse the list. Anyone reaching for
    "can this character have metatasks put in front of them?" wants THIS
    predicate; :func:`faction_bypasses_metatask_level` answers a different
    question and answers it True far more often.

    Anonymous callers have no level and are always below the gate; callers hold
    that case themselves rather than passing a sentinel level in.
    """
    return character_level >= era.level_to_see_metatasks


def metatask_cap_for_level(character_level: int, era: EraConfig) -> int:
    """Max metatasks one praxis may hold, keyed off the applying character's level.

    Below ``era.metatasks_per_praxis_max_level`` the cap is
    ``metatasks_per_praxis_base``; at or above it, ``metatasks_per_praxis_max``.
    Level-based only — no faction bypass: ``can_apply_metatask_at_any_level``
    lifts the *apply* gate, never the quantity cap.
    """
    if character_level >= era.metatasks_per_praxis_max_level:
        return era.metatasks_per_praxis_max
    return era.metatasks_per_praxis_base


async def get_meta_task_points_bulk(
    praxis_ids: list[int], character_level: int, session: AsyncSession
) -> dict[int, int]:
    """Flat bonus points from the metatasks attached to each praxis — one query.

    A metatask's flat bonus is ``task.point_value``, applied only when the
    viewing character meets the metatask's own ``level_required``. Standard
    tasks should never be linked here (service guards prevent that) but are
    defensively skipped if encountered.

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
