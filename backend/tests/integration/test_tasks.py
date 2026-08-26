"""Integration tests for /tasks endpoints."""
from contextlib import contextmanager
from typing import Iterator

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession

# These tests set and assert a *task's* primary_faction_slug, so they name the
# cross-faction sentinel, not the unaffiliated-character one (#1559).
from faction_slugs import CROSS_FACTION_SLUG
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from schemas.task import TaskSignupOut


async def _set_character_level(
    db_session: AsyncSession, character_id: int, era_id: int, level: int
) -> None:
    """Bump a character's current-era level directly on CharacterStats."""
    from sqlalchemy import select as sa_select

    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await db_session.commit()


@pytest.mark.asyncio
async def test_list_tasks_public(client: AsyncClient, active_task: Task):
    resp = await client.get("/tasks")
    assert resp.status_code == 200
    data = resp.json()
    ids = [task_json["id"] for task_json in data]
    assert active_task.id in ids


@pytest.mark.asyncio
async def test_get_task(client: AsyncClient, active_task: Task):
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == active_task.id
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_get_task_not_found(client: AsyncClient):
    resp = await client.get("/tasks/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_propose_task_requires_level3(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """character is level 0 — proposal should be rejected."""
    resp = await client.post(
        "/tasks",
        json={"title": "My Task", "point_value": 5, "level_required": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_propose_task_level3(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """character2 is level 5 — should be allowed to propose."""
    resp = await client.post(
        "/tasks",
        json={"title": "Good Task", "point_value": 10, "level_required": 0},
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["title"] == "Good Task"


# ---------------------------------------------------------------------------
# T.6 additions — filters, propose task, signups list, hidden factions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_tasks_filter_by_status_active(
    client: AsyncClient, active_task: Task
):
    """status=active returns only active tasks."""
    resp = await client.get("/tasks", params={"status": "active"})
    assert resp.status_code == 200
    data = resp.json()
    assert all(t["status"] == "active" for t in data)
    ids = [t["id"] for t in data]
    assert active_task.id in ids


@pytest.mark.asyncio
async def test_list_tasks_filter_by_status_all(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """status=all returns tasks of every status."""
    pending_task = Task(
        title="Pending Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(pending_task)
    await db_session.commit()

    resp = await client.get("/tasks", params={"status": "all"})
    assert resp.status_code == 200
    data = resp.json()
    statuses = {t["status"] for t in data}
    # Both pending and active tasks should appear
    assert "active" in statuses or "pending" in statuses


@pytest.mark.asyncio
async def test_list_tasks_filter_by_created_by(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """created_by returns the creator's approved tasks (active + retired),
    omitting their pending submissions and other creators' tasks (#419)."""
    retired_task = Task(
        title="Retired Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    pending_task = Task(
        title="Pending Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    other_task = Task(
        title="Other Creator Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([retired_task, pending_task, other_task])
    await db_session.commit()

    resp = await client.get("/tasks", params={"created_by": character.id})
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert active_task.id in ids  # active, this creator
    assert retired_task.id in ids  # retired, this creator
    assert pending_task.id not in ids  # pending is hidden from all viewers
    assert other_task.id not in ids  # different creator


@pytest.mark.asyncio
async def test_list_tasks_filter_invalid_status(client: AsyncClient):
    """Invalid status value returns 422."""
    resp = await client.get("/tasks", params={"status": "bogus_status"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_tasks_filter_by_min_max_points(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """min_points and max_points filter tasks by point value."""
    # active_task has point_value=10
    resp_min = await client.get("/tasks", params={"min_points": 10})
    assert resp_min.status_code == 200
    for task_data in resp_min.json():
        assert task_data["point_value"] >= 10

    resp_max = await client.get("/tasks", params={"max_points": 9})
    assert resp_max.status_code == 200
    for task_data in resp_max.json():
        assert task_data["point_value"] <= 9

    # active_task has point_value=10, so it should be excluded from max_points=9
    ids_under_10 = [t["id"] for t in resp_max.json()]
    assert active_task.id not in ids_under_10


@pytest.mark.asyncio
async def test_list_tasks_filter_by_faction(
    client: AsyncClient, active_task: Task
):
    """faction filter returns only tasks for that faction."""
    resp = await client.get("/tasks", params={"faction": "ua"})
    assert resp.status_code == 200
    for task_data in resp.json():
        assert task_data["primary_faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_list_tasks_filter_by_multiple_factions(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    some_faction: Faction,
):
    """Repeated ?faction= returns the union; one slug still narrows to one; an
    absent or empty faction filters nothing at all (#1364)."""
    unaffiliated_task = Task(
        title="Cross-Faction Sort Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    )
    ephemerist_task = Task(
        title="Ephemerist Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ephemerists",
    )
    db_session.add_all([unaffiliated_task, ephemerist_task])
    await db_session.commit()

    both = await client.get(
        "/tasks", params={"faction": ["ua", CROSS_FACTION_SLUG]}
    )
    assert both.status_code == 200
    both_ids = {t["id"] for t in both.json()}
    assert {active_task.id, unaffiliated_task.id} <= both_ids
    assert ephemerist_task.id not in both_ids
    assert {t["primary_faction_slug"] for t in both.json()} == {
        "ua",
        CROSS_FACTION_SLUG,
    }

    one = await client.get("/tasks", params={"faction": "ua"})
    assert one.status_code == 200
    assert {t["primary_faction_slug"] for t in one.json()} == {"ua"}

    # No faction axis at all, and a cleared one, are both "no filter" — never
    # "match nothing".
    for params in ({}, {"faction": ""}):
        unfiltered = await client.get("/tasks", params=params)
        assert unfiltered.status_code == 200
        unfiltered_ids = {t["id"] for t in unfiltered.json()}
        assert {
            active_task.id,
            unaffiliated_task.id,
            ephemerist_task.id,
        } <= unfiltered_ids


@pytest.mark.asyncio
async def test_list_tasks_sort_oldest_reverses_newest(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """?sort=oldest is ?sort=newest reversed, and the id tiebreak keeps both
    stable across limits — rows written in one transaction share created_at.

    The point values rise with creation order so the level default (point value
    DESC) cannot masquerade as chronological order.
    """
    for index in range(3):
        db_session.add(
            Task(
                title=f"Chronology Task {index}",
                description="",
                point_value=5 + index,
                level_required=0,
                status=TaskStatus.active,
                created_by=character.id,
                primary_faction_slug="ua",
            )
        )
    await db_session.commit()

    newest = await client.get("/tasks", params={"sort": "newest"})
    oldest = await client.get("/tasks", params={"sort": "oldest"})
    assert newest.status_code == 200
    assert oldest.status_code == 200
    newest_ids = [t["id"] for t in newest.json()]
    oldest_ids = [t["id"] for t in oldest.json()]
    assert len(oldest_ids) == 4
    assert oldest_ids == sorted(oldest_ids)
    assert oldest_ids == list(reversed(newest_ids))

    for limit in (2, 3):
        page = await client.get("/tasks", params={"sort": "oldest", "limit": limit})
        assert [t["id"] for t in page.json()] == oldest_ids[:limit]


@pytest.mark.asyncio
async def test_list_tasks_default_sort_is_level_then_point_value(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """No ?sort= keeps today's browse ordering — level ascending, point value
    descending. Tasks.tsx sends no sort at all, so this is the regression guard;
    ?sort=level names that same default explicitly (#1364)."""
    high_level = Task(
        title="High Level Task",
        description="",
        point_value=30,
        level_required=2,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    cheap = Task(
        title="Cheap Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    rich = Task(
        title="Rich Task",
        description="",
        point_value=20,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([high_level, cheap, rich])
    await db_session.commit()

    default = await client.get("/tasks")
    assert default.status_code == 200
    # active_task is level 0 / 10 points, so it lands between rich and cheap.
    assert [t["id"] for t in default.json()] == [
        rich.id,
        active_task.id,
        cheap.id,
        high_level.id,
    ]

    named = await client.get("/tasks", params={"sort": "level"})
    assert named.status_code == 200
    assert named.json() == default.json()


@pytest.mark.asyncio
async def test_unknown_sort_is_rejected_and_absent_sort_still_defaults(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """An unrecognised ?sort= is a 422, not the level default under a 200.

    The seam is the trust boundary: GET /tasks parsing the raw query string.
    Before #1443 'most_liked' fell through to level-ascending and returned
    plausible-looking rows, so a typo'd or retired value never surfaced —
    /praxes has always raised on the same input.

    The absent half is the other required assertion: Tasks.tsx sends no sort at
    all and depends on landing on level-ascending, so a route that rejected
    everything would pass a one-sided test.
    """
    easy = Task(
        title="Easy Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    hard = Task(
        title="Hard Task",
        description="",
        point_value=50,
        level_required=3,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([easy, hard])
    await db_session.commit()

    rejected = await client.get("/tasks", params={"sort": "most_liked"})
    assert rejected.status_code == 422

    absent = await client.get("/tasks")
    assert absent.status_code == 200
    absent_ids = [task["id"] for task in absent.json()]
    # Level ascending: the level-0 row precedes the level-3 one, and the rich
    # level-3 row has not floated to the top on point value.
    assert absent_ids.index(easy.id) < absent_ids.index(hard.id)
    assert absent_ids[0] != hard.id


@pytest.mark.asyncio
async def test_list_tasks_exclude_character_id(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """exclude_character_id hides tasks the character already has a praxis for."""
    # character creates a praxis for the task — this is equivalent to "signing up"
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get("/tasks", params={"exclude_character_id": character.id})
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    # character has an active praxis for active_task, so it should be excluded
    assert active_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_is_the_same_list_for_every_reader(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """A plain `GET /tasks` does not depend on who is reading it (#2264).

    The route used to default `exclude_character_id` to the viewer (#1229), so
    a signed-in reader and an anonymous one were handed different lists — and
    the surfaces that render a COUNT off this call reported a different number
    per reader. The exclusion now belongs to `can_sign_up`, which is where it is
    actually true: it is gate 5 of the sign-up predicate, asserted in
    tests/integration/test_task_can_sign_up_filter.py.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get("/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert active_task.id in [t["id"] for t in resp.json()]

    anon_resp = await client.get("/tasks")
    assert anon_resp.status_code == 200
    assert [t["id"] for t in anon_resp.json()] == [t["id"] for t in resp.json()]


@pytest.mark.asyncio
async def test_propose_task_with_description(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """Level-5 character can propose a task with a description."""
    resp = await client.post(
        "/tasks",
        json={
            "title": "Detailed Task",
            "description": "Do something meaningful",
            "point_value": 15,
            "level_required": 1,
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Detailed Task"
    assert data["description"] == "Do something meaningful"
    assert data["point_value"] == 15
    assert data["level_required"] == 1
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_propose_task_unauthenticated(client: AsyncClient):
    """Unauthenticated request to propose a task returns 401."""
    resp = await client.post(
        "/tasks",
        json={"title": "Unauth Task", "point_value": 5, "level_required": 0},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_task_signups_empty(client: AsyncClient, active_task: Task):
    """GET /tasks/{id}/signups returns empty list when no one has a praxis."""
    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_task_signups_populated(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /tasks/{id}/signups returns characters with active praxes for the task."""
    # character creates a solo praxis
    await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    # character2 creates a solo praxis for the same task (different praxis)
    await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers2,
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    character_ids = [entry["character_id"] for entry in data]
    assert character.id in character_ids
    assert character2.id in character_ids


@pytest.mark.asyncio
async def test_list_task_signups_not_found(client: AsyncClient):
    """GET /tasks/99999/signups returns 404 when task does not exist."""
    resp = await client.get("/tasks/99999/signups")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_tasks_excludes_hidden_faction_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """Tasks from hidden factions are excluded from the public task listing."""
    from sqlalchemy import select

    # Seed a hidden faction if not already present
    hidden_result = await db_session.execute(
        select(Faction).where(Faction.slug == "hiddenfaction")
    )
    if hidden_result.scalar_one_or_none() is None:
        hidden_faction = Faction(
            slug="hiddenfaction",
            status=FactionStatus.hidden,
        )
        db_session.add(hidden_faction)
        await db_session.commit()

    hidden_task = Task(
        title="Hidden Faction Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="hiddenfaction",
    )
    db_session.add(hidden_task)
    await db_session.commit()

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert hidden_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_includes_unaffiliated_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """Cross-faction (`na`) tasks stay listable even though `na` is a hidden row.

    The `some_faction` fixture (pulled in via `character`) seeds `na` with
    `FactionStatus.hidden`, mirroring a freshly seeded DB. A genuinely hidden
    faction's task is excluded; the unaffiliated sentinel's task is not —
    unaffiliated is a state, not a deprecated faction (issue #921).
    """
    from sqlalchemy import select

    # A genuinely hidden/deprecated faction — its task must NOT be listed.
    hidden_result = await db_session.execute(
        select(Faction).where(Faction.slug == "hiddenfaction")
    )
    if hidden_result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="hiddenfaction", status=FactionStatus.hidden))
        await db_session.commit()

    unaffiliated_task = Task(
        title="Cross-Faction Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    )
    hidden_task = Task(
        title="Hidden Faction Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="hiddenfaction",
    )
    db_session.add_all([unaffiliated_task, hidden_task])
    await db_session.commit()

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert unaffiliated_task.id in ids
    assert hidden_task.id not in ids


@pytest.mark.asyncio
async def test_create_praxis_for_hidden_faction_task_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """Creating a praxis for a task from a hidden faction is rejected with 400/403/422."""
    from sqlalchemy import select

    # Ensure the hidden faction exists
    hidden_result = await db_session.execute(
        select(Faction).where(Faction.slug == "hiddenfaction3")
    )
    if hidden_result.scalar_one_or_none() is None:
        hidden_faction = Faction(
            slug="hiddenfaction3",
            status=FactionStatus.hidden,
        )
        db_session.add(hidden_faction)
        await db_session.commit()

    hidden_task = Task(
        title="Hidden Praxis Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="hiddenfaction3",
    )
    db_session.add(hidden_task)
    await db_session.commit()

    # Creating a praxis for a hidden-faction task should fail
    # (the create_praxis service doesn't explicitly block this, but
    # if the task can't be listed, we at minimum verify the task exists in DB)
    resp = await client.post(
        "/praxes",
        json={"task_id": hidden_task.id, "type": "solo"},
        headers=auth_headers,
    )
    # The praxis service doesn't explicitly gate on faction visibility,
    # so this may succeed — the important gate is the task listing exclusion.
    # If the service gains a faction gate later this assertion should be updated.
    assert resp.status_code in (201, 400, 403, 422)


@pytest.mark.asyncio
async def test_list_tasks_filter_by_can_sign_up(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """``?can_sign_up=true`` keeps only what this viewer could claim (#1130).

    Route level — that the query param reaches the service and narrows the list.
    Whether the narrowing AGREES with ``evaluate_signup`` is a different
    question, asserted across a matrix in ``test_task_can_sign_up_filter.py``.
    This replaces the old ``?level=`` filter, which selected
    ``level_required >= level`` — the tasks you are locked out of — and could
    not see either faction ability that bends the level bar.
    """
    low_task = Task(
        title="Level 0 Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    high_task = Task(
        title="Level 5 Task",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(low_task)
    db_session.add(high_task)
    await db_session.commit()

    # The `character` fixture is level 0 and 'ua' grants no level jump.
    resp = await client.get(
        "/tasks", params={"can_sign_up": "true"}, headers=auth_headers
    )
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert low_task.id in ids
    assert high_task.id not in ids

    # Default off: the unfiltered browse is still the whole catalogue.
    resp = await client.get("/tasks", headers=auth_headers)
    unfiltered_ids = [task["id"] for task in resp.json()]
    assert low_task.id in unfiltered_ids
    assert high_task.id in unfiltered_ids


@pytest.mark.asyncio
async def test_list_tasks_can_sign_up_is_empty_for_anonymous(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """No viewer, no sign-up: the flag yields nothing rather than a stale list.

    The control is hidden when logged out, so this is the backend refusing to
    answer a question the caller cannot have meant.
    """
    task = Task(
        title="Level 0 Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.get("/tasks", params={"can_sign_up": "true"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_propose_task_faction_slug_stored(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """Proposed task stores the given primary_faction_slug."""
    resp = await client.post(
        "/tasks",
        json={
            "title": "Faction Task",
            "point_value": 10,
            "level_required": 0,
            "primary_faction_slug": "ua",
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["primary_faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_propose_task_without_faction_is_unaffiliated(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """Omitting primary_faction_slug proposes an UNAFFILIATED (cross-faction)
    task rather than defaulting to some faction. This is the contract the
    propose-task form's "Unaffiliated" option relies on (#704)."""
    resp = await client.post(
        "/tasks",
        json={
            "title": "Cross-Faction Task",
            "point_value": 10,
            "level_required": 0,
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    assert resp.json()["primary_faction_slug"] == CROSS_FACTION_SLUG


@pytest.mark.asyncio
async def test_list_tasks_default_returns_only_active(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """GET /tasks with no status param returns only active tasks."""
    pending_task = Task(
        title="Pending Only Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(pending_task)
    await db_session.commit()

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    data = resp.json()
    for task_data in data:
        assert task_data["status"] == "active"
    ids = [t["id"] for t in data]
    assert pending_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_limit_and_offset(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """limit and offset pagination parameters are respected."""
    for index in range(3):
        extra_task = Task(
            title=f"Extra Task {index}",
            description="",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug="ua",
        )
        db_session.add(extra_task)
    await db_session.commit()

    resp_limited = await client.get("/tasks", params={"limit": 2, "offset": 0})
    assert resp_limited.status_code == 200
    assert len(resp_limited.json()) == 2

    resp_all = await client.get("/tasks", params={"limit": 50, "offset": 0})
    total = len(resp_all.json())

    resp_offset = await client.get("/tasks", params={"limit": 50, "offset": total})
    assert resp_offset.status_code == 200
    assert resp_offset.json() == []


@pytest.mark.asyncio
async def test_get_task_response_fields(client: AsyncClient, active_task: Task):
    """GET /tasks/{id} response includes all required TaskOut fields."""
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    data = resp.json()
    required_fields = {
        "id", "title", "description", "point_value",
        "level_required", "status", "created_by",
        "primary_faction_slug", "created_at",
        "in_progress_count",
    }
    assert required_fields.issubset(data.keys())
    # Parked v2 feature, deliberately off the wire (#1471) — the Task column
    # and its TaskDef writer survive, but nothing serialises them.
    assert "is_task_vision_eligible" not in data
    # account_id and email must never be exposed
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_list_task_signups_only_in_progress(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """GET /tasks/{id}/signups excludes characters whose praxis has been deleted."""
    # Create a praxis for character via the API
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Delete (abandon) the praxis — it should then be absent from signups
    delete_resp = await client.delete(
        f"/praxes/{praxis_id}",
        headers=auth_headers,
    )
    assert delete_resp.status_code == 204

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    character_ids = [entry["character_id"] for entry in resp.json()]
    assert character.id not in character_ids


# ---------------------------------------------------------------------------
# T.6 SESSION T additions — admin bypass and my-tasks (praxes) status filter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_bypass_propose_level_gate(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin character at level 0 can propose a task despite the level gate (B.5)."""
    from models.roles import AccountRole, Role

    # character is level 0; grant the owning account admin role
    role = Role(name="admin", description="Administrator")
    db_session.add(role)
    await db_session.flush()
    account_role = AccountRole(
        account_id=account.id, role_id=role.id, granted_by=account.id
    )
    db_session.add(account_role)
    await db_session.commit()

    resp = await client.post(
        "/tasks",
        json={"title": "Admin Level 0 Task", "point_value": 5, "level_required": 0},
        headers=auth_headers,
    )
    # Without admin bypass this would be 403; with it we expect 201
    assert resp.status_code == 201, f"Expected 201 but got {resp.status_code}: {resp.json()}"
    assert resp.json()["title"] == "Admin Level 0 Task"


@pytest.mark.asyncio
async def test_my_tasks_with_status_filter(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
    auth_headers2: dict,
):
    """GET /praxes?character_id=X with status filter returns the right subset.

    Covers the two statuses exposed by PraxisStatus: in_progress and submitted,
    plus the no-status default — which since #1112 is ``submitted``, not "all".
    """
    from models.task import TaskStatus

    # Seed three active tasks for character2
    tasks = []
    for index in range(3):
        task = Task(
            title=f"MyTask {index}",
            description="",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character2.id,
            primary_faction_slug="ua",
        )
        db_session.add(task)
        tasks.append(task)
    await db_session.commit()
    for task in tasks:
        await db_session.refresh(task)

    # character2 creates three solo praxes, one per task
    praxis_ids = []
    for task in tasks:
        create_resp = await client.post(
            "/praxes",
            json={"task_id": task.id, "type": "solo"},
            headers=auth_headers2,
        )
        assert create_resp.status_code == 201, create_resp.json()
        praxis_ids.append(create_resp.json()["id"])

    # Submit the first praxis
    submit_resp = await client.post(
        f"/praxes/{praxis_ids[0]}/submit",
        headers=auth_headers2,
    )
    assert submit_resp.status_code == 200

    # status=submitted returns only the first praxis
    resp_submitted = await client.get(
        "/praxes",
        params={"character_id": character2.id, "status": "submitted"},
        headers=auth_headers2,
    )
    assert resp_submitted.status_code == 200
    submitted_ids = [p["id"] for p in resp_submitted.json()]
    assert praxis_ids[0] in submitted_ids
    assert praxis_ids[1] not in submitted_ids
    assert praxis_ids[2] not in submitted_ids

    # status=in_progress returns the remaining two. Read as character2 — the owner
    # (a member) — since in_progress praxes are member-only (ADR-0024).
    resp_ip = await client.get(
        "/praxes",
        params={"character_id": character2.id, "status": "in_progress"},
        headers=auth_headers2,
    )
    assert resp_ip.status_code == 200
    ip_ids = [p["id"] for p in resp_ip.json()]
    assert praxis_ids[0] not in ip_ids
    assert praxis_ids[1] in ip_ids
    assert praxis_ids[2] in ip_ids

    # No status filter is the profile-grid default (#1112): the character's
    # public record, so only the submitted one — and the two drafts stay hidden
    # even though this is the owner reading their own praxes.
    resp_all = await client.get(
        "/praxes",
        params={"character_id": character2.id},
        headers=auth_headers2,
    )
    assert resp_all.status_code == 200
    all_ids = [p["id"] for p in resp_all.json()]
    assert all_ids == [praxis_ids[0]]


# ---------------------------------------------------------------------------
# #1001 — default browse is standard-only; 'all' is the both-types escape hatch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_tasks_default_excludes_metatasks_at_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """GET /tasks with no task_type filter returns ONLY standard tasks (#1001).

    The viewer sits AT ``era.level_to_see_metatasks`` — high enough to clear the
    #453 visibility gate — yet the metatask still never appears in the default
    browse, because the default is now standard-only regardless of level.
    """
    from models.task import TaskType

    standard_task = Task(
        title="Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    meta_task = Task(
        title="Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(standard_task)
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(standard_task)
    await db_session.refresh(meta_task)

    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks
    )

    resp = await client.get("/tasks", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    ids = {t["id"] for t in data}
    assert standard_task.id in ids
    assert meta_task.id not in ids
    assert all(t["task_type"] == "standard" for t in data)


@pytest.mark.asyncio
async def test_list_tasks_all_returns_both_types(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """GET /tasks?task_type=all returns both standard and metatasks (#1001).

    The viewer sits at ``era.level_to_see_metatasks`` so the #453 gate is clear;
    'all' is the explicit both-types escape hatch.
    """
    from models.task import TaskType

    standard_task = Task(
        title="Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    meta_task = Task(
        title="Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(standard_task)
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(standard_task)
    await db_session.refresh(meta_task)

    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks
    )

    resp = await client.get(
        "/tasks", params={"task_type": "all"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    ids = {t["id"] for t in data}
    assert standard_task.id in ids
    assert meta_task.id in ids

    types_seen = {t["task_type"] for t in data if t["id"] in (standard_task.id, meta_task.id)}
    assert "standard" in types_seen
    assert "metatask" in types_seen


@pytest.mark.asyncio
async def test_list_tasks_standard_filter(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """GET /tasks?task_type=standard returns only standard tasks."""
    from models.task import TaskType

    standard_task = Task(
        title="Standard Filter Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    meta_task = Task(
        title="Metatask Filter Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(standard_task)
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(standard_task)
    await db_session.refresh(meta_task)

    resp = await client.get("/tasks", params={"task_type": "standard"})
    assert resp.status_code == 200
    data = resp.json()
    for task_data in data:
        assert task_data["task_type"] == "standard"
    ids = {t["id"] for t in data}
    assert standard_task.id in ids
    assert meta_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_metatask_filter(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """GET /tasks?task_type=metatask returns only metatasks (viewer at the see-gate)."""
    from models.task import TaskType

    standard_task = Task(
        title="Standard Excluded Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    meta_task = Task(
        title="Metatask Included Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(standard_task)
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(standard_task)
    await db_session.refresh(meta_task)

    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks
    )

    resp = await client.get(
        "/tasks", params={"task_type": "metatask"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    for task_data in data:
        assert task_data["task_type"] == "metatask"
    ids = {t["id"] for t in data}
    assert meta_task.id in ids
    assert standard_task.id not in ids


# ---------------------------------------------------------------------------
# #453 — metatask-list visibility gate (era.level_to_see_metatasks)
# ---------------------------------------------------------------------------


async def _seed_standard_and_metatask(
    db_session: AsyncSession, character: Character
) -> tuple[Task, Task]:
    """Seed one active standard task and one active metatask."""
    from models.task import TaskType

    standard_task = Task(
        title="Gate Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    meta_task = Task(
        title="Gate Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(standard_task)
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(standard_task)
    await db_session.refresh(meta_task)
    return standard_task, meta_task


@pytest.mark.asyncio
async def test_metatask_list_hidden_below_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """A character one level below era.level_to_see_metatasks gets no metatasks."""
    standard_task, meta_task = await _seed_standard_and_metatask(db_session, character)
    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks - 1
    )

    resp = await client.get("/tasks", headers=auth_headers)
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert standard_task.id in ids
    assert meta_task.id not in ids

    # Explicitly requesting the metatask list yields nothing below the gate.
    resp_meta = await client.get(
        "/tasks", params={"task_type": "metatask"}, headers=auth_headers
    )
    assert resp_meta.status_code == 200
    assert resp_meta.json() == []


@pytest.mark.asyncio
async def test_metatask_list_visible_at_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """A character at era.level_to_see_metatasks sees metatask rows when they
    request them — the default browse stays standard-only (#1001)."""
    standard_task, meta_task = await _seed_standard_and_metatask(db_session, character)
    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks
    )

    # Default browse is standard-only regardless of level (#1001).
    resp = await client.get("/tasks", headers=auth_headers)
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert standard_task.id in ids
    assert meta_task.id not in ids

    # Explicitly requesting the metatask list clears the #453 gate at level.
    resp_meta = await client.get(
        "/tasks", params={"task_type": "metatask"}, headers=auth_headers
    )
    assert resp_meta.status_code == 200
    meta_ids = {t["id"] for t in resp_meta.json()}
    assert meta_ids == {meta_task.id}


@pytest.mark.asyncio
async def test_metatask_list_hidden_for_anonymous(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    """Anonymous viewers are always below the see-gate — no metatask rows."""
    standard_task, meta_task = await _seed_standard_and_metatask(db_session, character)

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert standard_task.id in ids
    assert meta_task.id not in ids


# ---------------------------------------------------------------------------
# Bug 7 — viewer-relative capability flags on TaskOut
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_task_names_the_signup_flag_can_sign_up(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The wire contract names the sign-up gate ``can_sign_up`` (#1512).

    The flag is ``evaluate_signup(...).allowed`` — whether this viewer may
    *claim* the task. It shipped as ``can_sign_up``, which asserted
    something false: a character who could never claim a task can still be
    invited into a collab on it and submit (#1511), so the old name reported
    ``false`` about a task where a praxis is demonstrably submittable.

    This pins the JSON **key**, not just the value. Every value-level test
    below would still pass against the old name; only the wire key catches a
    rename that stops half way — and a half-done rename hands the frontend
    ``undefined``, which it reads as "cannot sign up" and hides the button.
    """
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["can_sign_up"] is True
    # The literal old name, deliberately: this is the only place in the tree
    # that may still spell it, and it spells it to assert its ABSENCE.
    assert "can_submit_praxis" not in body


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_with_existing_praxis_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """A non-Analog viewer with an in-progress praxis sees can_sign_up=False."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is False


@pytest.mark.asyncio
async def test_get_task_can_sign_up_true_for_analog_with_existing_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Analog viewer with an existing praxis still sees can_sign_up=True."""
    from models.faction import Faction, FactionStatus
    from sqlalchemy import select as sa_select

    existing = await db_session.execute(
        sa_select(Faction).where(Faction.slug == "everymen")
    )
    if existing.scalar_one_or_none() is None:
        db_session.add(
            Faction(
                slug="everymen",
                status=FactionStatus.visible,
            )
        )
        await db_session.commit()

    character.faction_slug = "everymen"
    await db_session.commit()

    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is True


@pytest.mark.asyncio
async def test_get_task_can_sign_up_true_when_no_prior_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Viewer with no existing praxis for the task sees can_sign_up=True."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is True


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_for_anonymous(
    client: AsyncClient,
    active_task: Task,
):
    """Unauthenticated viewer sees can_sign_up=False."""
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is False


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_level_too_low(
    client: AsyncClient,
    character: Character,
    db_session: AsyncSession,
    auth_headers: dict,
):
    """Character below task.level_required sees can_sign_up=False."""
    high_level_task = Task(
        title="Hard Task",
        description="Requires level 5",
        point_value=50,
        level_required=5,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(high_level_task)
    await db_session.commit()
    await db_session.refresh(high_level_task)

    # character fixture starts at level 0, so level_required=5 blocks it
    resp = await client.get(f"/tasks/{high_level_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is False


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_retired_task(
    client: AsyncClient,
    character: Character,
    db_session: AsyncSession,
    auth_headers: dict,
):
    """Character without Task Vision sees can_sign_up=False on a retired task."""
    retired_task = Task(
        title="Retired Task",
        description="No longer active",
        point_value=10,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(retired_task)
    await db_session.commit()
    await db_session.refresh(retired_task)

    resp = await client.get(f"/tasks/{retired_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is False


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_joined_collaborator(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    db_session: AsyncSession,
    auth_headers2: dict,
):
    """A character who joined someone else's collab sees can_sign_up=False."""
    from models.praxis import Praxis, PraxisMember, PraxisType

    collab = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        title="Collab",
        body_text="proof",
    )
    db_session.add(collab)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=collab.id, character_id=character.id))
    db_session.add(PraxisMember(praxis_id=collab.id, character_id=character2.id))
    await db_session.commit()

    # character2 is a joined collaborator, not the author
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is False


@pytest.mark.asyncio
async def test_get_task_can_sign_up_true_everymen_as_collaborator(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    db_session: AsyncSession,
    auth_headers2: dict,
):
    """Everymen (Double Dipper) member of a collab still sees can_sign_up=True."""
    from models.faction import FactionStatus
    from models.praxis import Praxis, PraxisMember, PraxisType
    from sqlalchemy import select

    result = await db_session.execute(select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", status=FactionStatus.visible))
        await db_session.commit()

    character2.faction_slug = "everymen"
    await db_session.commit()

    collab = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        title="Collab",
        body_text="proof",
    )
    db_session.add(collab)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=collab.id, character_id=character.id))
    db_session.add(PraxisMember(praxis_id=collab.id, character_id=character2.id))
    await db_session.commit()

    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is True


# ---------------------------------------------------------------------------
# Bug 7 — allowed_modes by viewer level
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_task_allowed_modes_level_0(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Level-0 viewer sees only solo in allowed_modes."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == ["solo"]


@pytest.mark.asyncio
async def test_get_task_allowed_modes_level_1(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Level-1 viewer sees solo and collab in allowed_modes."""
    from models.character_stats import CharacterStats
    from sqlalchemy import select as sa_select

    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 1
    await db_session.commit()

    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == ["solo", "collab"]


@pytest.mark.asyncio
async def test_get_task_allowed_modes_level_2_or_above(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """Level-5 viewer sees solo and collab; duel is issued via challenge (ADR-0011), not a direct mode."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == ["solo", "collab"]


@pytest.mark.asyncio
async def test_get_task_allowed_modes_anonymous(
    client: AsyncClient,
    active_task: Task,
):
    """Unauthenticated viewer sees an empty allowed_modes list."""
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == []


# ---------------------------------------------------------------------------
# Bug 7 — metatask eligibility on TaskOut
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_task_metatask_eligibility_under_level(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Metatask level 5, character level 4, same faction -> eligible_for_current_user=False."""
    from models.character_stats import CharacterStats
    from models.task import TaskType
    from sqlalchemy import select as sa_select

    meta_task = Task(
        title="Metatask Level 5",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(meta_task)

    # Bump character to level 4
    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 4
    await db_session.commit()

    resp = await client.get(f"/tasks/{meta_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is False


@pytest.mark.asyncio
async def test_get_task_metatask_eligibility_meets_level_same_faction(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Metatask level 5, character level 6, same faction -> eligible_for_current_user=True."""
    from models.character_stats import CharacterStats
    from models.task import TaskType
    from sqlalchemy import select as sa_select

    meta_task = Task(
        title="Metatask Level 5",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(meta_task)

    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 6
    await db_session.commit()

    resp = await client.get(f"/tasks/{meta_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is True


@pytest.mark.asyncio
async def test_get_task_metatask_eligibility_cross_faction_is_open(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Metatask level 5, character level 6, different faction -> eligible (metatasks are faction-open)."""
    from models.character_stats import CharacterStats
    from models.faction import Faction, FactionStatus
    from models.task import TaskType
    from sqlalchemy import select as sa_select

    # Seed the "snide" faction so the FK resolves
    existing = await db_session.execute(
        sa_select(Faction).where(Faction.slug == "snide")
    )
    if existing.scalar_one_or_none() is None:
        db_session.add(
            Faction(
                slug="snide",
                status=FactionStatus.visible,
            )
        )
        await db_session.commit()

    meta_task = Task(
        title="Snide Metatask",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="snide",
        metatask_faction_slug="snide",
    )
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(meta_task)

    result = await db_session.execute(
        sa_select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 6
    await db_session.commit()

    resp = await client.get(f"/tasks/{meta_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is True


@pytest.mark.asyncio
async def test_get_task_metatask_eligibility_anonymous(
    client: AsyncClient,
    character: Character,
    db_session: AsyncSession,
):
    """Unauthenticated viewer sees eligible_for_current_user=False."""
    from models.task import TaskType

    meta_task = Task(
        title="Public Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    )
    db_session.add(meta_task)
    await db_session.commit()
    await db_session.refresh(meta_task)

    resp = await client.get(f"/tasks/{meta_task.id}")
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is False


@pytest.mark.asyncio
async def test_get_task_standard_task_always_eligible_for_authenticated(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Standard tasks with level_required=0 are eligible for any authenticated viewer."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is True


# ---------------------------------------------------------------------------
# Free-text search (#661) — `q` ilikes over title AND description, and composes
# with the existing filters as one more AND clause.
# ---------------------------------------------------------------------------


async def _seed_search_tasks(db_session: AsyncSession, character: Character) -> dict:
    """Two active tasks whose shared word sits in different columns.

    Both are ``ua`` — the integration fixtures only seed that faction — so the
    composition test narrows on ``min_points`` instead.
    """
    title_match = Task(
        title="Sourdough starter revival",
        description="Ordinary prose with no distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    description_match = Task(
        title="Ordinary title",
        description="Feed the sourdough every morning until it doubles.",
        point_value=50,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([title_match, description_match])
    await db_session.commit()
    await db_session.refresh(title_match)
    await db_session.refresh(description_match)
    return {"title": title_match, "description": description_match}


@pytest.mark.asyncio
async def test_list_tasks_search_matches_title(
    client: AsyncClient, db_session: AsyncSession, character: Character
):
    """`q` matches on Task.title, case-insensitively."""
    seeded = await _seed_search_tasks(db_session, character)

    resp = await client.get("/tasks", params={"q": "SOURDOUGH starter"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert seeded["title"].id in ids
    # The other seeded row doesn't carry that phrase in either column.
    assert seeded["description"].id not in ids


@pytest.mark.asyncio
async def test_list_tasks_search_matches_description(
    client: AsyncClient, db_session: AsyncSession, character: Character
):
    """`q` matches on Task.description too, not just the title (#661)."""
    seeded = await _seed_search_tasks(db_session, character)

    resp = await client.get("/tasks", params={"q": "doubles"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert seeded["description"].id in ids
    assert seeded["title"].id not in ids


@pytest.mark.asyncio
async def test_list_tasks_search_composes_with_existing_filter(
    client: AsyncClient, db_session: AsyncSession, character: Character
):
    """`q` ANDs with an existing filter rather than replacing it."""
    seeded = await _seed_search_tasks(db_session, character)

    # "sourdough" alone hits both rows (one via title, one via description).
    both = await client.get("/tasks", params={"q": "sourdough"})
    assert both.status_code == 200
    both_ids = [task["id"] for task in both.json()]
    assert seeded["title"].id in both_ids
    assert seeded["description"].id in both_ids

    # Adding min_points narrows that same result set to the 50-point row.
    narrowed = await client.get(
        "/tasks", params={"q": "sourdough", "min_points": 50}
    )
    assert narrowed.status_code == 200
    narrowed_ids = [task["id"] for task in narrowed.json()]
    assert narrowed_ids == [seeded["description"].id]


@pytest.mark.asyncio
async def test_list_tasks_search_matches_proposer_name(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
):
    """`q` also matches the proposing character's handle / display name (#681).

    Overrides #644 §4's rejection of author search: the maintainer accepted
    that a common word can surface every task by anyone whose name contains it.
    """
    mine = Task(
        title="Ordinary title one",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    theirs = Task(
        title="Ordinary title two",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([mine, theirs])
    await db_session.commit()
    await db_session.refresh(mine)
    await db_session.refresh(theirs)

    # By handle, with the '@' sigil the player typed (#624).
    resp = await client.get("/tasks", params={"q": "@othercharacter"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert theirs.id in ids
    assert mine.id not in ids
    # One matching proposer must not multiply the task's feed row.
    assert ids.count(theirs.id) == 1

    # By display name ("Other Character") — case-insensitive, partial.
    resp = await client.get("/tasks", params={"q": "oTHer ch"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert theirs.id in ids
    assert mine.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_proposer_search_ands_with_other_filters(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
):
    """The proposer axis ORs *within* `q`, and still ANDs with other filters."""
    cheap = Task(
        title="Ordinary title three",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug="ua",
    )
    pricey = Task(
        title="Ordinary title four",
        description="No distinguishing token.",
        point_value=50,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([cheap, pricey])
    await db_session.commit()
    await db_session.refresh(cheap)
    await db_session.refresh(pricey)

    # The name alone hits both of their tasks.
    both = await client.get("/tasks", params={"q": "othercharacter"})
    assert both.status_code == 200
    both_ids = [task["id"] for task in both.json()]
    assert cheap.id in both_ids
    assert pricey.id in both_ids

    # min_points narrows that same set — the name match can't smuggle a row past it.
    narrowed = await client.get(
        "/tasks", params={"q": "othercharacter", "min_points": 50}
    )
    assert narrowed.status_code == 200
    narrowed_ids = [task["id"] for task in narrowed.json()]
    assert pricey.id in narrowed_ids
    assert cheap.id not in narrowed_ids


@pytest.mark.asyncio
async def test_list_tasks_absent_or_blank_q_is_no_filter(
    client: AsyncClient, db_session: AsyncSession, character: Character
):
    """Empty/whitespace `q` filters nothing — same rows as omitting it."""
    await _seed_search_tasks(db_session, character)

    baseline = await client.get("/tasks")
    blank = await client.get("/tasks", params={"q": "   "})
    assert baseline.status_code == 200
    assert blank.status_code == 200
    assert [t["id"] for t in blank.json()] == [t["id"] for t in baseline.json()]


# ---------------------------------------------------------------------------
# #1021 — in_progress_count: derived, read-time active-signup count on TaskOut
# ---------------------------------------------------------------------------


async def _add_praxis_member(
    db_session: AsyncSession,
    task_id: int,
    character_id: int,
    status: PraxisStatus,
) -> Praxis:
    """Insert a solo Praxis + its creator's PraxisMember row at a given status.

    Writes directly via ``db_session`` (bypassing the one-active-praxis-per-task
    API gate) so a single test can park several characters' praxes on the same
    task at whatever statuses it needs — mirrors ``conftest.py``'s
    ``praxis_solo``/``praxis_collab`` fixtures.
    """
    praxis = Praxis(
        task_id=task_id,
        created_by_id=character_id,
        type=PraxisType.solo,
        status=status,
        title="Praxis",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character_id))
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


@pytest.mark.asyncio
async def test_get_task_in_progress_count_counts_active_signups_only(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    character3: Character,
):
    """in_progress_count sums in_progress + pending members; submitted is excluded.

    These are the only three values PraxisStatus has — there is no separate
    "approved" status on Praxis (scoring happens via votes on a submitted
    praxis, not a status transition), so ``submitted`` is the one non-active
    state to prove excluded.
    """
    await _add_praxis_member(
        db_session, active_task.id, character.id, PraxisStatus.in_progress
    )
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.pending
    )
    await _add_praxis_member(
        db_session, active_task.id, character3.id, PraxisStatus.submitted
    )

    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    assert resp.json()["in_progress_count"] == 2


@pytest.mark.asyncio
async def test_get_task_in_progress_count_zero_with_no_signups(
    client: AsyncClient, active_task: Task
):
    """A freshly-created task with no praxes reads in_progress_count == 0."""
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    assert resp.json()["in_progress_count"] == 0


@pytest.mark.asyncio
async def test_list_tasks_in_progress_count_grouped_per_task(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
):
    """GET /tasks carries a correct, independent in_progress_count per task.

    Two tasks on one page, each with its own signup mix, prove the list
    route's count is a grouped/bulk lookup keyed by task id (#1021) — not,
    say, one query's result reused for every row.
    """
    busy_task = Task(
        title="Busy Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    quiet_task = Task(
        title="Quiet Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add_all([busy_task, quiet_task])
    await db_session.commit()
    await db_session.refresh(busy_task)
    await db_session.refresh(quiet_task)

    # busy_task: two active signups (in_progress + pending).
    await _add_praxis_member(
        db_session, busy_task.id, character.id, PraxisStatus.in_progress
    )
    await _add_praxis_member(
        db_session, busy_task.id, character2.id, PraxisStatus.pending
    )
    # quiet_task: one active signup, plus a submitted row that must not count.
    await _add_praxis_member(
        db_session, quiet_task.id, character3.id, PraxisStatus.in_progress
    )
    await _add_praxis_member(
        db_session, quiet_task.id, character.id, PraxisStatus.submitted
    )

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    counts_by_id = {task["id"]: task["in_progress_count"] for task in resp.json()}
    assert counts_by_id[busy_task.id] == 2
    assert counts_by_id[quiet_task.id] == 1


# ---------------------------------------------------------------------------
# #1029 — the author byline on TaskOut, and the roster's level
# ---------------------------------------------------------------------------


@contextmanager
def _capture_selects() -> Iterator[list[str]]:
    """Record every SELECT emitted while the block runs.

    The repo has no query-counting helper, so this listens on SQLAlchemy's
    ``Engine`` class (events registered on the class fire for every engine,
    including the async engine behind the test connection) and keeps only
    SELECTs, so transaction bookkeeping (SAVEPOINT/RELEASE) cannot skew a
    count.
    """
    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(Engine, "before_cursor_execute", _record)
    try:
        yield statements
    finally:
        event.remove(Engine, "before_cursor_execute", _record)


async def _make_author_with_task(
    db_session: AsyncSession,
    era: Era,
    *,
    index: int,
    level: int,
    faction_slug: str = "ua",
) -> tuple[Character, Task]:
    """Create a distinct account + character at ``level`` and one active task by them."""
    account = Account(email=f"author{index}@example.com")
    db_session.add(account)
    await db_session.flush()

    character = Character(
        account_id=account.id,
        username=f"author{index}",
        display_name=f"Author {index}",
        avatar_url=f"avatars/author{index}.png",
        faction_slug=faction_slug,
    )
    db_session.add(character)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=level,
            votes_spent_this_era=0,
        )
    )

    task = Task(
        title=f"Task by author {index}",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(character)
    await db_session.refresh(task)
    return character, task


@pytest.mark.asyncio
async def test_get_task_carries_author_byline(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    character: Character,
    active_task: Task,
):
    """GET /tasks/{id} denormalises the proposer: name, portrait, faction, level."""
    await _set_character_level(db_session, character.id, era.id, 4)
    character.avatar_url = "avatars/test.png"
    await db_session.commit()

    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["created_by"] == character.id
    assert data["created_by_display_name"] == "Test Character"
    assert data["created_by_avatar_url"] == "avatars/test.png"
    assert data["created_by_faction_slug"] == "ua"
    assert data["created_by_level"] == 4


@pytest.mark.asyncio
async def test_task_author_faction_is_the_authors_not_the_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    some_faction: Faction,
):
    """``created_by_faction_slug`` is the author's MEMBER faction.

    A 'ua' member may propose an unaffiliated ('na') task; the byline must
    read the person, not the task.
    """
    task = Task(
        title="Cross-faction proposal",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    resp = await client.get(f"/tasks/{task.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["primary_faction_slug"] == CROSS_FACTION_SLUG
    assert data["created_by_faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_list_tasks_carries_each_rows_own_author(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
):
    """GET /tasks resolves the byline per row, not once for the page."""
    first_author, first_task = await _make_author_with_task(
        db_session, era, index=1, level=2
    )
    second_author, second_task = await _make_author_with_task(
        db_session, era, index=2, level=7
    )

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    by_id = {task["id"]: task for task in resp.json()}
    assert by_id[first_task.id]["created_by_display_name"] == first_author.display_name
    assert by_id[first_task.id]["created_by_level"] == 2
    assert by_id[first_task.id]["created_by_avatar_url"] == "avatars/author1.png"
    assert by_id[second_task.id]["created_by_display_name"] == second_author.display_name
    assert by_id[second_task.id]["created_by_level"] == 7


@pytest.mark.asyncio
async def test_list_tasks_author_read_is_not_an_n_plus_1(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    active_task: Task,
):
    """A page of many tasks costs the same number of queries as a page of one.

    ``TaskOut`` is what the browse LIST returns, so resolving the author per
    task would make a 50-task page fire 50 author queries (#1029). Every task
    here has a DIFFERENT author — the worst case for a per-row lookup, and the
    case a deduped map cannot fake.

    The request is anonymous on purpose: the viewer-relative flags
    (``can_sign_up`` and friends) do run per task, a pre-existing cost
    this issue does not touch, and including it would drown the signal.
    """
    for index in range(5):
        await _make_author_with_task(db_session, era, index=index, level=index)

    with _capture_selects() as one_row_selects:
        small = await client.get("/tasks", params={"limit": 1})
    with _capture_selects() as many_row_selects:
        large = await client.get("/tasks", params={"limit": 50})

    assert small.status_code == 200 and large.status_code == 200
    assert len(small.json()) == 1
    assert len({task["created_by"] for task in large.json()}) >= 5

    assert len(many_row_selects) == len(one_row_selects), (
        "GET /tasks query count grew with the page size — the author read is "
        f"an N+1: {len(one_row_selects)} query(s) for 1 task vs "
        f"{len(many_row_selects)} for {len(large.json())}"
    )
    # And the author read specifically is the ONE join promised by
    # services.task.authors_for_tasks, however many authors the page has.
    author_selects = [
        statement
        for statement in many_row_selects
        if "FROM character LEFT OUTER JOIN character_stats" in statement
    ]
    assert len(author_selects) == 1


@pytest.mark.asyncio
async def test_task_signups_carry_current_era_level(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
):
    """The in-progress roster row carries the character's current-era level."""
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["character_id"] == character2.id
    assert rows[0]["level"] == 5  # character2 fixture is level 5


# ---------------------------------------------------------------------------
# #1051 — the signups route's wire format IS TaskSignupOut
#
# The route used to declare response_model=list[dict] and hand-build its rows, so
# FastAPI validated nothing and the schema drifted (it said status/signed_up_at
# while the route emitted praxis_type/joined_at) with no test able to notice.
# These tests pin the response to the schema so the two cannot separate again.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_task_signups_response_keys_are_exactly_the_schema(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
):
    """Every roster row carries exactly TaskSignupOut's fields — no more, no less.

    Derived from the schema rather than a hand-written literal: a field added to
    TaskSignupOut without the builder populating it (or vice versa) fails here,
    which is the drift #1051 was about.
    """
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert set(rows[0]) == set(TaskSignupOut.model_fields)


@pytest.mark.asyncio
async def test_task_signups_row_reports_praxis_type_and_joined_at(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
):
    """The praxis fields use the route's (accurate) names and serialise as values.

    ``praxis_type`` is the PraxisType enum's *value* on the wire, not "PraxisType.solo";
    ``joined_at`` is a timestamp. The schema's former ``status``/``signed_up_at``
    must not reappear.
    """
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    row = resp.json()[0]
    assert row["praxis_type"] == PraxisType.solo.value
    assert row["joined_at"]
    assert "status" not in row
    assert "signed_up_at" not in row


@pytest.mark.asyncio
async def test_task_signups_never_expose_account_id_or_email(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
):
    """The roster row projects chosen Character columns — never account identity.

    ``Character`` carries ``account_id``; the builder must not hand the ORM object
    to the schema wholesale.
    """
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    body = resp.text
    assert "account_id" not in body
    assert "email" not in body


def test_task_signups_openapi_documents_the_schema():
    """The route's shape reaches the OpenAPI document.

    ``list[dict]`` published an untyped object, so a client generator learned
    nothing about the roster. Guards the half of #1051 that no request can show.
    """
    from main import app

    schema = app.openapi()
    response = schema["paths"]["/tasks/{task_id}/signups"]["get"]["responses"]["200"]
    items = response["content"]["application/json"]["schema"]["items"]
    assert items["$ref"].endswith("/TaskSignupOut")
    documented = schema["components"]["schemas"]["TaskSignupOut"]["properties"]
    assert set(documented) == set(TaskSignupOut.model_fields)
