"""Backdoor tasks (#3848): a hidden task whose door a mod opens and closes on a schedule.

Time windows are judged when data is read; there is no scheduler. The Python and
SQL forms of "door open" must stay in parity (test_backdoor_parity).
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.task import Task, TaskStatus


def _now(now: Optional[datetime]) -> datetime:
    return now or datetime.now(timezone.utc)


def reads_the_array(faction_slug: Optional[str], era: EraConfig = CURRENT_ERA) -> bool:
    faction = era.factions.get(faction_slug) if faction_slug else None
    return faction is not None and faction.reads_the_array


def reader_slugs(era: EraConfig = CURRENT_ERA) -> list[str]:
    return [slug for slug, f in era.factions.items() if f.reads_the_array]


def door_open(task: Task, now: Optional[datetime] = None) -> bool:
    now = _now(now)
    return (
        task.status == TaskStatus.backdoor
        and task.backdoor_opens_at is not None
        and task.backdoor_opens_at <= now
        and (task.backdoor_closes_at is None or now < task.backdoor_closes_at)
    )


def door_open_clause(now: Optional[datetime] = None):
    now = _now(now)
    return and_(
        Task.status == TaskStatus.backdoor,
        Task.backdoor_opens_at <= now,
        or_(Task.backdoor_closes_at.is_(None), Task.backdoor_closes_at > now),
    )


def may_use_door(
    task: Task, faction_slug: Optional[str], era: EraConfig = CURRENT_ERA,
    now: Optional[datetime] = None,
) -> bool:
    return door_open(task, now) and reads_the_array(faction_slug, era)


async def settle_closed_backdoors(
    session: AsyncSession, now: Optional[datetime] = None
) -> None:
    """Retire every backdoor whose close date has passed; one idempotent UPDATE."""
    await session.execute(
        update(Task)
        .where(Task.status == TaskStatus.backdoor, Task.backdoor_closes_at <= _now(now))
        .values(status=TaskStatus.retired, backdoor_opens_at=None, backdoor_closes_at=None)
    )


async def list_open_backdoors(
    session: AsyncSession,
    faction_slug: Optional[str],
    era: EraConfig = CURRENT_ERA,
    now: Optional[datetime] = None,
) -> list[Task]:
    """Open doors for a reader of the array; ``[]`` for anyone else (never 403)."""
    await settle_closed_backdoors(session, now)
    if not reads_the_array(faction_slug, era):
        return []
    result = await session.scalars(
        select(Task).where(door_open_clause(now)).order_by(Task.backdoor_opens_at, Task.id)
    )
    return list(result.all())
