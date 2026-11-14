"""Integration tests for /tasks endpoints."""
from contextlib import contextmanager
from typing import Iterator

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession

# Task slugs use the cross-faction sentinel, not the unaffiliated one (#1559).
from faction_slugs import CROSS_FACTION_SLUG, real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from schemas.task import TaskSignupOut
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Any live faction other than the fixtures' default; derived, never named (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


async def _set_character_level(
    db_session: AsyncSession, character_id: int, era_id: int, level: int
) -> None:
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
    """character is level 0."""
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
    """character2 is level 5."""
    resp = await client.post(
        "/tasks",
        json={"title": "Good Task", "point_value": 10, "level_required": 0},
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["title"] == "Good Task"


@pytest.mark.asyncio
async def test_list_tasks_filter_by_status_active(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    retired = Task(
        title="Retired Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(retired)
    await db_session.commit()

    resp = await client.get("/tasks", params={"status": "active"})
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert active_task.id in ids
    assert retired.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_filter_by_status_all(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    pending_task = Task(
        title="Pending Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(pending_task)
    await db_session.commit()

    resp = await client.get("/tasks", params={"status": "all"})
    assert resp.status_code == 200
    data = resp.json()
    statuses = {t["status"] for t in data}
    assert "active" in statuses or "pending" in statuses


@pytest.mark.asyncio
async def test_list_tasks_filter_by_created_by(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """created_by: the creator's active + retired tasks, not pending (#419)."""
    retired_task = Task(
        title="Retired Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    pending_task = Task(
        title="Pending Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    other_task = Task(
        title="Other Creator Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add_all([retired_task, pending_task, other_task])
    await db_session.commit()

    resp = await client.get("/tasks", params={"created_by": character.id})
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert active_task.id in ids
    assert retired_task.id in ids
    assert pending_task.id not in ids  # hidden from all viewers
    assert other_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_filter_invalid_status(client: AsyncClient):
    resp = await client.get("/tasks", params={"status": "bogus_status"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_tasks_filter_by_min_max_points(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    # active_task has point_value=10
    cheap = Task(
        title="Cheap Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(cheap)
    await db_session.commit()

    resp_min = await client.get("/tasks", params={"min_points": 10})
    assert resp_min.status_code == 200
    ids_min = [t["id"] for t in resp_min.json()]
    assert active_task.id in ids_min
    assert cheap.id not in ids_min

    resp_max = await client.get("/tasks", params={"max_points": 9})
    assert resp_max.status_code == 200
    ids_max = [t["id"] for t in resp_max.json()]
    assert cheap.id in ids_max
    assert active_task.id not in ids_max


@pytest.mark.asyncio
async def test_list_tasks_filter_by_faction(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    other = Task(
        title="Other Faction Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=OTHER_FACTION_SLUG,
    )
    db_session.add(other)
    await db_session.commit()

    resp = await client.get("/tasks", params={"faction": DEFAULT_FACTION_SLUG})
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert active_task.id in ids
    assert other.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_filter_by_multiple_factions(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    some_faction: Faction,
):
    """Repeated ?faction= is a union; absent/empty filters nothing (#1364)."""
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
        primary_faction_slug=OTHER_FACTION_SLUG,
    )
    db_session.add_all([unaffiliated_task, ephemerist_task])
    await db_session.commit()

    both = await client.get(
        "/tasks", params={"faction": [DEFAULT_FACTION_SLUG, CROSS_FACTION_SLUG]}
    )
    assert both.status_code == 200
    both_ids = {t["id"] for t in both.json()}
    assert {active_task.id, unaffiliated_task.id} <= both_ids
    assert ephemerist_task.id not in both_ids
    assert {t["primary_faction_slug"] for t in both.json()} == {
        DEFAULT_FACTION_SLUG,
        CROSS_FACTION_SLUG,
    }

    one = await client.get("/tasks", params={"faction": DEFAULT_FACTION_SLUG})
    assert one.status_code == 200
    assert {t["primary_faction_slug"] for t in one.json()} == {DEFAULT_FACTION_SLUG}

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
    """Id tiebreak keeps both stable: one transaction shares created_at.

    Points rise with creation order so the level default can't pass for it.
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
                primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    """Level asc, points desc. Tasks.tsx sends no sort (#1364)."""
    high_level = Task(
        title="High Level Task",
        description="",
        point_value=30,
        level_required=2,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    cheap = Task(
        title="Cheap Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    rich = Task(
        title="Rich Task",
        description="",
        point_value=20,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    """A typo'd ?sort= must surface, not silently use the default (#1443).

    The absent half guards a route that rejects everything: Tasks.tsx sends none.
    """
    easy = Task(
        title="Easy Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    hard = Task(
        title="Hard Task",
        description="",
        point_value=50,
        level_required=3,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add_all([easy, hard])
    await db_session.commit()

    rejected = await client.get("/tasks", params={"sort": "most_liked"})
    assert rejected.status_code == 422

    absent = await client.get("/tasks")
    assert absent.status_code == 200
    absent_ids = [task["id"] for task in absent.json()]
    assert absent_ids.index(easy.id) < absent_ids.index(hard.id)
    assert absent_ids[0] != hard.id


@pytest.mark.asyncio
async def test_list_tasks_exclude_character_id(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get("/tasks", params={"exclude_character_id": character.id})
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert active_task.id not in ids


@pytest.mark.asyncio
async def test_list_tasks_is_the_same_list_for_every_reader(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Counts render off this call (#2264); the viewer exclusion is `can_sign_up`
    gate 5 (test_task_can_sign_up_filter.py)."""
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
    resp = await client.post(
        "/tasks",
        json={"title": "Unauth Task", "point_value": 5, "level_required": 0},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_task_signups_empty(client: AsyncClient, active_task: Task):
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
    await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
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
    resp = await client.get("/tasks/99999/signups")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_tasks_excludes_hidden_faction_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
):
    from sqlalchemy import select

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
    """Cross-faction (`na`) tasks stay listable though `na` is a hidden row (#921)."""
    from sqlalchemy import select

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
async def test_list_tasks_filter_by_can_sign_up(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """Route wiring only (#1130); parity with ``evaluate_signup`` is asserted in
    ``test_task_can_sign_up_filter.py``."""
    low_task = Task(
        title="Level 0 Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    high_task = Task(
        title="Level 5 Task",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    task = Task(
        title="Level 0 Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    resp = await client.post(
        "/tasks",
        json={
            "title": "Faction Task",
            "point_value": 10,
            "level_required": 0,
            "primary_faction_slug": DEFAULT_FACTION_SLUG,
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["primary_faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_propose_task_without_faction_is_unaffiliated(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """The propose form's "Unaffiliated" option relies on this (#704)."""
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
    pending_task = Task(
        title="Pending Only Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    for index in range(3):
        extra_task = Task(
            title=f"Extra Task {index}",
            description="",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    # Parked v2 feature, deliberately off the wire (#1471).
    assert "is_task_vision_eligible" not in data
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
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    delete_resp = await client.delete(
        f"/praxes/{praxis_id}",
        headers=auth_headers,
    )
    assert delete_resp.status_code == 204

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    character_ids = [entry["character_id"] for entry in resp.json()]
    assert character.id not in character_ids


@pytest.mark.asyncio
async def test_admin_bypass_propose_level_gate(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """B.5."""
    from models.roles import AccountRole, Role

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
    assert resp.status_code == 201, f"Expected 201 but got {resp.status_code}: {resp.json()}"
    assert resp.json()["title"] == "Admin Level 0 Task"


@pytest.mark.asyncio
async def test_my_tasks_with_status_filter(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
    auth_headers2: dict,
):
    """The no-status default is ``submitted``, not "all" (#1112)."""
    from models.task import TaskStatus

    tasks = []
    for index in range(3):
        task = Task(
            title=f"MyTask {index}",
            description="",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character2.id,
            primary_faction_slug=DEFAULT_FACTION_SLUG,
        )
        db_session.add(task)
        tasks.append(task)
    await db_session.commit()
    for task in tasks:
        await db_session.refresh(task)

    praxis_ids = []
    for task in tasks:
        create_resp = await client.post(
            "/praxes",
            json={"task_id": task.id, "type": "solo"},
            headers=auth_headers2,
        )
        assert create_resp.status_code == 201, create_resp.json()
        praxis_ids.append(create_resp.json()["id"])

    submit_resp = await client.post(
        f"/praxes/{praxis_ids[0]}/submit",
        headers=auth_headers2,
    )
    assert submit_resp.status_code == 200

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

    # Read as the owner: in_progress praxes are member-only (ADR-0024).
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

    # Drafts stay hidden even from the owner (#1112).
    resp_all = await client.get(
        "/praxes",
        params={"character_id": character2.id},
        headers=auth_headers2,
    )
    assert resp_all.status_code == 200
    all_ids = [p["id"] for p in resp_all.json()]
    assert all_ids == [praxis_ids[0]]


# #1001: default browse is standard-only; 'all' returns both types.


@pytest.mark.asyncio
async def test_list_tasks_default_excludes_metatasks_at_see_gate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    era,
):
    """Viewer clears the #453 see-gate; default still excludes metatasks."""
    from models.task import TaskType

    standard_task = Task(
        title="Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    meta_task = Task(
        title="Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    from models.task import TaskType

    standard_task = Task(
        title="Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    meta_task = Task(
        title="Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    from models.task import TaskType

    standard_task = Task(
        title="Standard Filter Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    meta_task = Task(
        title="Metatask Filter Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    from models.task import TaskType

    standard_task = Task(
        title="Standard Excluded Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    meta_task = Task(
        title="Metatask Included Task",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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


# #453: metatask-list visibility gate (era.level_to_see_metatasks).


async def _seed_standard_and_metatask(
    db_session: AsyncSession, character: Character
) -> tuple[Task, Task]:
    from models.task import TaskType

    standard_task = Task(
        title="Gate Standard Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    meta_task = Task(
        title="Gate Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    standard_task, meta_task = await _seed_standard_and_metatask(db_session, character)
    await _set_character_level(
        db_session, character.id, era.id, CURRENT_ERA.level_to_see_metatasks - 1
    )

    resp = await client.get("/tasks", headers=auth_headers)
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert standard_task.id in ids
    assert meta_task.id not in ids

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
    standard_task, meta_task = await _seed_standard_and_metatask(db_session, character)

    resp = await client.get("/tasks")
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert standard_task.id in ids
    assert meta_task.id not in ids


# Viewer-relative capability flags on TaskOut.


@pytest.mark.asyncio
async def test_get_task_names_the_signup_flag_can_sign_up(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Pins the JSON key (#1512): a half-done rename hands the frontend
    ``undefined``, read as "cannot sign up"."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["can_sign_up"] is True
    # The old name, spelled only here to assert its absence.
    assert "can_submit_praxis" not in body


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_with_existing_praxis_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
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
    from sqlalchemy import select as sa_select

    from models.faction import Faction, FactionStatus

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
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_sign_up"] is True


@pytest.mark.asyncio
async def test_get_task_can_sign_up_false_for_anonymous(
    client: AsyncClient,
    active_task: Task,
):
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
    high_level_task = Task(
        title="Hard Task",
        description="Requires level 5",
        point_value=50,
        level_required=5,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(high_level_task)
    await db_session.commit()
    await db_session.refresh(high_level_task)

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
    """Without Task Vision."""
    retired_task = Task(
        title="Retired Task",
        description="No longer active",
        point_value=10,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    """Double Dipper."""
    from sqlalchemy import select

    from models.faction import FactionStatus
    from models.praxis import Praxis, PraxisMember, PraxisType

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


@pytest.mark.asyncio
async def test_get_task_allowed_modes_level_0(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
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
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats

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
    """No duel: it is issued via challenge (ADR-0011)."""
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == ["solo", "collab"]


@pytest.mark.asyncio
async def test_get_task_allowed_modes_anonymous(
    client: AsyncClient,
    active_task: Task,
):
    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    assert resp.json()["allowed_modes"] == []


@pytest.mark.asyncio
async def test_get_task_metatask_eligibility_under_level(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.task import TaskType

    meta_task = Task(
        title="Metatask Level 5",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.task import TaskType

    meta_task = Task(
        title="Metatask Level 5",
        description="",
        point_value=5,
        level_required=5,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    """Metatasks are faction-open."""
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.faction import Faction, FactionStatus
    from models.task import TaskType

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
    from models.task import TaskType

    meta_task = Task(
        title="Public Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
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
    resp = await client.get(f"/tasks/{active_task.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["eligible_for_current_user"] is True


# Free-text search (#661): `q` ilikes title AND description, ANDed with filters.


async def _seed_search_tasks(db_session: AsyncSession, character: Character) -> dict:
    """Shared word in different columns. Only ``ua`` is seeded, so composition
    narrows on ``min_points``."""
    title_match = Task(
        title="Sourdough starter revival",
        description="Ordinary prose with no distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    description_match = Task(
        title="Ordinary title",
        description="Feed the sourdough every morning until it doubles.",
        point_value=50,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    seeded = await _seed_search_tasks(db_session, character)

    resp = await client.get("/tasks", params={"q": "SOURDOUGH starter"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert seeded["title"].id in ids
    assert seeded["description"].id not in ids


@pytest.mark.asyncio
async def test_list_tasks_search_matches_description(
    client: AsyncClient, db_session: AsyncSession, character: Character
):
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
    seeded = await _seed_search_tasks(db_session, character)

    both = await client.get("/tasks", params={"q": "sourdough"})
    assert both.status_code == 200
    both_ids = [task["id"] for task in both.json()]
    assert seeded["title"].id in both_ids
    assert seeded["description"].id in both_ids

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
    """#681; a common word surfacing everyone's tasks is accepted."""
    mine = Task(
        title="Ordinary title one",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    theirs = Task(
        title="Ordinary title two",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add_all([mine, theirs])
    await db_session.commit()
    await db_session.refresh(mine)
    await db_session.refresh(theirs)

    # '@' sigil as typed (#624).
    resp = await client.get("/tasks", params={"q": "@othercharacter"})
    assert resp.status_code == 200
    ids = [task["id"] for task in resp.json()]
    assert theirs.id in ids
    assert mine.id not in ids
    # The join must not multiply the row.
    assert ids.count(theirs.id) == 1

    # Display name, case-insensitive partial.
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
    """The proposer axis ORs within `q`, still ANDs with other filters."""
    cheap = Task(
        title="Ordinary title three",
        description="No distinguishing token.",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    pricey = Task(
        title="Ordinary title four",
        description="No distinguishing token.",
        point_value=50,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add_all([cheap, pricey])
    await db_session.commit()
    await db_session.refresh(cheap)
    await db_session.refresh(pricey)

    both = await client.get("/tasks", params={"q": "othercharacter"})
    assert both.status_code == 200
    both_ids = [task["id"] for task in both.json()]
    assert cheap.id in both_ids
    assert pricey.id in both_ids

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
    await _seed_search_tasks(db_session, character)

    baseline = await client.get("/tasks")
    blank = await client.get("/tasks", params={"q": "   "})
    assert baseline.status_code == 200
    assert blank.status_code == 200
    assert [t["id"] for t in blank.json()] == [t["id"] for t in baseline.json()]


# #1021: in_progress_count, a read-time active-signup count on TaskOut.


async def _add_praxis_member(
    db_session: AsyncSession,
    task_id: int,
    character_id: int,
    status: PraxisStatus,
) -> Praxis:
    """Solo Praxis + member at ``status``, bypassing the one-active-praxis gate."""
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
    """in_progress + pending count; submitted, the only other status, does not."""
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
    """The bulk count is keyed by task id, not one result reused (#1021)."""
    busy_task = Task(
        title="Busy Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    quiet_task = Task(
        title="Quiet Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add_all([busy_task, quiet_task])
    await db_session.commit()
    await db_session.refresh(busy_task)
    await db_session.refresh(quiet_task)

    await _add_praxis_member(
        db_session, busy_task.id, character.id, PraxisStatus.in_progress
    )
    await _add_praxis_member(
        db_session, busy_task.id, character2.id, PraxisStatus.pending
    )
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


# #1029: the author byline on TaskOut, and the roster's level.


@contextmanager
def _capture_selects() -> Iterator[list[str]]:
    """Record SELECTs only, so SAVEPOINT/RELEASE can't skew a count.

    Listens on the ``Engine`` class, which also fires for the async engine.
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
    faction_slug: str = DEFAULT_FACTION_SLUG,
) -> tuple[Character, Task]:
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
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    await _set_character_level(db_session, character.id, era.id, 4)
    character.avatar_url = "avatars/test.png"
    await db_session.commit()

    resp = await client.get(f"/tasks/{active_task.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["created_by"] == character.id
    assert data["created_by_display_name"] == "Test Character"
    assert data["created_by_avatar_url"] == "avatars/test.png"
    assert data["created_by_faction_slug"] == DEFAULT_FACTION_SLUG
    assert data["created_by_level"] == 4


@pytest.mark.asyncio
async def test_task_author_faction_is_the_authors_not_the_tasks(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    some_faction: Faction,
):
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
    assert data["created_by_faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_list_tasks_carries_each_rows_own_author(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
):
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
    """#1029. Distinct authors so a deduped map can't fake it; anonymous because
    the viewer flags run per task and would drown the signal."""
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
    # The one join in services.task.authors_for_tasks.
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
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["character_id"] == character2.id
    assert rows[0]["level"] == 5  # character2 fixture is level 5


# #1051: pin the signups response to TaskSignupOut so they cannot drift.


@pytest.mark.asyncio
async def test_task_signups_response_keys_are_exactly_the_schema(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
):
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
    """The builder must not hand the ORM Character to the schema wholesale."""
    await _add_praxis_member(
        db_session, active_task.id, character2.id, PraxisStatus.in_progress
    )

    resp = await client.get(f"/tasks/{active_task.id}/signups")
    body = resp.text
    assert "account_id" not in body
    assert "email" not in body


def test_task_signups_openapi_documents_the_schema():
    """The half of #1051 no request can show."""
    from main import app

    schema = app.openapi()
    response = schema["paths"]["/tasks/{task_id}/signups"]["get"]["responses"]["200"]
    items = response["content"]["application/json"]["schema"]["items"]
    assert items["$ref"].endswith("/TaskSignupOut")
    documented = schema["components"]["schemas"]["TaskSignupOut"]["properties"]
    assert set(documented) == set(TaskSignupOut.model_fields)
