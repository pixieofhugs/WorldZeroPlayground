"""The retired/pending filter tabs are offered exactly when the query will answer.

Two advertised level unlocks — level 2 "the archive opens" (`retired_tasks`) and
level 3 "watch proposals move through review" (`pending_tasks`) — are stated in
two places that had drifted apart in *opposite* directions:

* `can_see_retired_tasks` was gated on the `/auth/me` flag and by nothing at all
  in `list_tasks`. Anonymous callers could read the whole archive, so the level-2
  ability was advertised and never actually withheld.
* `can_see_pending_tasks` was gated by level on the flag but by `is_admin` alone
  in `list_tasks` (#1672), so a level-3 player was offered a filter tab that
  always came back empty.

`useTasks.ts` pushes a status tab for each flag, so the flag *is* the promise and
the query has to keep it. This asserts the two agree — for both statuses, at both
doors (`?status=X` and the `?status=all` catch-all), which is the pairing that
matters: a gate written at only one door is not a gate, and that is exactly how
the pending queue leaked before #1672.

Pending carries a SECOND rule (#1695), asserted here too: the level unlock is
withheld for `era.pending_task_admin_review_hours` after a proposal is written,
so an admin gets the first look and can edit or reject it before other players
read it. That one is per-ROW, not per-viewer — the same level-3 player sees the
ripe pending rows and not the fresh ones — so every case below carries two
pending rows of different ages, and the flag is deliberately asserted against the
RIPE one: the capability is unchanged, only its reach in time.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType

# Comfortably either side of the window, so a slow test run cannot flip a row
# from one side of it to the other mid-assertion.
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


async def _make_admin(session: AsyncSession, account: Account) -> None:
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    session.add(AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id))
    await session.commit()


async def _gated_task(
    session: AsyncSession,
    author: Character,
    status: TaskStatus,
    age: timedelta = FRESH_AGE,
) -> Task:
    """A row of the given status, backdated by ``age``.

    ``created_at`` is written explicitly rather than left to the server default:
    the #1695 window is arithmetic on that column, and a test that cannot age a
    row can only ever assert one side of it.
    """
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


@pytest.mark.parametrize(
    "level, faction, sees_retired, sees_pending",
    [
        (0, "ua", False, False),
        (CURRENT_ERA.level_to_see_retired_tasks, "ua", True, False),
        (CURRENT_ERA.level_to_see_pending_tasks, "ua", True, True),
        # The faction whose perk is working retired tasks reaches the archive
        # from level 0 — a perk you cannot find the rows for is not a perk.
        (0, "ephemerists", True, False),
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
    faction_ua: Faction,
    faction_ephemerists: Faction,
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

    # Door one: the explicit status the flag's filter tab sends.
    explicit_pending = await _ids(client, "/tasks?status=pending", auth_headers)
    assert (retired.id in await _ids(client, "/tasks?status=retired", auth_headers)) is sees_retired
    assert (ripe.id in explicit_pending) is sees_pending
    # #1695 — no non-admin, at any level, reads a proposal inside its window.
    assert fresh.id not in explicit_pending

    # Door two: the catch-all reaches the same rows and must withhold the same.
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
    """No character, no level, so both abilities are unearned — at both doors.

    Retired is the regression that matters here: it used to come back 200 with
    the rows on it, to callers with no account at all.

    The RIPE pending row is the #1695 regression guard: a rule phrased as "old
    enough to show" must not become a second way in for a viewer who was never
    allowed the status at all.
    """
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
    faction_ua: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """#1695's whole point: the window is FOR the admin, so it never holds them.

    Including at level 0 — the admin bypass is `is_admin`, not a level, and an
    admin whose character never earned the level-3 unlock still reviews the
    queue. `/admin/tasks/pending` is asserted alongside the browse because a
    review queue that waits 48 hours to show a proposal defeats the feature it
    is the other half of.
    """
    await _make_admin(db_session, account)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    await _set_level_and_faction(db_session, character, era, 0, "ua")

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
    faction_ua: Faction,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Owner ruling (#1695): the clock is `created_at`, never `updated_at`.

    Resetting on edit would let a touch at hour 47 restart the window and make
    the go-live time unpredictable. The proposal below is already ripe and is
    then edited; it stays visible to the level-3 player.
    """
    await _make_admin(db_session, account)
    ripe = await _gated_task(db_session, character, TaskStatus.pending, RIPE_AGE)
    await _set_level_and_faction(db_session, character2, era, CURRENT_ERA.level_to_see_pending_tasks, "ua")

    patched = await client.patch(
        f"/admin/tasks/{ripe.id}",
        json={"title": "Edited by admin"},
        headers=auth_headers,
    )
    assert patched.status_code == 200, patched.text

    assert ripe.id in await _ids(client, "/tasks?status=pending", auth_headers2)
    assert ripe.id in await _ids(client, "/tasks?status=all&limit=200", auth_headers2)
