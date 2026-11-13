"""A faction the live era drops is retired, not hidden (#2706, ADR-0087).

1. Writer: ``seed.upsert_era_factions`` is a two-way mirror: add, retire, never delete.
2. Reader: ``hidden_faction_slugs`` must answer ``hidden`` only. Retirement leaves
   the registry, not the record, so the task archive survives.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.task import Task, TaskStatus
from seed import HIDDEN_FACTION_SLUGS, upsert_era_factions
from services.faction_service import hidden_faction_slugs
from tests.integration.factories import rejoin_gate_open

#: No era lists it: what a dropped faction looks like to the seeder.
DROPPED_SLUG = "retired_test_faction"


def _era_listed_slug() -> str:
    """ADR-0087: never name a faction."""
    return next(
        slug for slug in CURRENT_ERA.factions if slug not in HIDDEN_FACTION_SLUGS
    )


async def _add_faction(
    session: AsyncSession, slug: str, status: FactionStatus
) -> None:
    session.add(Faction(slug=slug, status=status))
    await session.commit()


async def _faction_count(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(Faction))
    return result.scalar_one()


@pytest.mark.asyncio
async def test_seed_retires_a_slug_the_live_era_does_not_list(
    db_session: AsyncSession,
):
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.visible)

    await upsert_era_factions(db_session, CURRENT_ERA)

    row = await db_session.get(Faction, DROPPED_SLUG)
    assert row is not None
    assert row.status is FactionStatus.retired


@pytest.mark.asyncio
async def test_seed_never_deletes_a_row(
    db_session: AsyncSession,
    character: Character,
):
    """Rows are FK targets for history."""
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.visible)
    before = await _faction_count(db_session)

    await upsert_era_factions(db_session, CURRENT_ERA)

    assert await _faction_count(db_session) >= before
    assert await db_session.get(Faction, DROPPED_SLUG) is not None
    assert await db_session.get(Faction, character.faction_slug) is not None


@pytest.mark.asyncio
async def test_seed_leaves_a_system_row_hidden(db_session: AsyncSession):
    """Hidden outranks the mirror: retiring would un-hide its tasks."""
    system_slug = next(iter(HIDDEN_FACTION_SLUGS - set(CURRENT_ERA.factions)))
    await _add_faction(db_session, system_slug, FactionStatus.hidden)

    await upsert_era_factions(db_session, CURRENT_ERA)

    row = await db_session.get(Faction, system_slug)
    assert row is not None
    assert row.status is FactionStatus.hidden


@pytest.mark.asyncio
async def test_seed_unretires_a_slug_a_later_era_lists_again(
    db_session: AsyncSession,
):
    slug = _era_listed_slug()
    await _add_faction(db_session, slug, FactionStatus.retired)

    await upsert_era_factions(db_session, CURRENT_ERA)

    row = await db_session.get(Faction, slug)
    assert row is not None
    assert row.status is FactionStatus.visible


@pytest.mark.asyncio
async def test_retired_faction_is_absent_from_the_registry(
    client: AsyncClient,
    db_session: AsyncSession,
    some_faction: Faction,
):
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)

    resp = await client.get("/factions")

    assert resp.status_code == 200
    assert DROPPED_SLUG not in [f["slug"] for f in resp.json()]


@pytest.mark.asyncio
async def test_retired_faction_is_unjoinable(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)

    assert not await rejoin_gate_open(
        character.id, DROPPED_SLUG, era.id, db_session
    )


@pytest.mark.asyncio
async def test_hidden_faction_slugs_answers_hidden_only(db_session: AsyncSession):
    """``status != visible`` would drop a closed era's task history from listings."""
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)
    await _add_faction(db_session, "hidden_test_faction", FactionStatus.hidden)

    slugs = await hidden_faction_slugs(db_session)

    assert DROPPED_SLUG not in slugs
    assert "hidden_test_faction" in slugs


@pytest.mark.asyncio
async def test_retired_factions_tasks_stay_listable(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)
    task = Task(
        title="Task from a closed era",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DROPPED_SLUG,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.get("/tasks")

    assert resp.status_code == 200
    assert task.id in [t["id"] for t in resp.json()]


@pytest.mark.asyncio
async def test_retired_factions_tasks_stay_in_the_archive(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    auth_headers: dict,
):
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)
    task = Task(
        title="Archived task from a closed era",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug=DROPPED_SLUG,
    )
    db_session.add(task)
    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.level = CURRENT_ERA.level_to_see_retired_tasks
    await db_session.commit()

    resp = await client.get("/tasks?status=retired", headers=auth_headers)

    assert resp.status_code == 200
    assert task.id in [t["id"] for t in resp.json()]
