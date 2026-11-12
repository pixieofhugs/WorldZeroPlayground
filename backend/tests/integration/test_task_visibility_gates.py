"""The retired/pending `/auth/me` flags and the task query agree (#1672).

`useTasks.ts` shows a status tab per flag, so the flag is the promise. Checked at
every door: `?status=X`, `?status=all`, and `GET /tasks/{id}` (#1725; ids are
sequential, and it answers 404 not 403 so the id stays unconfirmed).

Pending also has a per-row admin-review window (#1695): hidden from non-admins for
`era.pending_task_admin_review_hours`, so cases carry a ripe and a fresh row.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.task import Task, TaskStatus, TaskType
from tests.integration.factories import DEFAULT_FACTION_SLUG, make_admin

# Well clear of the window edge so a slow run cannot flip a row.
RIPE_AGE = timedelta(hours=CURRENT_ERA.pending_task_admin_review_hours, minutes=5)
FRESH_AGE = timedelta(minutes=5)


async def _set_level_and_faction(
    session: AsyncSession, character: Character, era: Era, level: int, faction: str
) -> None:
    stats = (
        await session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.level = level
    character.faction_slug = faction
    await session.commit()



async def _gated_task(
    session: AsyncSession,
    author: Character,
    status: TaskStatus,
    age: timedelta = FRESH_AGE,
) -> Task:
    """Backdated by ``age``: the #1695 window is arithmetic on ``created_at``."""
    task = Task(
        title=f"{status.value} row",
        description="",
        point_value=10,
        level_required=0,
        primary_faction_slug="na",
        task_type=TaskType.standard,
        created_by=author.id,
        status=status,
        created_at=datetime.now(timezone.utc) - age,
    )
    session.add(task)
    await session.commit()
    return task


async def _ids(client: AsyncClient, query: str, headers: dict | None) -> set[int]:
    response = await client.get(query, headers=headers or {})
    assert response.status_code == 200, response.text
    return {row["id"] for row in response.json()}


#: Retired-task-perk factions see the archive from level 0. Found by the perk,
#: not named (#2708); sentinels dropped since no character can join them.
TASK_VISION_CASES = [
    (0, slug, True, False)
    for slug in sorted(CURRENT_ERA.allow_praxis_on_retired_task_factions)
    if slug in real_faction_slugs(CURRENT_ERA)
]


@pytest.mark.parametrize(
    "level, faction, sees_retired, sees_pending",
    [
        (0, DEFAULT_FACTION_SLUG, False, False),
        (CURRENT_ERA.level_to_see_retired_tasks, DEFAULT_FACTION_SLUG, True, False),
        (CURRENT_ERA.level_to_see_pending_tasks, DEFAULT_FACTION_SLUG, True, True),
        *TASK_VISION_CASES,
    ],
)
@pytest.mark.asyncio
async def test_the_flag_and_the_query_agree(
    level: int,
    faction: str,
    sees_retired: bool,
    sees_pending: bool,
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    retired = await _gated_task(db_session, character2, TaskStatus.retired)
    ripe = await _gated_task(db_session, character2, TaskStatus.pending, RIPE_AGE)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    await _set_level_and_faction(db_session, character, era, level, faction)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_see_retired_tasks"] is sees_retired
    assert me["can_see_pending_tasks"] is sees_pending

    explicit_pending = await _ids(client, "/tasks?status=pending", auth_headers)
    assert (retired.id in await _ids(client, "/tasks?status=retired", auth_headers)) is sees_retired
    assert (ripe.id in explicit_pending) is sees_pending
    assert fresh.id not in explicit_pending  # #1695

    everything = await _ids(client, "/tasks?status=all&limit=200", auth_headers)
    assert (retired.id in everything) is sees_retired
    assert (ripe.id in everything) is sees_pending
    assert fresh.id not in everything


@pytest.mark.asyncio
async def test_the_anonymous_web_gets_neither(
    client: AsyncClient,
    character2: Character,
    db_session: AsyncSession,
):
    """The ripe row guards "old enough to show" becoming a way in (#1695)."""
    retired = await _gated_task(db_session, character2, TaskStatus.retired)
    ripe = await _gated_task(db_session, character2, TaskStatus.pending, RIPE_AGE)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)

    for query in ("/tasks?status=retired", "/tasks?status=pending", "/tasks?status=all&limit=200"):
        visible = await _ids(client, query, None)
        assert retired.id not in visible, query
        assert ripe.id not in visible, query
        assert fresh.id not in visible, query


@pytest.mark.asyncio
async def test_an_admin_gets_the_first_look(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The #1695 window is for the admin; the bypass is `is_admin`, not level."""
    await make_admin(db_session, account)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    await _set_level_and_faction(db_session, character, era, 0, DEFAULT_FACTION_SLUG)

    assert fresh.id in await _ids(client, "/tasks?status=pending", auth_headers)
    assert fresh.id in await _ids(client, "/tasks?status=all&limit=200", auth_headers)

    queue = await client.get("/admin/tasks/pending", headers=auth_headers)
    assert queue.status_code == 200, queue.text
    assert fresh.id in {row["id"] for row in queue.json()}


@pytest.mark.asyncio
async def test_an_admin_edit_does_not_move_the_go_live_time(
    client: AsyncClient,
    account: Account,
    account2: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """#1695: the clock is `created_at`, never `updated_at`."""
    await make_admin(db_session, account)
    ripe = await _gated_task(db_session, character, TaskStatus.pending, RIPE_AGE)
    await _set_level_and_faction(
        db_session,
        character2,
        era,
        CURRENT_ERA.level_to_see_pending_tasks,
        DEFAULT_FACTION_SLUG,
    )

    patched = await client.patch(
        f"/admin/tasks/{ripe.id}",
        json={"title": "Edited by admin"},
        headers=auth_headers,
    )
    assert patched.status_code == 200, patched.text

    assert ripe.id in await _ids(client, "/tasks?status=pending", auth_headers2)
    assert ripe.id in await _ids(client, "/tasks?status=all&limit=200", auth_headers2)


@pytest.mark.parametrize(
    "level, age, expected",
    [
        (0, FRESH_AGE, 404),
        (0, RIPE_AGE, 404),
        (CURRENT_ERA.level_to_see_pending_tasks, FRESH_AGE, 404),
        # Not stricter than the browse.
        (CURRENT_ERA.level_to_see_pending_tasks, RIPE_AGE, 200),
    ],
)
@pytest.mark.asyncio
async def test_the_detail_door_answers_what_the_browse_answers(
    level: int,
    age: timedelta,
    expected: int,
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    task = await _gated_task(db_session, character2, TaskStatus.pending, age)
    await _set_level_and_faction(
        db_session, character, era, level, DEFAULT_FACTION_SLUG
    )

    response = await client.get(f"/tasks/{task.id}", headers=auth_headers)
    assert response.status_code == expected, response.text

    browse = await _ids(client, "/tasks?status=all&limit=200", auth_headers)
    assert (task.id in browse) is (expected == 200)


@pytest.mark.asyncio
async def test_the_detail_door_is_shut_to_the_anonymous_web(
    client: AsyncClient,
    character2: Character,
    db_session: AsyncSession,
):
    """Retired stays readable by id (praxes link to it); only the browse gates it."""
    ripe = await _gated_task(db_session, character2, TaskStatus.pending, RIPE_AGE)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    active = await _gated_task(db_session, character2, TaskStatus.active)
    retired = await _gated_task(db_session, character2, TaskStatus.retired)

    for task in (ripe, fresh):
        response = await client.get(f"/tasks/{task.id}")
        assert response.status_code == 404, response.text
        # Same body as a genuinely absent id.
        assert response.json()["detail"] == "Task not found."

    for task in (active, retired):
        assert (await client.get(f"/tasks/{task.id}")).status_code == 200


@pytest.mark.asyncio
async def test_the_detail_door_opens_for_an_admin_immediately(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    await _set_level_and_faction(db_session, character, era, 0, DEFAULT_FACTION_SLUG)

    response = await client.get(f"/tasks/{fresh.id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["id"] == fresh.id


# The author's own proposals (#2126).


@pytest.mark.asyncio
async def test_a_proposer_sees_their_own_proposal_the_moment_they_write_it(
    client: AsyncClient,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """#2126: the window holds "other players", not the author. Both doors."""
    await _set_level_and_faction(
        db_session, character, era, CURRENT_ERA.level_to_propose_task,
        DEFAULT_FACTION_SLUG
    )
    fresh = await _gated_task(db_session, character, TaskStatus.pending, FRESH_AGE)

    mine = await _ids(client, f"/tasks?created_by={character.id}", auth_headers)
    assert fresh.id in mine

    detail = await client.get(f"/tasks/{fresh.id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["id"] == fresh.id


@pytest.mark.asyncio
async def test_the_carve_out_is_authorship_and_not_a_hole_in_the_window(
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """#2126 must not widen someone else's profile: the exemption is per-row."""
    await _set_level_and_faction(
        db_session, character2, era, CURRENT_ERA.level_to_see_pending_tasks,
        DEFAULT_FACTION_SLUG
    )
    fresh = await _gated_task(db_session, character, TaskStatus.pending, FRESH_AGE)
    ripe = await _gated_task(db_session, character, TaskStatus.pending, RIPE_AGE)

    theirs = await _ids(client, f"/tasks?created_by={character.id}", auth_headers2)
    assert fresh.id not in theirs
    assert ripe.id not in theirs

    other = await client.get(f"/tasks/{fresh.id}", headers=auth_headers2)
    assert other.status_code == 404
    assert (await client.get(f"/tasks/{fresh.id}")).status_code == 404


@pytest.mark.asyncio
async def test_a_profile_keeps_a_proposal_its_author_is_also_working(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    praxis_solo,
    auth_headers: dict,
):
    """`created_by` must not depend on what the reader is working (#2126)."""
    mine = await _ids(client, f"/tasks?created_by={character.id}", auth_headers)
    assert active_task.id in mine
