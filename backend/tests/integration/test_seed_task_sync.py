"""The seeder's idempotent phases sync era-config additions into a seeded DB (#905).

A stand-in era, since Era 1 declares no tasks (#1398) and this tests the mechanism.
"""
from types import SimpleNamespace

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    CROSS_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
)
from game_config import CURRENT_ERA, TaskDef
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.task import Task, TaskStatus, TaskType
from seed import (
    DUEL_FIXTURE_TASK_SEED_KEY,
    ONBOARDING_TASK_SEED_KEY,
    ONBOARDING_TASK_TITLE,
    duel_fixture_task_faction_slug,
    ensure_duel_fixture_task,
    ensure_onboarding_task,
    sync_era_tasks,
)
from tests.integration.factories import DEFAULT_FACTION_SLUG


def _standard_task(title: str, faction_slug: str = DEFAULT_FACTION_SLUG) -> TaskDef:
    return TaskDef(
        title=title,
        description="fixture task",
        faction_slug=faction_slug,
        level_required=0,
        point_value=10,
    )


def _era_with_tasks(*tasks: TaskDef) -> SimpleNamespace:
    """``sync_era_tasks`` reads only ``era.tasks``."""
    return SimpleNamespace(tasks=tuple(tasks))


@pytest.mark.asyncio
async def test_task_sync_propagates_new_era_task_on_seeded_db(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    added = await sync_era_tasks(
        db_session, _era_with_tasks(_standard_task("Alpha Task")), character.id
    )
    assert added == 1

    v2 = _era_with_tasks(_standard_task("Alpha Task"), _standard_task("Beta Task"))
    added_on_reseed = await sync_era_tasks(db_session, v2, character.id)

    assert added_on_reseed == 1

    titles = set((await db_session.execute(select(Task.title))).scalars().all())
    assert "Beta Task" in titles

    alpha_rows = (
        await db_session.execute(select(Task).where(Task.title == "Alpha Task"))
    ).scalars().all()
    assert len(alpha_rows) == 1


@pytest.mark.asyncio
async def test_onboarding_task_seeded_once_and_is_the_only_level_zero_task(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """#511."""
    # Cross-faction (#1619 B5): its FK is the ``na`` row ``some_faction`` seeds.
    await sync_era_tasks(
        db_session, _era_with_tasks(_standard_task("Alpha Task")), character.id
    )
    # Lift it off L0 so onboarding is the only L0 row.
    alpha = (
        await db_session.execute(select(Task).where(Task.title == "Alpha Task"))
    ).scalar_one()
    alpha.level_required = 1
    await db_session.flush()

    created = await ensure_onboarding_task(db_session, character.id)
    assert created is True

    onboarding_rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(onboarding_rows) == 1
    assert onboarding_rows[0].title == ONBOARDING_TASK_TITLE
    assert onboarding_rows[0].level_required == 0
    assert onboarding_rows[0].primary_faction_slug == CROSS_FACTION_SLUG
    assert onboarding_rows[0].task_type == TaskType.standard

    level_zero_standard = (
        await db_session.execute(
            select(Task).where(
                Task.level_required == 0, Task.task_type == TaskType.standard
            )
        )
    ).scalars().all()
    assert len(level_zero_standard) == 1
    assert level_zero_standard[0].seed_key == ONBOARDING_TASK_SEED_KEY

    created_again = await ensure_onboarding_task(db_session, character.id)
    assert created_again is False
    onboarding_rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(onboarding_rows) == 1


@pytest.mark.asyncio
async def test_onboarding_seed_resyncs_the_row_on_a_rename(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
    monkeypatch: pytest.MonkeyPatch,
):
    """A rename is a seed edit, never a migration: same id, new words (#3064)."""
    assert await ensure_onboarding_task(db_session, character.id) is True
    original = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalar_one()
    original_id = original.id

    monkeypatch.setattr("seed.ONBOARDING_TASK_TITLE", "Meet Your Character")
    monkeypatch.setattr(
        "seed.ONBOARDING_TASK_DESCRIPTION", "New words for the same task."
    )

    # It reads the module constants at call time.
    changed = await ensure_onboarding_task(db_session, character.id)
    assert changed is True

    rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].id == original_id
    assert rows[0].title == "Meet Your Character"
    assert rows[0].description == "New words for the same task."


@pytest.mark.asyncio
async def test_onboarding_seed_does_not_revive_an_admin_retired_task(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """``status`` is set only on create, never synced on find."""
    assert await ensure_onboarding_task(db_session, character.id) is True
    row = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalar_one()
    row.status = TaskStatus.retired
    await db_session.flush()

    changed = await ensure_onboarding_task(db_session, character.id)
    assert changed is False

    await db_session.refresh(row)
    assert row.status == TaskStatus.retired


@pytest.mark.asyncio
async def test_second_row_with_the_onboarding_seed_key_is_rejected_by_the_database(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """#3064: uniqueness is a DB constraint, not app code."""
    from sqlalchemy.exc import IntegrityError

    assert await ensure_onboarding_task(db_session, character.id) is True

    db_session.add(Task(
        seed_key=ONBOARDING_TASK_SEED_KEY,
        title="A second onboarding row",
        description="should never be allowed to exist",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    ))
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_onboarding_seed_survives_a_player_task_with_the_same_title(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """A title collision must not stop boot (#3064): ``start.sh`` runs ``seed.py``
    under ``set -e`` before uvicorn. The lookup is keyed on ``seed_key``.
    """
    assert await ensure_onboarding_task(db_session, character.id) is True

    db_session.add(Task(
        title=ONBOARDING_TASK_TITLE,
        description="A player-authored task that collides by coincidence.",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    ))
    await db_session.flush()

    assert await ensure_onboarding_task(db_session, character.id) is False

    rows = (
        await db_session.execute(
            select(Task).where(Task.title == ONBOARDING_TASK_TITLE)
        )
    ).scalars().all()
    assert len(rows) == 2

    seed_owned = (
        await db_session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(seed_owned) == 1


@pytest.mark.asyncio
async def test_seed_creates_no_metatask(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """#1398: seeded content could never be permanently deleted."""
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


# The duel e2e fixture task (#1676): pins what
# `frontend/e2e/duel.helpers.ts::pickDuelTask` selects on. Era-read slug (#2710).


@pytest.mark.asyncio
async def test_duel_fixture_slug_is_a_real_faction_of_the_live_era():
    """Keeps the no-op guard a backstop (#2710)."""
    slug = duel_fixture_task_faction_slug()
    assert slug in CURRENT_ERA.factions
    assert slug not in (
        UNAFFILIATED_FACTION_SLUG,
        ALBESCENT_FACTION_SLUG,
    )


@pytest.mark.asyncio
async def test_duel_fixture_task_is_reachable_at_the_duel_level(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """``some_faction`` seeds the faction row the task needs."""
    created = await ensure_duel_fixture_task(db_session, character.id)
    assert created is True

    rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == DUEL_FIXTURE_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(rows) == 1
    task = rows[0]
    assert task.primary_faction_slug == duel_fixture_task_faction_slug()
    assert task.level_required <= CURRENT_ERA.duel_level_required
    assert task.status == TaskStatus.active
    assert task.task_type == TaskType.standard

    assert await ensure_duel_fixture_task(db_session, character.id) is False
    rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == DUEL_FIXTURE_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_duel_fixture_task_skipped_when_the_era_lacks_the_faction(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    monkeypatch: pytest.MonkeyPatch,
):
    """No-op, not a dangling FK. Slug repointed: `character` FKs the real row."""
    monkeypatch.setattr(
        "seed.duel_fixture_task_faction_slug", lambda *_, **__: "no_such_faction"
    )

    created = await ensure_duel_fixture_task(db_session, character.id)
    assert created is False

    rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == DUEL_FIXTURE_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert rows == []
