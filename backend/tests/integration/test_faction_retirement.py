"""A faction the live era drops is retired, not hidden (#2706, ADR-0087).

Two seams, and the tests below sit on both:

1. **The writer** — ``seed.upsert_era_factions``. It used to only ever *add*,
   so a slug the live era stopped listing kept its ``visible`` row and stayed in
   the registry while ``can_join_faction``, which reads the era config, refused
   it. It is now a two-way mirror: add what the era lists, retire what it does
   not, delete nothing.
2. **The reader** — ``services.faction_service.hidden_faction_slugs``, whose one
   caller (``services.task.list_tasks``) drops those factions' tasks from every
   listing. It must keep answering ``hidden`` *only*. That is the entire reason
   ``retired`` is a third value rather than a reuse of ``hidden``: retirement
   takes a faction out of the **registry**, not out of the **record**, so Era 1's
   task archive survives the rollover.

These tests never fabricate an era. A row the *live* era does not list is the
production scenario verbatim, so a synthetic slug exercises the mirror under
Era 1 (which drops nothing) and under every era after it.
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
from services.faction_service import can_join_faction, hidden_faction_slugs

#: A slug no era config lists — i.e. exactly what a dropped faction looks like
#: to the seeder the deploy after its era ends.
DROPPED_SLUG = "retired_test_faction"


def _era_listed_slug() -> str:
    """Some ordinary roster slug of the live era.

    ADR-0087: a test may not name a faction to get one. All this needs is a slug
    the era lists and does not flag as a system row.
    """
    return next(
        slug for slug in CURRENT_ERA.factions if slug not in HIDDEN_FACTION_SLUGS
    )


async def _add_faction(session: AsyncSession, slug: str, status: FactionStatus) -> Faction:
    row = Faction(slug=slug, status=status)
    session.add(row)
    await session.commit()
    return row


# ---------------------------------------------------------------------------
# The writer: seed.upsert_era_factions is a two-way mirror
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_retires_a_slug_the_live_era_does_not_list(
    db_session: AsyncSession,
):
    """The mirror's whole point: drop it from the config, the row goes retired."""
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
    """Rows are FK targets — ``character.faction_slug`` points at history.

    A deleting mirror would take the closed era's characters and tasks with it,
    so the count may only ever grow.
    """
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.visible)
    before = (await db_session.execute(select(func.count()).select_from(Faction))).scalar_one()

    await upsert_era_factions(db_session, CURRENT_ERA)

    after = (await db_session.execute(select(func.count()).select_from(Faction))).scalar_one()
    assert after >= before
    assert await db_session.get(Faction, DROPPED_SLUG) is not None
    assert await db_session.get(Faction, character.faction_slug) is not None


@pytest.mark.asyncio
async def test_seed_leaves_a_system_row_hidden(db_session: AsyncSession):
    """``na`` / ``aged_out`` are system rows: hidden outranks the mirror.

    Retiring one would un-hide its tasks — ``hidden_faction_slugs`` is what keeps
    them out of every listing — which is the opposite of what retirement means.
    """
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
    """The mirror is two-way, so a returning faction gets its tile back."""
    slug = _era_listed_slug()
    await _add_faction(db_session, slug, FactionStatus.retired)

    await upsert_era_factions(db_session, CURRENT_ERA)

    row = await db_session.get(Faction, slug)
    assert row is not None
    assert row.status is FactionStatus.visible


# ---------------------------------------------------------------------------
# The registry: out of GET /factions, out of the join options
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_retired_faction_is_absent_from_the_registry(
    client: AsyncClient,
    db_session: AsyncSession,
    faction_ua: Faction,
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
    """``can_join_faction`` reads the era config, and the era no longer lists it."""
    await _add_faction(db_session, DROPPED_SLUG, FactionStatus.retired)

    assert not await can_join_faction(
        character.id, DROPPED_SLUG, era.id, db_session
    )


# ---------------------------------------------------------------------------
# The record: the task archive survives retirement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_hidden_faction_slugs_answers_hidden_only(db_session: AsyncSession):
    """The reader must not widen to the third value.

    Written as ``status != visible``, this would sweep every retired faction into
    the listing filter and take most of a closed era's task history off the site.
    """
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
    """An active task authored by a retired faction is still on the board."""
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
    """The archive ``level_to_see_retired_tasks`` unlocks still holds them.

    Retiring through ``hidden`` instead would have emptied it while the praxes
    written against those tasks stayed visible, linking to tasks in no listing.
    """
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
