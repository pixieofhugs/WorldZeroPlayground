"""Applying and removing metatasks on a praxis (R.9).

A metatask is a ``Task`` row with ``task_type == TaskType.metatask``; pinning one
to a praxis creates a ``PraxisMetaTask`` link and re-scores every member. The
gates that gate the pin live here; the *scoring* consequence of a pinned metatask
lives in ``services.meta_task`` / ``services.praxis_scoring``, and the read side
(the seal stack) in ``services.praxis_out.applied_metatasks_for``.

Split out of ``services/praxis.py`` (#1391) — a pure move, no behaviour change.
Unlike the read model this module cannot be a leaf: both ops load and re-read the
aggregate through ``services.praxis.get_praxis``. So the edge runs
``praxis_metatask`` → ``praxis`` and never back, and ``routers/praxes.py`` imports
the two ops from here directly rather than through a re-export.
"""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis, PraxisStatus
from models.task import Task, TaskType
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
    # A faction may grant the level bypass (Albescent's charter in both eras);
    # everyone else must meet metatask_apply_level. Both halves are one call
    # (#2868) — :func:`services.era_gates.may_apply_metatask`, the same
    # predicate behind the ``can_apply_metatask`` flag on ``/auth/me``, which
    # reads the perk off `era` rather than branching on a slug (#1871). It takes
    # ``is_admin=False`` because this op has no admin escape hatch: True there
    # would offer an admin a control this function answers 403 to (#1973).
    if not may_apply_metatask(
        character_level, character.faction_slug, False, era
    ):
        return (
            f"Must be level {era.metatask_apply_level} or above "
            "to apply metatasks."
        )
    # The bypass factions skip the faction match as well as the level. Metatasks
    # are faction-open, so the seam `faction_permits` (ADR-0029, #171) currently
    # permits every faction — the call is retained so a future faction rule is
    # inherited here automatically.
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
    """Attach a metatask (Task with task_type=metatask) to a praxis.

    Gates (R.9):
    - The task must be ``TaskType.metatask`` (else 400).
    - The applying character must be a member of the praxis (else 403).
    - The praxis must be ``in_progress`` (else 422).
    - Level gate: at least ``era.metatask_apply_level``, unless the character's
      faction carries ``can_apply_metatask_at_any_level``. Metatasks are
      faction-open — any faction may apply any faction's metatask.
    - Quantity cap: at most ``metatask_cap_for_level(level, era)`` metatasks on
      one praxis (else 422).
    """
    # A plain read (#2874): the 422 below admits ``in_progress`` only, which is
    # precisely the state in which no pending-publish window exists — so the
    # settle is a no-op on every praxis this path accepts, and every praxis it
    # rejects is rejected either way.
    praxis = await get_praxis(praxis_id, session)
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
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

    # Reject duplicate links up front — a metatask can only be applied once
    # to the same praxis.
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

    # Quantity cap: how many metatasks this praxis may hold rises with the
    # applying character's level (metatasks_per_praxis_max_level).
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
    # Settles, unlike :func:`apply_metatask`: removal carries no status guard, so
    # it *can* run on a collab whose window has lapsed, and it recalculates every
    # member's score — which must be priced against the published praxis.
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
