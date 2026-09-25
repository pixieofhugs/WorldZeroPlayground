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
    """A minimal era stand-in — ``sync_era_tasks`` reads only ``era.tasks``."""
    return SimpleNamespace(tasks=tuple(tasks))


@pytest.mark.asyncio
async def test_task_sync_propagates_new_era_task_on_seeded_db(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
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
    some_faction: Faction,
):
    """The game-wide L0 onboarding task is seeded on every run, idempotently (#511)."""
    # The onboarding task is cross-faction (#1619 B5), so its FK target is the
    # ``na`` row the ``some_faction`` fixture already seeds.
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
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(onboarding_rows) == 1
    assert onboarding_rows[0].title == ONBOARDING_TASK_TITLE
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
    assert level_zero_standard[0].seed_key == ONBOARDING_TASK_SEED_KEY

    # Idempotent: a second run with unchanged constants makes no changes.
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
    """Renaming/re-wording the onboarding task is a seed edit, never a migration.

    Acceptance criterion 1 (#3064): seed, then change the title and description
    constants, then seed again. The result is one onboarding row, carrying the
    new wording, with the SAME id — this is the property ``0004`` and ``0019``
    each needed a hand-written data migration to get, because the old lookup
    stopped finding the row the moment its title changed.
    """
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

    # ``ensure_onboarding_task`` reads the module-level constants by name at
    # call time, so the monkeypatch above is visible to it even though this
    # test imported the function itself before patching.
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
async def test_second_row_with_the_onboarding_seed_key_is_rejected_by_the_database(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """Acceptance criterion 3 (#3064): the uniqueness is a DB constraint.

    Nothing in application code has to notice a second seed-owned row — the
    insert itself fails, which is what makes a second onboarding task actually
    impossible rather than merely unlikely.
    """
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
    """A duplicate title must not stop the service from booting (#3064).

    Before ``seed_key`` this was the onboarding task's only identity, and
    nothing made titles unique — `propose_task` inserts whatever it is
    handed, and the lookup had no status filter, so a *pending* proposal
    counted. "Introduce Yourself" is the likeliest title anyone will ever
    propose in a game about doing things in the real world, and a duplicate
    used to raise `MultipleResultsFound` there. `start.sh` runs `seed.py`
    under `set -e` BEFORE `exec uvicorn`, so that exception did not degrade
    the site — it stopped the site from starting.

    Now the lookup is keyed on ``seed_key``, which a player-authored task
    never carries, so a title collision cannot reach it at all — this test
    pins that the scenario is inert rather than merely survivable.
    """
    assert await ensure_onboarding_task(db_session, character.id) is True

    # A player proposes a task that happens to carry the same title.
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

    # The next deploy must not raise, and must not touch the seeded row.
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


# ---------------------------------------------------------------------------
# The duel e2e fixture task (#1676)
# ---------------------------------------------------------------------------
# `frontend/e2e/duel.helpers.ts::pickDuelTask` asks the API for a faction-skinned
# task at level <= era.duel_level_required and fails the whole duel suite when
# there is none — which was the case on every nightly, because Era 1 declares no
# tasks (#1398) and the onboarding task above is cross-faction. These pin the
# properties that helper selects on, so the fixture and the duel gate cannot
# drift apart silently.
#
# Neither side names a faction any more (#2710). While both did, an era that
# dropped that faction took the fixture out through the `faction is None` guard
# and the e2e failure three files away named the missing task, not the era.


@pytest.mark.asyncio
async def test_duel_fixture_slug_is_a_real_faction_of_the_live_era():
    """The slug is era-read, so it cannot name a faction the era never seeds.

    This is the property that makes the no-op guard a backstop rather than the
    thing deciding whether the duel suite has a task at all (#2710).
    """
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
    """It lands as a faction task the duel gate's level can sign up for, and repeats.

    ``some_faction`` is requested because Era 1's first real faction is UA and the
    fixture task needs that row present; the assertions below name no slug.
    """
    created = await ensure_duel_fixture_task(db_session, character.id)
    assert created is True

    rows = (
        await db_session.execute(
            select(Task).where(Task.seed_key == DUEL_FIXTURE_TASK_SEED_KEY)
        )
    ).scalars().all()
    assert len(rows) == 1
    task = rows[0]
    # The two properties pickUaDuelTask filters on.
    assert task.primary_faction_slug == duel_fixture_task_faction_slug()
    assert task.level_required <= CURRENT_ERA.duel_level_required
    # ...and the two that make it pickable at all.
    assert task.status == TaskStatus.active
    assert task.task_type == TaskType.standard

    # Idempotent: seed.py runs this on every dev seed.
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
    """No matching faction row → no task, rather than a Task with a dangling FK.

    A future era need not carry UA, and the seeder must degrade to a no-op. The
    slug is repointed rather than the `ua` row deleted, because `character`
    itself holds an FK to that row — so "the faction is absent" is only
    expressible from the seeder's side.
    """
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
