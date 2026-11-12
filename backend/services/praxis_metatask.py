"""Applying and removing metatasks on a praxis (R.9): the gates and the link.

Scoring lives in ``services.meta_task`` / ``praxis_scoring``. Imports
``services.praxis``; never the reverse.
"""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from services.character_stats import recalculate_members_stats
from services.era import get_current_era_row, get_or_create_stats
from services.era_gates import may_apply_metatask
from services.faction_service import faction_permits
from services.meta_task import faction_bypasses_metatask_level, metatask_cap_for_level
from services.praxis import get_praxis, get_praxis_settling_consensus


def _check_metatask_eligibility(
    character: Character,
    task: Task,
    character_level: int,
    era: EraConfig,
) -> Optional[str]:
    """Return a 403 reason string if this character can't apply ``task``, else None."""
    # Same predicate as ``/auth/me``'s ``can_apply_metatask`` (#2868).
    # ``is_admin=False``: this op has no admin bypass (#1973).
    if not may_apply_metatask(
        character_level, character.faction_slug, False, era
    ):
        return (
            f"Must be level {era.metatask_apply_level} or above "
            "to apply metatasks."
        )
    # Bypass factions skip the faction match too. ``faction_permits`` currently
    # permits all (metatasks are faction-open); kept so a future rule applies.
    if faction_bypasses_metatask_level(character.faction_slug, era):
        return None
    if not faction_permits(character, task, era):
        return "This metatask belongs to a different faction."
    return None


async def apply_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Attach a metatask to a praxis (R.9).

    Gates: member, ``in_progress``, level (or faction bypass), per-level cap.
    """
    # Plain read, no settle (#2874): only ``in_progress`` is accepted, which has
    # no pending-publish window.
    praxis = await get_praxis(praxis_id, session)
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status == TaskStatus.deleted:
        raise_coded(404, ErrorCode.task_not_found, "Task not found.")
    if task.task_type != TaskType.metatask:
        raise HTTPException(
            status_code=400,
            detail="Only tasks with task_type='metatask' can be applied as metatasks.",
        )

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can apply metatasks.",
        )

    if praxis.status != PraxisStatus.in_progress:
        raise HTTPException(
            status_code=422,
            detail="Metatasks can only be applied to in-progress praxis.",
        )

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)

    eligibility_error = _check_metatask_eligibility(character, task, stats.level, era)
    if eligibility_error is not None:
        raise HTTPException(status_code=403, detail=eligibility_error)

    existing = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This metatask is already applied to the praxis.",
        )

    cap = metatask_cap_for_level(stats.level, era)
    current_count = await session.scalar(
        select(func.count())
        .select_from(PraxisMetaTask)
        .where(PraxisMetaTask.praxis_id == praxis_id)
    )
    if current_count >= cap:
        raise HTTPException(
            status_code=422,
            detail=(
                f"This praxis already holds the maximum of {cap} "
                f"metatask{'s' if cap != 1 else ''} at your level."
            ),
        )

    session.add(PraxisMetaTask(praxis_id=praxis_id, task_id=task_id))
    await session.flush()

    await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)


async def remove_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Remove a metatask from a praxis. Any praxis member can remove."""
    # Settles, unlike apply: no status guard, so it can hit a lapsed collab window
    # and the rescore must price the published praxis.
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can remove metatasks.",
        )

    result = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Metatask is not applied to this praxis.")

    await session.delete(link)
    await session.flush()

    await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)
