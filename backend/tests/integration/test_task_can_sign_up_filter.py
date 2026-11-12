"""#1130: ``list_tasks(can_sign_up=True)`` must agree with ``evaluate_signup``.

The filter re-expresses the predicate (ADR-0008) in SQL to avoid an N+1 (#1218).
Parity is over the unfiltered browse's rows, not every ``Task``. Gate 5 reuses
``active_member_task_ids_subquery``, which honours Double Dipper (#1359).
"""
from dataclasses import replace

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from services.era import get_or_create_stats
from services.praxis import evaluate_signup
from services.task import list_tasks
from tests.integration.factories import DEFAULT_FACTION_SLUG, make_task

#: A real faction of the live era that is NOT the one the shared fixtures seat
#: characters in. Derived, never named (#2708) — "somewhere else to go" is the
#: whole requirement.
#: The faction that may work RETIRED tasks — found by the perk, never named
#: (#2708). It is era-owned: Era 1 gives it to the Ephemerists,
#: `_inherited_perk_slugs` mirrors it onto Albescent, and an era may give it to
#: nobody. Sentinels are dropped because a character cannot join either.
TASK_VISION_SLUG = next(
    (
        slug
        for slug in sorted(CURRENT_ERA.allow_praxis_on_retired_task_factions)
        if slug in real_faction_slugs(CURRENT_ERA)
    ),
    None,
)

OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)

# Real row for the FK; the Double Dipper ability is asserted off the config.
EVERYMEN_SLUG = "everymen"


@pytest_asyncio.fixture
async def faction_wow(db_session: AsyncSession) -> Faction:
    """'wow' has `level_jump_reach=1`."""
    existing = await db_session.execute(select(Faction).where(Faction.slug == "wow"))
    found = existing.scalar_one_or_none()
    if found is not None:
        return found
    faction = Faction(slug="wow", status=FactionStatus.visible)
    db_session.add(faction)
    await db_session.commit()
    await db_session.refresh(faction)
    return faction


@pytest_asyncio.fixture
async def faction_everymen(db_session: AsyncSession) -> Faction:
    existing = await db_session.execute(
        select(Faction).where(Faction.slug == EVERYMEN_SLUG)
    )
    found = existing.scalar_one_or_none()
    if found is not None:
        return found
    faction = Faction(slug=EVERYMEN_SLUG, status=FactionStatus.visible)
    db_session.add(faction)
    await db_session.commit()
    await db_session.refresh(faction)
    return faction


async def _make_task(
    db_session: AsyncSession,
    author: Character,
    *,
    title: str,
    level_required: int = 0,
    status: TaskStatus = TaskStatus.active,
    task_type: TaskType = TaskType.standard,
) -> Task:
    return await make_task(
        db_session,
        author,
        title=title,
        description="",
        point_value=5,
        level_required=level_required,
        status=status,
        task_type=task_type,
        commit=True,
    )
async def _seed_in_progress_praxis(
    db_session: AsyncSession, character: Character, task: Task
) -> None:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="wip",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()


async def _set_level(
    db_session: AsyncSession,
    character: Character,
    era_row: Era,
    *,
    level: int,
    level_jump_used_at_level: int | None = None,
) -> None:
    stats = await get_or_create_stats(db_session, character.id, era_row.id)
    stats.level = level
    stats.level_jump_used_at_level = level_jump_used_at_level
    await db_session.commit()


async def _assert_parity(
    db_session: AsyncSession,
    viewer: Character,
    era_config: EraConfig,
) -> set[int]:
    """Filtered == unfiltered minus what evaluate_signup rejects."""
    common = dict(
        status="all",
        task_type="all",
        viewer=viewer,
        era=era_config,
        limit=200,
    )
    candidates = await list_tasks(db_session, can_sign_up=False, **common)
    expected = {
        task.id
        for task in candidates
        if (await evaluate_signup(viewer, task, db_session, era_config)).allowed
    }
    filtered = await list_tasks(db_session, can_sign_up=True, **common)
    assert {task.id for task in filtered} == expected
    return expected


@pytest.mark.asyncio
async def test_parity_matrix_level_jump_available(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
    faction_wow: Faction,
):
    character.faction_slug = "wow"
    await db_session.commit()
    # Clears level_to_see_metatasks, so only gate 1 can drop the metatask.
    await _set_level(db_session, character, era, level=6)

    at_level = await _make_task(db_session, character, title="at", level_required=6)
    one_up = await _make_task(db_session, character, title="up", level_required=7)
    two_up = await _make_task(db_session, character, title="far", level_required=8)
    metatask = await _make_task(
        db_session, character, title="meta", task_type=TaskType.metatask
    )
    retired = await _make_task(
        db_session, character, title="retired", status=TaskStatus.retired
    )
    pending = await _make_task(
        db_session, character, title="pending", status=TaskStatus.pending
    )

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert at_level.id in eligible
    assert one_up.id in eligible, "the unspent level jump must reach one level up"
    assert two_up.id not in eligible
    assert metatask.id not in eligible
    assert retired.id not in eligible
    assert pending.id not in eligible


@pytest.mark.asyncio
async def test_parity_matrix_level_jump_spent(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
    faction_wow: Faction,
):
    character.faction_slug = "wow"
    await db_session.commit()
    await _set_level(
        db_session, character, era, level=6, level_jump_used_at_level=6
    )

    at_level = await _make_task(db_session, character, title="at", level_required=6)
    one_up = await _make_task(db_session, character, title="up", level_required=7)

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert at_level.id in eligible
    assert one_up.id not in eligible


@pytest.mark.skipif(
    TASK_VISION_SLUG is None, reason="no faction in the live era holds Task Vision"
)
@pytest.mark.asyncio
async def test_parity_matrix_task_vision_retired_task(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    retired = await _make_task(
        db_session, character, title="retired", status=TaskStatus.retired
    )
    active = await _make_task(db_session, character, title="active")

    ordinary_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert retired.id not in ordinary_eligible
    assert active.id in ordinary_eligible

    character.faction_slug = TASK_VISION_SLUG
    await db_session.commit()

    task_vision_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert retired.id in task_vision_eligible


@pytest.mark.asyncio
async def test_parity_matrix_bank_full_returns_nothing(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Gate 6 is per-viewer, not per-task, so the filter short-circuits."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    await _make_task(db_session, character, title="tempting")
    capped = replace(CURRENT_ERA, max_task_signups=1)

    eligible = await _assert_parity(db_session, character, capped)
    assert eligible == set()


@pytest.mark.asyncio
async def test_active_member_task_is_filtered_out(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Gate 5."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character, title="free")

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert active_task.id not in eligible
    assert other.id in eligible


async def _browse_task_ids(db_session: AsyncSession, viewer: Character) -> set[int]:
    """Browse with ``exclude_character_id`` = viewer (#1229), no ``can_sign_up``."""
    tasks = await list_tasks(
        db_session,
        viewer=viewer,
        exclude_character_id=viewer.id,
        status="all",
        task_type="all",
        limit=200,
    )
    return {task.id for task in tasks}


@pytest.mark.asyncio
async def test_double_dipper_task_stays_in_browse(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    """#1359. Both halves, or "faction-aware" passes as "removed"."""
    assert CURRENT_ERA.factions[EVERYMEN_SLUG].can_hold_multiple_memberships, (
        "fixture premise: this era grants Double Dipper to Everymen"
    )
    await _seed_in_progress_praxis(db_session, character, active_task)

    assert active_task.id not in await _browse_task_ids(db_session, character), (
        "no ability: the task you are already working stays hidden"
    )

    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()

    assert active_task.id in await _browse_task_ids(db_session, character), (
        "Double Dipper: a task you may claim again must be visible to claim again"
    )


@pytest.mark.asyncio
async def test_parity_matrix_double_dipper(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    """#1359."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character, title="free")

    ordinary_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert active_task.id not in ordinary_eligible

    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()

    everymen_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert active_task.id in everymen_eligible
    assert other.id in everymen_eligible


@pytest.mark.asyncio
async def test_anonymous_viewer_gets_nothing(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    await _make_task(db_session, character, title="visible")

    filtered = await list_tasks(
        db_session, can_sign_up=True, viewer=None, status="all", task_type="all"
    )
    assert filtered == []


# Route level (#2264): gate 5 applies only when `can_sign_up` is on.


async def _route_task_ids(client, url: str, headers: dict | None = None) -> list[int]:
    resp = await client.get(url, headers=headers or {})
    assert resp.status_code == 200, resp.text
    return [task["id"] for task in resp.json()]


@pytest.mark.asyncio
async def test_route_all_tasks_shows_a_task_the_viewer_started(
    client,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    await _seed_in_progress_praxis(db_session, character, active_task)

    ids = await _route_task_ids(client, "/tasks?can_sign_up=0", auth_headers)
    assert active_task.id in ids, (
        "the viewer switched the eligibility filter off; the task they started "
        "is still one of the tasks that exist"
    )


@pytest.mark.asyncio
async def test_route_eligibility_browse_still_hides_a_started_task(
    client,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """#1229 survives #2264."""
    await _seed_in_progress_praxis(db_session, character, active_task)

    ids = await _route_task_ids(client, "/tasks?can_sign_up=1", auth_headers)
    assert active_task.id not in ids


@pytest.mark.asyncio
async def test_route_faction_task_list_is_the_same_for_every_viewer(
    client,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """`useFactionDetail` renders this query's length as a count (#2264)."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    # The task's own faction: a named one can be absent and pass vacuously (#2708).
    url = f"/tasks?faction={active_task.primary_faction_slug}&status=active"

    holder = await _route_task_ids(client, url, auth_headers)
    stranger = await _route_task_ids(client, url, auth_headers2)
    anonymous = await _route_task_ids(client, url)

    assert active_task.id in holder
    assert holder == stranger == anonymous
