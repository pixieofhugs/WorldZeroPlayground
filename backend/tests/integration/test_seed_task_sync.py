"""The seeder propagates era-config additions to an already-seeded DB (#905).

`backend/seed.py` used to `return` early on any DB that already had the Pixie
account plus at least one task, skipping the later phases — so a task added to
the era config after the first seed never reached the database (Phase 3 was
unreachable, and even when reached it was all-or-nothing on an empty table,
never a per-task sync).

These tests exercise the now-idempotent phase helpers directly against a
populated database — the exact path the seeded-DB case now runs — and assert
that a newly-added config task lands, and does not duplicate on re-run.

The sync is fed a purpose-built era stand-in rather than ``CURRENT_ERA``: Era 1
declares no tasks at all (#1398, so that a deploy cannot resurrect a task an
admin deleted), and this is a test of the *mechanism*, which the next era will
still need. The same PR removed the Phase-4 placeholder metatask and its two
tests here; ``praxis_meta_task`` is empty until an admin authors a real one.
"""
from types import SimpleNamespace

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import CROSS_FACTION_SLUG
from game_config import TaskDef
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.task import Task, TaskType
from seed import (
    ONBOARDING_TASK_TITLE,
    ensure_onboarding_task,
    sync_era_tasks,
)


def _standard_task(title: str, faction_slug: str = "ua") -> TaskDef:
    return TaskDef(
        title=title,
        description="fixture task",
        faction_slug=faction_slug,
        level_required=0,
        point_value=10,
    )


def _era_with_tasks(*tasks: TaskDef) -> SimpleNamespace:
    """A minimal era stand-in — ``sync_era_tasks`` reads only ``era.tasks``."""
    return SimpleNamespace(tasks=tuple(tasks))


@pytest.mark.asyncio
async def test_task_sync_propagates_new_era_task_on_seeded_db(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    """A task added to the era config after the first seed reaches a seeded DB."""
    # First seed: the config has a single task.
    added = await sync_era_tasks(
        db_session, _era_with_tasks(_standard_task("Alpha Task")), character.id
    )
    assert added == 1

    # A new task is added to the era config; re-run the (now idempotent) sync.
    v2 = _era_with_tasks(_standard_task("Alpha Task"), _standard_task("Beta Task"))
    added_on_reseed = await sync_era_tasks(db_session, v2, character.id)

    # Only the genuinely-new task is inserted — this is the deployment gap the
    # old all-or-nothing `if task_count == 0` guard left open.
    assert added_on_reseed == 1

    titles = set((await db_session.execute(select(Task.title))).scalars().all())
    assert "Beta Task" in titles

    # And the pre-existing task is not duplicated.
    alpha_rows = (
        await db_session.execute(select(Task).where(Task.title == "Alpha Task"))
    ).scalars().all()
    assert len(alpha_rows) == 1


@pytest.mark.asyncio
async def test_onboarding_task_seeded_once_and_is_the_only_level_zero_task(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    """The game-wide L0 onboarding task is seeded on every run, idempotently (#511)."""
    # The onboarding task is cross-faction (#1619 B5), so its FK target is the
    # ``na`` row the ``faction_ua`` fixture already seeds.
    # Simulate a populated DB with era content (none of it level 0 anymore).
    await sync_era_tasks(
        db_session, _era_with_tasks(_standard_task("Alpha Task")), character.id
    )
    # _standard_task defaults to level_required=0; overwrite that task's level so
    # the onboarding task is genuinely the only L0 row for the assertion below.
    alpha = (
        await db_session.execute(select(Task).where(Task.title == "Alpha Task"))
    ).scalar_one()
    alpha.level_required = 1
    await db_session.flush()

    created = await ensure_onboarding_task(db_session, character.id)
    assert created is True

    onboarding_rows = (
        await db_session.execute(
            select(Task).where(Task.title == ONBOARDING_TASK_TITLE)
        )
    ).scalars().all()
    assert len(onboarding_rows) == 1
    assert onboarding_rows[0].level_required == 0
    assert onboarding_rows[0].primary_faction_slug == CROSS_FACTION_SLUG
    assert onboarding_rows[0].task_type == TaskType.standard

    # It is the only standard level-0 task in the database.
    level_zero_standard = (
        await db_session.execute(
            select(Task).where(
                Task.level_required == 0, Task.task_type == TaskType.standard
            )
        )
    ).scalars().all()
    assert len(level_zero_standard) == 1
    assert level_zero_standard[0].title == ONBOARDING_TASK_TITLE

    # Idempotent: a second run creates nothing.
    created_again = await ensure_onboarding_task(db_session, character.id)
    assert created_again is False
    onboarding_rows = (
        await db_session.execute(
            select(Task).where(Task.title == ONBOARDING_TASK_TITLE)
        )
    ).scalars().all()
    assert len(onboarding_rows) == 1


@pytest.mark.asyncio
async def test_seed_creates_no_metatask(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    """A seed run authors no metatask at all (#1398).

    The replacement for the two ``ensure_placeholder_metatask`` tests this
    supersedes. The placeholder ("Upside Down") was invented content that
    reappeared on production every deploy the metatask count hit zero, so it
    could never be permanently deleted. An empty metatask surface until an admin
    authors a real one is the intended state, and this pins it.
    """
    from models.faction import FactionStatus

    if (
        await db_session.execute(select(Faction).where(Faction.slug == "albescent"))
    ).scalar_one_or_none() is None:
        db_session.add(Faction(slug="albescent", status=FactionStatus.visible))
        await db_session.flush()

    await sync_era_tasks(
        db_session, _era_with_tasks(_standard_task("Alpha Task")), character.id
    )
    await ensure_onboarding_task(db_session, character.id)

    metatasks = (
        await db_session.execute(
            select(Task).where(Task.task_type == TaskType.metatask)
        )
    ).scalars().all()
    assert metatasks == []
