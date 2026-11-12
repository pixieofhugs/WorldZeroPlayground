"""#2280: do not announce a metatask to a character who cannot see metatasks.

Seam: ``_global_tasks_query``, the source behind ``global_task`` rows. Owner
ruling: the gate is LEVEL; faction is no factor (ADR-0029), so no faction
predicate here, ever.

The gate is SEE (``level_to_see_metatasks``), not APPLY. Equal in Era 1, so only
the Albescent case tells them apart. Both call sites read
:func:`services.meta_task.character_sees_metatasks`.

ADR-0036: ``_count_sources`` wraps the same Select, so badges drop with the row.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.faction import Faction, FactionStatus
from models.task import Task, TaskStatus, TaskType
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest_asyncio.fixture
async def factions_wow_and_albescent(db_session: AsyncSession) -> None:
    for slug in ("wow", "albescent"):
        result = await db_session.execute(
            sa_select(Faction).where(Faction.slug == slug)
        )
        if result.scalar_one_or_none() is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.commit()


async def _set_level(
    db_session: AsyncSession, character_id: int, era_id: int, level: int
) -> None:
    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await db_session.commit()


@pytest_asyncio.fixture
async def board(
    db_session: AsyncSession,
    character: Character,
    factions_wow_and_albescent: None,
) -> dict[str, Task]:
    """Both newer than the reader (clear #2225 ``character_born``); the standard
    task is the control that must survive every gate.
    """
    standard = Task(
        title="Sweep the yard",
        description="a standard task",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        task_type=TaskType.standard,
    )
    meta = Task(
        title="Do it in verse",
        description="a metatask",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="wow",
        task_type=TaskType.metatask,
        metatask_faction_slug="wow",
    )
    db_session.add_all([standard, meta])
    await db_session.commit()
    await db_session.refresh(standard)
    await db_session.refresh(meta)
    return {"standard": standard, "meta": meta}


async def _global_feed(client: AsyncClient, auth_headers: dict) -> dict:
    response = await client.get(
        "/activity-feed",
        params={"filter": "global", "limit": 100},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def _task_ids(body: dict) -> set[int]:
    return {
        item["payload"]["task_id"]
        for item in body["items"]
        if item["type"] == "global_task"
    }


@pytest.mark.asyncio
async def test_a_metatask_is_not_announced_below_the_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
    board: dict[str, Task],
):
    await _set_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks - 1
    )

    ids = _task_ids(await _global_feed(client, auth_headers))
    assert board["standard"].id in ids, "the standard task is still news"
    assert board["meta"].id not in ids, (
        "a character who cannot open the metatask list was told a metatask exists"
    )


@pytest.mark.asyncio
async def test_the_badge_number_drops_with_the_metatask_row(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
    board: dict[str, Task],
):
    await _set_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks - 1
    )

    body = await _global_feed(client, auth_headers)
    assert body["counts"]["by_type"].get("global_task") == 1, (
        "the bell still counted the metatask it refused to draw"
    )


@pytest.mark.asyncio
async def test_a_metatask_is_announced_at_the_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
    board: dict[str, Task],
):
    """At the gate the card appears; the authoring faction (``wow``) is irrelevant."""
    await _set_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks
    )

    body = await _global_feed(client, auth_headers)
    ids = _task_ids(body)
    assert board["standard"].id in ids
    assert board["meta"].id in ids, (
        "a metatask authored by another faction is still news at the see gate"
    )
    assert body["counts"]["by_type"].get("global_task") == 2


@pytest.mark.asyncio
async def test_the_albescent_perk_does_not_open_the_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
    board: dict[str, Task],
):
    """``can_apply_metatask_at_any_level`` lifts APPLY, never SEE: a call site using
    the apply rule would announce this to an Albescent novice.
    """
    assert CURRENT_ERA.factions["albescent"].can_apply_metatask_at_any_level, (
        "fixture premise: Albescent is the faction carrying the apply bypass"
    )
    character.faction_slug = "albescent"
    db_session.add(character)
    await db_session.commit()
    await _set_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks - 1
    )

    ids = _task_ids(await _global_feed(client, auth_headers))
    assert board["standard"].id in ids
    assert board["meta"].id not in ids, (
        "the apply bypass was read as a see bypass"
    )
