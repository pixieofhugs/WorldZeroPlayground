"""#2280 — do not announce a metatask to a character who cannot see metatasks.

**The seam under test** is ``GET /activity-feed`` →
``services.activity_feed._global_tasks_query``, the one source behind the
``global_task`` row. A metatask is not its own feed type — it is a ``Task`` row
with ``task_type == TaskType.metatask`` (``models.meta_task``), and that source
selected every active task with no ``task_type`` predicate at all. So a level-1
character, for whom the metatask list does not open, was still told each new
metatask existed and handed a card into a page they cannot read.

Owner ruling (#2280): **the gate is LEVEL, and faction is not a factor.** Since
#2295/#2282 ``task.metatask_faction_slug`` records only who *authored* a
metatask; ADR-0029 removed the gate on who may use one. A Cozy Coven player
being shown a Warriors of Whimsy metatask is correct on that axis, so there is
no faction predicate here and there must not be one.

The gate is **see**, not **apply**. They are separate era fields
(``level_to_see_metatasks`` / ``metatask_apply_level``) and separate
``LevelUnlock`` entries, and they happen to be the same number in Era 1 — so
only the Albescent case below tells them apart. The complaint is about being
*told a thing exists*, and the thing a notification leads to is the metatask
list, which ``services.task.list_tasks`` opens at ``level_to_see_metatasks``.
Gating on *apply* would announce metatasks to an Albescent novice whose faction
lifts the apply bar but not the see bar, i.e. a card into a page still shut.

That is the case ``test_the_albescent_perk_does_not_open_the_see_gate`` pins:
``can_apply_metatask_at_any_level`` is Albescent's own perk (``eras/era_1.py``),
and a hand-rolled level comparison at the call site is exactly what would drift
here. Both call sites read one predicate,
:func:`services.meta_task.character_sees_metatasks`.

The badge assertion is the ADR-0036 half: ``_count_sources`` wraps this same
windowed Select, so a suppressed row has to take its number with it. A feed that
hides the card while the bell still counts it has not fixed anything.
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


@pytest_asyncio.fixture
async def factions_wow_and_albescent(db_session: AsyncSession) -> None:
    """FK rows for the two slugs these tests name: the author and the perk-holder."""
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
    """One standard task and one metatask, both newer than the reader.

    Both clear the #2225 ``character_born`` predicate, so whatever the feed
    withholds it withholds for the metatask reason and not that one. The
    standard task is the control: it must survive every gate below, or the test
    is only proving the source was broken outright.
    """
    standard = Task(
        title="Sweep the yard",
        description="a standard task",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
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
    """One level below ``era.level_to_see_metatasks``: no metatask card."""
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
    """ADR-0036: the count wraps the same Select, so it withholds the row too."""
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
    """At the gate the card appears — and the authoring faction is irrelevant.

    ``character`` stands in ``ua`` while the metatask was authored by ``wow``.
    Since #2295/#2282 that slug says who issued it, not who may use it, so a
    cross-faction metatask is correct news (ADR-0029).
    """
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
    """``can_apply_metatask_at_any_level`` lifts APPLY, never SEE.

    The one case that tells the two era fields apart while they are both 5, and
    the reason the predicate is shared rather than re-derived: a call site that
    reached for the *apply* rule would announce this metatask, because Albescent
    clears that bar at every level. The see bar has no faction bypass, so a
    novice Albescent is told nothing — the same as anyone else below it.
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
