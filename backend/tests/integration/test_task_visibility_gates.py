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

There is a THIRD door (#1725): `GET /tasks/{id}`. Task ids are sequential, so a
gate the browse keeps and the detail route does not is not a gate — a caller who
guesses the next id read the proposal immediately, logged out included. The last
tests here drive the same five cases through that door, and it answers **404**
rather than 403: a 403 confirms the id exists, which is the existence oracle the
window is meant to close.
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
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType
from tests.integration.factories import DEFAULT_FACTION_SLUG, make_admin

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


#: The factions whose perk is working retired tasks reach the archive from level
#: 0 — a perk you cannot find the rows for is not a perk. Found BY THE PERK
#: rather than named (#2708): the holder is era-owned, and an era where nobody
#: holds it contributes no case rather than naming a faction that is not there.
#: The sentinels are dropped because a character cannot join either.
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
    some_faction: Faction,
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
    """Owner ruling (#1695): the clock is `created_at`, never `updated_at`.

    Resetting on edit would let a touch at hour 47 restart the window and make
    the go-live time unpredictable. The proposal below is already ripe and is
    then edited; it stays visible to the level-3 player.
    """
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
        # Below the unlock, at either age: the level is what is missing.
        (0, FRESH_AGE, 404),
        (0, RIPE_AGE, 404),
        # At the unlock, inside the window: #1695's half of the rule, and the
        # case the id-guessing route used to hand over on demand.
        (CURRENT_ERA.level_to_see_pending_tasks, FRESH_AGE, 404),
        # At the unlock, past the window: the browse shows this row, so the
        # detail must too — the gate is a copy of one rule, not a stricter one.
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
    """`GET /tasks/{id}` withholds exactly the pending rows the browse withholds."""
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
    """No account, no level — and 404, so the id itself stays unconfirmed.

    The two approved statuses are asserted alongside as the guard against
    over-gating: retired rows must stay readable by id at any level, because
    praxis link back to them. `era.level_to_see_retired_tasks` is the browse's
    concern, not this door's.
    """
    ripe = await _gated_task(db_session, character2, TaskStatus.pending, RIPE_AGE)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    active = await _gated_task(db_session, character2, TaskStatus.active)
    retired = await _gated_task(db_session, character2, TaskStatus.retired)

    for task in (ripe, fresh):
        response = await client.get(f"/tasks/{task.id}")
        assert response.status_code == 404, response.text
        # The same body a genuinely absent id gets: no shape to tell them apart.
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
    """The window exists to give admins the first look, so it never holds them.

    At level 0, because the bypass is `is_admin` and not a level — the same
    exemption the browse takes.
    """
    await make_admin(db_session, account)
    fresh = await _gated_task(db_session, character2, TaskStatus.pending, FRESH_AGE)
    await _set_level_and_faction(db_session, character, era, 0, DEFAULT_FACTION_SLUG)

    response = await client.get(f"/tasks/{fresh.id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["id"] == fresh.id


# ---------------------------------------------------------------------------
# The author's own proposals (#2126)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_proposer_sees_their_own_proposal_the_moment_they_write_it(
    client: AsyncClient,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """#2126 — "No proposed tasks yet" said to the one person who knows better.

    TWO gates hid a proposal from its own author. The #1695 window withheld it
    for its first `pending_task_admin_review_hours`, and the proposer's-profile
    branch of `list_tasks` withheld pending from *every* viewer for good — so
    the profile section headed "Proposed tasks" answered "none", and unlike the
    window, waiting never fixed that one.

    The propose-success screen already promises the narrower rule in so many
    words: only admins see it at first, "other players see it after that". The
    author is not one of the other players.

    Asserted against the FRESH row at BOTH doors: a carve-out that only reaches
    the ripe rows is the same bug with a 48-hour delay on it.
    """
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
    """What #2126 must NOT widen: somebody else's profile.

    `character2` reads `character`'s profile at the level that opens the review
    queue. One row is inside the window and one is past it, and BOTH stay off a
    profile that is not the reader's own — the proposer's-profile branch still
    withholds other people's pending rows exactly as it did before. The
    exemption is per-ROW authorship, so it can only ever reach rows the reader
    wrote.
    """
    await _set_level_and_faction(
        db_session, character2, era, CURRENT_ERA.level_to_see_pending_tasks,
        DEFAULT_FACTION_SLUG
    )
    fresh = await _gated_task(db_session, character, TaskStatus.pending, FRESH_AGE)
    ripe = await _gated_task(db_session, character, TaskStatus.pending, RIPE_AGE)

    theirs = await _ids(client, f"/tasks?created_by={character.id}", auth_headers2)
    assert fresh.id not in theirs
    assert ripe.id not in theirs

    # The detail door keeps the window against a row you did not write, and the
    # anonymous web is still below every gate.
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
    """The browse's exclusion is not a fact about authorship (#2126).

    The eligibility browse hides what the reader has already started, because
    that is gate 5 of the sign-up predicate (#1229). `created_by` is not a
    browse: it asks what a character PROPOSED, and the answer cannot depend on
    which of those tasks the *reader* happens to be working. `active_task` is
    authored by `character` and carries their praxis, so it dropped off their
    own profile the moment they started it — and off a stranger's profile
    according to whatever the visitor had in their own praxis bank.

    #2126 fixed that by carving `created_by` out of a route-level default;
    #2264 removed the default itself, so this route no longer needs a
    carve-out to be right. The assertion is unchanged and still guards it.
    """
    mine = await _ids(client, f"/tasks?created_by={character.id}", auth_headers)
    assert active_task.id in mine
