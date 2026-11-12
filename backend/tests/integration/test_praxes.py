"""Integration tests for /praxes: solo CRUD, collab workflow, error cases.

No CharacterTask signup is needed first; create_praxis checks level and bank cap.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import ModerationStatus, Praxis, PraxisMember
from models.task import Task, TaskStatus, TaskType
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: A live-era faction other than the fixtures' default, derived not named (#2708).
#: The faction that may work RETIRED tasks, found by perk (#2708); era-owned, and
#: an era may give it to nobody. Sentinels dropped: a character cannot join them.
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


async def _make_metatask(db_session: AsyncSession, character: Character) -> Task:
    """Seed an active metatask row (a praxis seal, never a signup target)."""
    metatask = Task(
        title="Seal Metatask",
        description="",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        metatask_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(metatask)
    await db_session.commit()
    await db_session.refresh(metatask)
    return metatask


# Public list


@pytest.mark.asyncio
async def test_list_praxes_public(client: AsyncClient):
    resp = await client.get("/praxes")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# Solo praxis — create, read, filter


@pytest.mark.asyncio
async def test_create_solo_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    resp = await client.post(
        "/praxes",
        json={
            "task_id": active_task.id,
            "type": "solo",
            "title": "My Solo Praxis",
            "body_text": "I did the thing.",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["task_id"] == active_task.id
    assert data["type"] == "solo"
    assert data["status"] == "in_progress"
    assert data["title"] == "My Solo Praxis"
    assert data["moderation_status"] == "visible"
    assert len(data["members"]) == 1
    assert data["members"][0]["character_id"] == character.id
    assert data["members"][0]["has_submitted"] is False


@pytest.mark.asyncio
async def test_create_solo_praxis_on_metatask_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """A solo praxis against a metatask row is a 400 (#1001)."""
    metatask = await _make_metatask(db_session, character)
    resp = await client.post(
        "/praxes",
        json={"task_id": metatask.id, "type": "solo", "title": "Nope"},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_is_metatask.value
    assert "metatask" in detail["message"].lower()


@pytest.mark.asyncio
async def test_get_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Test Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # in_progress praxes are member-only (ADR-0024).
    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == praxis_id
    assert isinstance(data["members"], list)
    assert len(data["members"]) == 1


@pytest.mark.asyncio
async def test_get_nonexistent_praxis_returns_404(client: AsyncClient):
    resp = await client.get("/praxes/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_praxes_filter_by_task_id(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Filtered Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    for item in data:
        assert item["task_id"] == active_task.id


@pytest.mark.asyncio
async def test_list_praxes_filter_by_faction(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Praxis has no faction; ?faction= joins through Task.primary_faction_slug."""
    from models.faction import Faction, FactionStatus
    from models.task import TaskStatus

    # A second task in another faction; the faction row must exist for the FK.
    existing = await db_session.execute(
        select(Faction).where(Faction.slug == "wow")
    )
    if existing.scalar_one_or_none() is None:
        db_session.add(
            Faction(
                slug="wow",
                status=FactionStatus.visible,
            )
        )
        await db_session.commit()

    wow_task = Task(
        title="Wow Task",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="wow",
    )
    db_session.add(wow_task)
    await db_session.commit()
    await db_session.refresh(wow_task)

    ua_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "UA Praxis"},
        headers=auth_headers,
    )
    assert ua_resp.status_code == 201
    ua_praxis_id = ua_resp.json()["id"]

    wow_resp = await client.post(
        "/praxes",
        json={"task_id": wow_task.id, "type": "solo", "title": "Wow Praxis"},
        headers=auth_headers,
    )
    assert wow_resp.status_code == 201
    wow_praxis_id = wow_resp.json()["id"]

    ua_list = await client.get(
        "/praxes",
        params={"faction": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert ua_list.status_code == 200
    ua_ids = {item["id"] for item in ua_list.json()}
    assert ua_praxis_id in ua_ids
    assert wow_praxis_id not in ua_ids

    wow_list = await client.get("/praxes", params={"faction": "wow"}, headers=auth_headers)
    assert wow_list.status_code == 200
    wow_ids = {item["id"] for item in wow_list.json()}
    assert wow_praxis_id in wow_ids
    assert ua_praxis_id not in wow_ids


# Feed: sort + free-text search (#658)


async def _submitted_praxis(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    headers: dict,
    *,
    task_title: str,
    praxis_title: str,
    body_text: str = "",
    submitted_at: datetime,
    created_at: Optional[datetime] = None,
) -> int:
    """Create a task + a solo praxis on it, submit it, then pin its timestamps.

    Tests set the two timestamps in opposite orders so a wrong-column sort fails.
    ``created_at`` must be pinned: ``now()`` is transaction-start time and the
    whole test is one transaction, so unpinned rows tie.
    """
    task = Task(
        title=task_title,
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    create_resp = await client.post(
        "/praxes",
        json={
            "task_id": task.id,
            "type": "solo",
            "title": praxis_title,
            "body_text": body_text,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submit_resp.status_code == 200

    praxis = await db_session.get(Praxis, praxis_id)
    praxis.submitted_at = submitted_at
    if created_at is not None:
        praxis.created_at = created_at
    await db_session.commit()
    return praxis_id


@pytest.mark.asyncio
async def test_feed_sort_orders_by_submitted_at_not_created_at(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """?sort=newest|oldest orders on submitted_at, not created_at."""
    now = datetime.now(timezone.utc)
    ids = []
    for index in range(3):
        ids.append(
            await _submitted_praxis(
                client,
                db_session,
                character,
                auth_headers,
                task_title=f"Sort Task {index}",
                praxis_title=f"Sort Praxis {index}",
                # Inverted: created_at DESC and submitted_at DESC disagree.
                submitted_at=now - timedelta(days=index),
                created_at=now - timedelta(days=10 - index),
            )
        )

    # all_eras: the feed defaults to this era only (#1362).
    newest = await client.get(
        "/praxes",
        params={"status": "submitted", "sort": "newest", "era_scope": "all_eras"},
    )
    assert newest.status_code == 200
    newest_ids = [item["id"] for item in newest.json() if item["id"] in ids]
    assert newest_ids == ids  # praxis 0 sealed most recently

    oldest = await client.get(
        "/praxes",
        params={"status": "submitted", "sort": "oldest", "era_scope": "all_eras"},
    )
    assert oldest.status_code == 200
    oldest_ids = [item["id"] for item in oldest.json() if item["id"] in ids]
    assert oldest_ids == list(reversed(ids))


@pytest.mark.asyncio
async def test_list_praxes_without_sort_keeps_created_at_desc(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """No ``sort`` still gets created_at DESC (sidebar, task, profile share it)."""
    now = datetime.now(timezone.utc)
    ids = []
    for index in range(3):
        ids.append(
            await _submitted_praxis(
                client,
                db_session,
                character,
                auth_headers,
                task_title=f"Default Task {index}",
                praxis_title=f"Default Praxis {index}",
                submitted_at=now - timedelta(days=index),
                created_at=now - timedelta(days=10 - index),
            )
        )

    resp = await client.get(
        "/praxes", params={"status": "submitted", "era_scope": "all_eras"}
    )
    assert resp.status_code == 200
    got = [item["id"] for item in resp.json() if item["id"] in ids]
    assert got == list(reversed(ids))


@pytest.mark.asyncio
async def test_feed_search_matches_task_title(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """?q= matches the linked task's title, not just the praxis's own fields."""
    now = datetime.now(timezone.utc)
    match_id = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Sweep the Aqueduct",
        praxis_title="Untitled findings",
        submitted_at=now,
    )
    other_id = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Catalogue the Reliquary",
        praxis_title="Untitled findings",
        submitted_at=now,
    )

    resp = await client.get(
        "/praxes", params={"status": "submitted", "q": "aqueduct"}
    )
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert match_id in ids
    assert other_id not in ids


@pytest.mark.asyncio
async def test_feed_search_matches_praxis_title_and_body(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    now = datetime.now(timezone.utc)
    by_title = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Generic Task A",
        praxis_title="The Lantern Report",
        submitted_at=now,
    )
    by_body = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Generic Task B",
        praxis_title="Untitled",
        body_text="Found a lantern under the bridge.",
        submitted_at=now,
    )
    neither = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Generic Task C",
        praxis_title="Untitled",
        body_text="Nothing to report.",
        submitted_at=now,
    )

    resp = await client.get("/praxes", params={"status": "submitted", "q": "lantern"})
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert by_title in ids
    assert by_body in ids
    assert neither not in ids


@pytest.mark.asyncio
async def test_faction_and_search_combine(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """?faction=x&q=y works — the Task join is unconditional, never doubled."""
    now = datetime.now(timezone.utc)
    match_id = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Beacon Duty",
        praxis_title="Report",
        submitted_at=now,
    )

    resp = await client.get(
        "/praxes",
        params={
            "status": "submitted",
            "faction": DEFAULT_FACTION_SLUG,
            "q": "beacon",
            "sort": "newest",
        },
    )
    assert resp.status_code == 200
    assert match_id in {item["id"] for item in resp.json()}


@pytest.mark.asyncio
async def test_feed_search_matches_member_name(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """?q= also matches a member's handle and display name (#681)."""
    now = datetime.now(timezone.utc)
    theirs = await _submitted_praxis(
        client,
        db_session,
        character2,
        auth_headers2,
        task_title="Generic Task A",
        praxis_title="Untitled",
        submitted_at=now,
    )
    mine = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Generic Task B",
        praxis_title="Untitled",
        submitted_at=now,
    )

    # With the '@' sigil the player typed (#624).
    resp = await client.get(
        "/praxes", params={"status": "submitted", "q": "@othercharacter"}
    )
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert theirs in ids
    assert mine not in ids

    # Display name: case-insensitive, partial.
    resp = await client.get("/praxes", params={"status": "submitted", "q": "oTHer ch"})
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert theirs in ids
    assert mine not in ids


@pytest.mark.asyncio
async def test_feed_search_by_member_does_not_duplicate_rows(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Two matching members yield one row: the player axis is ``IN (subquery)``."""
    now = datetime.now(timezone.utc)
    praxis_id = await _submitted_praxis(
        client,
        db_session,
        character,
        auth_headers,
        task_title="Generic Task C",
        praxis_title="Untitled",
        submitted_at=now,
    )
    db_session.add(PraxisMember(praxis_id=praxis_id, character_id=character2.id))
    await db_session.commit()

    # "character" is a substring of BOTH usernames.
    resp = await client.get("/praxes", params={"status": "submitted", "q": "character"})
    assert resp.status_code == 200
    returned = [item["id"] for item in resp.json()]
    assert returned.count(praxis_id) == 1


@pytest.mark.asyncio
async def test_feed_search_by_member_ands_with_other_filters(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """The player axis is an OR within ?q=, still ANDed with other filters."""
    now = datetime.now(timezone.utc)
    theirs = await _submitted_praxis(
        client,
        db_session,
        character2,
        auth_headers2,
        task_title="Generic Task D",
        praxis_title="Untitled",
        submitted_at=now,
    )

    resp = await client.get(
        "/praxes",
        params={
            "status": "submitted",
            "q": "othercharacter",
            "faction": DEFAULT_FACTION_SLUG,
        },
    )
    assert resp.status_code == 200
    assert theirs in {item["id"] for item in resp.json()}

    resp = await client.get(
        "/praxes",
        params={"status": "submitted", "q": "othercharacter", "faction": "wow"},
    )
    assert resp.status_code == 200
    assert theirs not in {item["id"] for item in resp.json()}


@pytest.mark.asyncio
async def test_invalid_sort_returns_422(client: AsyncClient):
    resp = await client.get("/praxes", params={"sort": "sideways"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_in_progress_still_returns_null_submitted_at(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The submitted_at guard applies to status=submitted only (in-progress is NULL)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Still Drafting"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.get(
        "/praxes", params={"status": "in_progress"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert praxis_id in {item["id"] for item in resp.json()}


@pytest.mark.asyncio
async def test_submitted_praxis_with_null_seal_time_is_hidden(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A submitted praxis with no submitted_at is corrupt, and is not shown."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Corrupt Seal"},
        headers=auth_headers,
    )
    praxis_id = create_resp.json()["id"]
    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit_resp.status_code == 200

    praxis = await db_session.get(Praxis, praxis_id)
    praxis.submitted_at = None
    await db_session.commit()

    resp = await client.get("/praxes", params={"status": "submitted"})
    assert resp.status_code == 200
    assert praxis_id not in {item["id"] for item in resp.json()}


# Solo praxis — submit lifecycle


@pytest.mark.asyncio
async def test_submit_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Submit Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    assert data["status"] == "submitted"
    assert data["members"][0]["has_submitted"] is True


@pytest.mark.asyncio
async def test_submit_praxis_non_member_returns_403(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Non-member submit"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit_resp.status_code == 403


# Withdraw / resubmit


@pytest.mark.asyncio
async def test_withdraw_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Withdraw Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert withdraw_resp.status_code == 200
    data = withdraw_resp.json()
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_withdraw_updates_score(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Score Withdraw"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    score_after_submit = stats.score

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert withdraw_resp.status_code == 200

    await db_session.refresh(stats)
    assert stats.score <= score_after_submit


@pytest.mark.asyncio
async def test_submit_editing_withdraw_submit_roundtrip(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Roundtrip Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert withdraw_resp.status_code == 200
    assert withdraw_resp.json()["status"] == "in_progress"

    resubmit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert resubmit_resp.status_code == 200
    assert resubmit_resp.json()["status"] == "submitted"


@pytest.mark.asyncio
async def test_withdraw_already_in_progress_returns_422(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Double Withdraw"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_withdraw_wrong_owner_returns_403(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    character2: Character,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Others Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert resp.status_code == 403


# Delete


@pytest.mark.asyncio
async def test_delete_in_progress_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Delete Me"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis is None


# Bank cap


@pytest.mark.asyncio
async def test_create_praxis_bank_cap(
    client: AsyncClient,
    character2: Character,
    db_session: AsyncSession,
    auth_headers2: dict,
    era: Era,
):
    """POST /praxes at the bank cap (max_task_signups in-progress) returns 400."""
    from game_config import CURRENT_ERA
    from models.task import Task, TaskStatus

    cap = CURRENT_ERA.max_task_signups

    tasks = []
    for index in range(cap):
        task = Task(
            title=f"Bank Cap Task {index}",
            description="",
            point_value=1,
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

    for task in tasks:
        resp = await client.post(
            "/praxes",
            json={"task_id": task.id, "type": "solo"},
            headers=auth_headers2,
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.json()}"

    overflow_task = Task(
        title="Overflow Task",
        description="",
        point_value=1,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(overflow_task)
    await db_session.commit()
    await db_session.refresh(overflow_task)

    overflow_resp = await client.post(
        "/praxes",
        json={"task_id": overflow_task.id, "type": "solo"},
        headers=auth_headers2,
    )
    assert overflow_resp.status_code == 400


# Collab praxis — create, invite, respond, submit


@pytest.mark.asyncio
async def test_create_collab_praxis(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """Collab create: creator is first member (character2 is level 5)."""
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Our Collab"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "collab"
    assert data["status"] == "in_progress"
    member_ids = [m["character_id"] for m in data["members"]]
    assert character2.id in member_ids


@pytest.mark.asyncio
async def test_create_collab_praxis_on_metatask_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
    auth_headers2: dict,
):
    """A collab on a metatask row is a 400; the metatask gate fires first (#1001)."""
    metatask = await _make_metatask(db_session, character2)
    resp = await client.post(
        "/praxes",
        json={"task_id": metatask.id, "type": "collab", "title": "Nope"},
        headers=auth_headers2,
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_is_metatask.value
    assert "metatask" in detail["message"].lower()


@pytest.mark.asyncio
async def test_collab_invite_and_accept(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab Invite"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_data = invite_resp.json()
    assert invite_data["invitee_id"] == character.id
    assert invite_data["status"] == "pending"
    invite_id = invite_data["id"]

    respond_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert respond_resp.status_code == 200
    # The respond route answers an ack, not the praxis (#1383).
    assert respond_resp.json() == {"praxis_id": praxis_id, "accepted": True}

    praxis_resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert praxis_resp.status_code == 200
    member_ids = [m["character_id"] for m in praxis_resp.json()["members"]]
    assert character.id in member_ids
    assert character2.id in member_ids


@pytest.mark.asyncio
async def test_cancel_pending_invite(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The inviter rescinds a pending invite and the row is gone (#421)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Cancel Me"},
        headers=auth_headers2,
    )
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    invite_id = invite_resp.json()["id"]

    forbidden = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers
    )
    assert forbidden.status_code == 403

    ok = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers2
    )
    assert ok.status_code == 204
    gone = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers2
    )
    assert gone.status_code == 404


@pytest.mark.asyncio
async def test_any_member_can_rescind_a_pending_invite(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Rescinding is a member power, not an inviter one (#1415 §3, ADR-0013).

    The invitee is an outsider until they accept, and gets 403.
    """
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character3.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200, invite_resp.text
    invite_id = invite_resp.json()["id"]

    outsider = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers3
    )
    assert outsider.status_code == 403, outsider.text

    rescinded = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers
    )
    assert rescinded.status_code == 204, rescinded.text

    # Only that row is gone; the accepted invite is untouched.
    after = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    invites = after.json()["invites"]
    assert invite_id not in {invite["id"] for invite in invites}
    assert character3.id not in {invite["invitee_id"] for invite in invites}

    # Invites carry the INVITEE's display name only (#1387); this inviter has a
    # real name, so a leftover serializer would emit it.
    assert invites
    for invite in invites:
        assert "inviter_display_name" not in invite
        assert invite["invitee_display_name"]


@pytest.mark.asyncio
async def test_cannot_cancel_accepted_invite(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """An already-accepted invite cannot be rescinded → 409 (#421)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Accepted"},
        headers=auth_headers2,
    )
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    invite_id = invite_resp.json()["id"]

    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    conflict = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers2
    )
    assert conflict.status_code == 409


@pytest.mark.asyncio
async def test_collab_draft_visible_to_invitee_active_tasks(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """#386: a joined collaborator sees the shared draft in their active list
    (``character_id`` filters by membership, ADR-0013)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared Draft"},
        headers=auth_headers2,
    )
    praxis_id = create_resp.json()["id"]
    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    invite_id = invite_resp.json()["id"]
    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    invitee_list = await client.get(
        "/praxes",
        params={"character_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert invitee_list.status_code == 200
    assert praxis_id in [p["id"] for p in invitee_list.json()]

    creator_list = await client.get(
        "/praxes",
        params={"character_id": character2.id, "status": "in_progress"},
        headers=auth_headers2,
    )
    assert praxis_id in [p["id"] for p in creator_list.json()]


@pytest.mark.asyncio
async def test_list_praxes_member_id_filters_by_membership(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """#344/#349: ``member_id`` filters by PraxisMember, mirroring the slot count."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Member Filter Collab"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    collab_id = create_resp.json()["id"]
    invite_resp = await client.post(
        f"/praxes/{collab_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    invite_id = invite_resp.json()["id"]
    await client.post(
        f"/praxes/{collab_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    # A second task: one active membership per task.
    second_task = Task(
        title="Second Task",
        description="Another test task",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(second_task)
    await db_session.commit()
    await db_session.refresh(second_task)

    solo_resp = await client.post(
        "/praxes",
        json={"task_id": second_task.id, "type": "solo", "title": "Not Yours Solo"},
        headers=auth_headers2,
    )
    assert solo_resp.status_code == 201
    solo_id = solo_resp.json()["id"]

    member_list = await client.get(
        "/praxes",
        params={"member_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert member_list.status_code == 200
    member_ids = [p["id"] for p in member_list.json()]
    assert collab_id in member_ids
    assert solo_id not in member_ids

    # A non-member's id excludes the praxis even when the viewer can see it.
    non_member_list = await client.get(
        "/praxes",
        params={"member_id": character.id, "status": "in_progress"},
        headers=auth_headers2,
    )
    assert non_member_list.status_code == 200
    assert solo_id not in [p["id"] for p in non_member_list.json()]


@pytest.mark.asyncio
async def test_collab_invite_decline(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Decline Collab"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_id = invite_resp.json()["id"]

    respond_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": False},
        headers=auth_headers,
    )
    assert respond_resp.status_code == 200
    # Ack, not the praxis (#1383); `accepted` reports which way it went.
    assert respond_resp.json() == {"praxis_id": praxis_id, "accepted": False}

    praxis_resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert praxis_resp.status_code == 200
    member_ids = [m["character_id"] for m in praxis_resp.json()["members"]]
    assert character.id not in member_ids


@pytest.mark.asyncio
async def test_collab_all_submit_transitions_to_submitted(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "All Submit"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    invite_id = invite_resp.json()["id"]
    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    submit1 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit1.status_code == 200
    assert submit1.json()["status"] == "pending"

    submit2 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit2.status_code == 200
    assert submit2.json()["status"] == "submitted"


# Editing lives in the room (#1743): see ``test_praxis_room.py``.


# Collab co-ownership (ADR-0013): any member may edit / reopen / kick


async def _two_member_collab(
    client: AsyncClient,
    task: Task,
    creator_headers: dict,
    invitee_id: int,
    invitee_headers: dict,
) -> int:
    create_resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "Co-owned"},
        headers=creator_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": invitee_id},
        headers=creator_headers,
    )
    invite_id = invite_resp.json()["id"]
    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=invitee_headers,
    )
    return praxis_id




@pytest.mark.asyncio
async def test_collab_non_creator_can_reopen(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    submit2 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit2.json()["status"] == "submitted"

    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_collab_non_creator_can_kick_creator(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A non-creator member can kick the creator (ADR-0013)."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    resp = await client.post(
        f"/praxes/{praxis_id}/kick/{character2.id}", headers=auth_headers
    )
    assert resp.status_code == 200
    remaining = {m["character_id"] for m in resp.json()["members"]}
    assert character2.id not in remaining
    assert character.id in remaining


@pytest.mark.asyncio
async def test_kick_refused_on_submitted_collab(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Kicking is open-praxis only (#1076): a published collab refuses with 422.

    A kick resets to drafting, so it would silently unpublish. Reopen first.
    """
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    submit2 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit2.json()["status"] == "submitted"

    resp = await client.post(
        f"/praxes/{praxis_id}/kick/{character2.id}", headers=auth_headers
    )
    assert resp.status_code == 422

    after = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    data = after.json()
    assert data["status"] == "submitted"
    assert {m["character_id"] for m in data["members"]} == {character.id, character2.id}
    assert all(m["has_submitted"] for m in data["members"])


@pytest.mark.asyncio
async def test_kick_on_pending_collab_still_resets_casts(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A pending kick is still allowed and resets to drafting (ADR-0013, #1076)."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    opened = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert opened.json()["status"] == "pending"

    resp = await client.post(
        f"/praxes/{praxis_id}/kick/{character2.id}", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["submit_proposed_at"] is None
    assert {m["character_id"] for m in data["members"]} == {character.id}
    assert not any(m["has_submitted"] for m in data["members"])


# Collab lazy-consensus publish (ADR-0012)


@pytest.mark.asyncio
async def test_collab_partial_submit_opens_pending_window(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"          # not Live yet
    assert data["submit_proposed_at"] is not None   # countdown opened


@pytest.mark.asyncio
async def test_collab_all_submit_clears_window(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"
    assert data["submit_proposed_at"] is None


# Edits cancelling a proposal (ADR-0079): test_praxis_room.py,
# test_praxis_media_batch.py, test_collab_consensus.py.


@pytest.mark.asyncio
async def test_roster_row_carries_when_each_member_filed(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """``PraxisMemberOut.submitted_at`` (#1415): NULL, timestamp, NULL after reset.

    A "when they filed" that survived an unsubmit would be worse than none.
    """
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )

    before = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert all(m["submitted_at"] is None for m in before.json()["members"])

    filed = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    rows = {m["character_id"]: m for m in filed.json()["members"]}
    assert rows[character2.id]["has_submitted"] is True
    assert rows[character2.id]["submitted_at"] is not None
    assert rows[character.id]["submitted_at"] is None

    # NULL again on withdraw: a group action that clears both (ADR-0079).
    reset = await client.post(
        f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2
    )
    assert reset.status_code == 200, reset.text
    assert all(not m["has_submitted"] for m in reset.json()["members"])
    assert all(m["submitted_at"] is None for m in reset.json()["members"])


@pytest.mark.asyncio
async def test_collab_pending_window_auto_publishes_on_read(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Lazy-on-access: a lapsed pending window auto-publishes on the next read."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    # Backdate the window past era.collab_auto_submit_days.
    praxis = await db_session.get(Praxis, praxis_id)
    praxis.submit_proposed_at = datetime.now(timezone.utc) - timedelta(days=11)
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"           # silence = consent
    assert data["submit_proposed_at"] is None


@pytest.mark.asyncio
async def test_collab_leave_completes_consensus(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The only hold-out leaving makes the collab Live for those who stayed.

    Seal runs BEFORE the ADR-0060 one-member conversion; converting first would
    cancel the window and wipe the survivor's cast.
    """
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    resp = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"
    remaining = {m["character_id"] for m in data["members"]}
    assert remaining == {character2.id}
    # One member left: no longer a collaboration (ADR-0060).
    assert data["type"] == "solo"


@pytest.mark.asyncio
async def test_leave_non_member_returns_403(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Solo collab"},
        headers=auth_headers2,
    )
    praxis_id = create_resp.json()["id"]
    resp = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_solo_submit_opens_no_window(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """A solo praxis publishes immediately on submit (ADR-0012 scope)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Solo"},
        headers=auth_headers,
    )
    praxis_id = create_resp.json()["id"]
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"
    assert data["submit_proposed_at"] is None


# Change type (in-place solo↔collab, #321)


@pytest.mark.asyncio
async def test_change_type_to_duel_rejected(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "x"},
        headers=auth_headers2,
    )
    praxis_id = create_resp.json()["id"]
    resp = await client.post(
        f"/praxes/{praxis_id}/change-type",
        json={"type": "duel"},
        headers=auth_headers2,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_collab_cannot_issue_duel_challenge(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A duel side must be solo (ADR-0011) — a collab praxis can't challenge."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "crew"},
        headers=auth_headers2,
    )
    collab_id = create_resp.json()["id"]
    resp = await client.post(
        "/duels/challenge",
        json={"challenger_praxis_id": collab_id, "opponent_character_id": character.id},
        headers=auth_headers2,
    )
    assert resp.status_code == 422


# Moderation


@pytest.mark.asyncio
async def test_get_hidden_praxis_returns_404(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Hidden Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    praxis = await db_session.get(Praxis, praxis_id)
    praxis.moderation_status = ModerationStatus.hidden
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_praxes_excludes_hidden(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Hidden praxes are not listed.

    Submitted first so moderation is the only filter that can exclude it.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Will Be Hidden"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    resp_before = await client.get("/praxes", params={"character_id": character.id})
    assert praxis_id in [item["id"] for item in resp_before.json()]

    praxis = await db_session.get(Praxis, praxis_id)
    praxis.moderation_status = ModerationStatus.hidden
    await db_session.commit()

    resp = await client.get("/praxes", params={"character_id": character.id})
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert praxis_id not in ids


# R-rule coverage


@pytest.mark.asyncio
async def test_create_praxis_below_required_level_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    from models.task import Task, TaskStatus

    high_task = Task(
        title="Level 5 Only",
        description="",
        point_value=10,
        level_required=5,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(high_task)
    await db_session.commit()
    await db_session.refresh(high_task)

    resp = await client.post(
        "/praxes",
        json={"task_id": high_task.id, "type": "solo", "title": "Gate Test"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_level_too_low.value
    assert "5" in detail["message"]



# can_flag on PraxisOut (viewer-relative)


@pytest.mark.asyncio
async def test_get_praxis_can_flag_true_for_level_4_non_author(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Level-4 non-author sees ``can_flag == True`` (boundary)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Flag Me"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so the non-author can view it (ADR-0024).
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 4
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["can_flag"] is True


@pytest.mark.asyncio
async def test_get_praxis_can_flag_false_for_level_3_non_author(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Below Flag Level"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 3
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert resp.status_code == 200
    assert resp.json()["can_flag"] is False


@pytest.mark.asyncio
async def test_get_praxis_can_flag_false_for_author(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "My Own"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Above the level bar, so the self-author gate is what blocks.
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 7
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["can_flag"] is False


@pytest.mark.asyncio
async def test_get_praxis_can_flag_false_for_anonymous(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Public View"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    resp = await client.get(f"/praxes/{praxis_id}")
    assert resp.status_code == 200
    assert resp.json()["can_flag"] is False


# One-praxis-per-task guard (Analog carve-out)


@pytest.mark.asyncio
async def test_create_praxis_duplicate_blocked_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    first_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "First"},
        headers=auth_headers,
    )
    assert first_resp.status_code == 201

    second_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Second"},
        headers=auth_headers,
    )
    assert second_resp.status_code == 409
    detail = second_resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_already_active_member.value
    assert "already submitted" in detail["message"].lower()


@pytest.mark.asyncio
async def test_create_praxis_duplicate_allowed_for_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Analog characters may create multiple praxes for the same task (Double Dipper)."""
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

    first_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Analog First"},
        headers=auth_headers,
    )
    assert first_resp.status_code == 201

    second_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Analog Second"},
        headers=auth_headers,
    )
    assert second_resp.status_code == 201


@pytest.mark.asyncio
async def test_create_praxis_after_delete_allowed(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    first_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "First"},
        headers=auth_headers,
    )
    assert first_resp.status_code == 201
    praxis_id = first_resp.json()["id"]

    delete_resp = await client.delete(
        f"/praxes/{praxis_id}", headers=auth_headers
    )
    assert delete_resp.status_code == 204

    second_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Retry"},
        headers=auth_headers,
    )
    assert second_resp.status_code == 201


# Draft praxis creation (minimal body)


@pytest.mark.asyncio
async def test_create_praxis_minimal_body_starts_as_draft(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes with only task_id returns an in-progress draft.

    The frontend jumps from "sign up" straight into the editor.
    """
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["task_id"] == active_task.id
    assert data["type"] == "solo"
    assert data["status"] == "in_progress"
    assert data["title"] is None
    assert data["body_text"] == ""
    assert data["moderation_status"] == "visible"
    assert len(data["members"]) == 1
    assert data["members"][0]["character_id"] == character.id
    assert data["members"][0]["has_submitted"] is False
    assert data["media_items"] == []




@pytest.mark.asyncio
async def test_create_minimal_draft_blocks_duplicate_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    first_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert first_resp.status_code == 201

    second_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert second_resp.status_code == 409
    detail = second_resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_already_active_member.value
    assert "already submitted" in detail["message"].lower()


# Task-must-be-active gate (#165)


@pytest.mark.asyncio
@pytest.mark.parametrize("task_status", [TaskStatus.pending, TaskStatus.retired])
async def test_create_praxis_non_active_task_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    task_status: TaskStatus,
):
    task = Task(
        title="Not Open",
        description="",
        point_value=10,
        level_required=0,
        status=task_status,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Blocked Praxis"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_not_open_for_signup.value
    assert task_status.value in detail["message"].lower()


@pytest.mark.skipif(
    TASK_VISION_SLUG is None, reason="no faction in the live era holds Task Vision"
)
@pytest.mark.asyncio
async def test_create_praxis_retired_task_allowed_for_the_task_vision_faction(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    some_faction,
    auth_headers: dict,
):
    character.faction_slug = TASK_VISION_SLUG
    await db_session.commit()

    retired_task = Task(
        title="Task Vision Can Do This",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(retired_task)
    await db_session.commit()
    await db_session.refresh(retired_task)

    resp = await client.post(
        "/praxes",
        json={"task_id": retired_task.id, "type": "solo", "title": "Task Vision Praxis"},
        headers=auth_headers,
    )
    assert resp.status_code == 201


# PraxisCardOut: task_level_required, voter_count, submitted_at (#159)


@pytest.mark.asyncio
async def test_praxis_card_includes_new_fields(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Card Fields Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    list_resp = await client.get("/praxes", headers=auth_headers)
    assert list_resp.status_code == 200
    cards = list_resp.json()
    card = next((c for c in cards if c["id"] == praxis_id), None)
    assert card is not None

    assert "task_level_required" in card
    assert isinstance(card["task_level_required"], int)
    assert card["task_level_required"] == active_task.level_required

    assert card["voter_count"] == 0
    assert card["submitted_at"] is None


@pytest.mark.asyncio
async def test_submitted_at_set_on_submit(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "SubmittedAt Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    pre_list = await client.get("/praxes", headers=auth_headers)
    pre_card = next(c for c in pre_list.json() if c["id"] == praxis_id)
    assert pre_card["submitted_at"] is None

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    post_list = await client.get("/praxes")
    post_card = next(c for c in post_list.json() if c["id"] == praxis_id)
    assert post_card["submitted_at"] is not None


@pytest.mark.asyncio
async def test_voter_count_and_score_after_vote(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Vote Fields Test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 200

    list_resp = await client.get("/praxes")
    card = next(c for c in list_resp.json() if c["id"] == praxis_id)

    # Base carries the author's own-task modifier; votes are flat (ADR-0086).
    own = CURRENT_ERA.factions[character2.faction_slug].own_task_modifier
    assert card["voter_count"] == 1
    assert card["score"] == pytest.approx(active_task.point_value * own + 4)


# Active-membership gate (#183)


@pytest.mark.asyncio
async def test_joined_collaborator_blocked_from_resigning_up(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_id = invite_resp.json()["id"]

    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    signup_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Solo too"},
        headers=auth_headers,
    )
    assert signup_resp.status_code == 409


@pytest.mark.asyncio
async def test_in_progress_collab_member_cannot_be_invited_again(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.era import Era
    from services.auth import create_jwt

    era_row = (await db_session.execute(sa_select(Era))).scalar_one()

    acc3 = Account(email="collab-a-owner@example.com")
    db_session.add(acc3)
    await db_session.flush()
    ch3 = Character(
        account_id=acc3.id,
        username="collab_a_owner",
        display_name="Collab A Owner",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch3)
    await db_session.flush()
    db_session.add(CharacterStats(character_id=ch3.id, era_id=era_row.id, score=500, all_time_score=500, level=5, votes_spent_this_era=0))

    acc4 = Account(email="collab-b-owner@example.com")
    db_session.add(acc4)
    await db_session.flush()
    ch4 = Character(
        account_id=acc4.id,
        username="collab_b_owner",
        display_name="Collab B Owner",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch4)
    await db_session.flush()
    db_session.add(CharacterStats(character_id=ch4.id, era_id=era_row.id, score=500, all_time_score=500, level=5, votes_spent_this_era=0))

    await db_session.commit()
    await db_session.refresh(ch3)
    await db_session.refresh(ch4)
    headers3 = {"Authorization": f"Bearer {create_jwt(acc3.id)}"}
    headers4 = {"Authorization": f"Bearer {create_jwt(acc4.id)}"}

    create_a = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab A"},
        headers=headers3,
    )
    assert create_a.status_code == 201
    praxis_a_id = create_a.json()["id"]

    invite_a = await client.post(
        f"/praxes/{praxis_a_id}/invite",
        json={"invitee_id": character2.id},
        headers=headers3,
    )
    assert invite_a.status_code == 200
    await client.post(
        f"/praxes/{praxis_a_id}/invite/{invite_a.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers2,
    )

    create_b = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab B"},
        headers=headers4,
    )
    assert create_b.status_code == 201
    praxis_b_id = create_b.json()["id"]

    re_invite = await client.post(
        f"/praxes/{praxis_b_id}/invite",
        json={"invitee_id": character2.id},
        headers=headers4,
    )
    assert re_invite.status_code == 409
    detail = re_invite.json()["detail"]
    assert detail["code"] == ErrorCode.invite_target_has_active_praxis.value
    assert "active praxis" in detail["message"].lower()


@pytest.mark.asyncio
async def test_everymen_joined_collaborator_can_resign_up(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from sqlalchemy import select as sa_select

    from models.faction import Faction, FactionStatus

    result = await db_session.execute(sa_select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", status=FactionStatus.visible))
        await db_session.commit()

    character.faction_slug = "everymen"
    await db_session.commit()

    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_id = invite_resp.json()["id"]
    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    signup_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Also Solo"},
        headers=auth_headers,
    )
    assert signup_resp.status_code == 201


@pytest.mark.asyncio
async def test_everymen_can_be_invited_despite_active_collab(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.era import Era
    from models.faction import Faction, FactionStatus
    from services.auth import create_jwt

    result = await db_session.execute(sa_select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", status=FactionStatus.visible))
        await db_session.commit()

    character2.faction_slug = "everymen"
    await db_session.commit()

    era_row = (await db_session.execute(sa_select(Era))).scalar_one()

    acc_a = Account(email="everymen-test-a@example.com")
    acc_b = Account(email="everymen-test-b@example.com")
    db_session.add(acc_a)
    db_session.add(acc_b)
    await db_session.flush()
    ch_a = Character(
        account_id=acc_a.id,
        username="evmtest_a",
        display_name="EV Test A",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    ch_b = Character(
        account_id=acc_b.id,
        username="evmtest_b",
        display_name="EV Test B",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch_a)
    db_session.add(ch_b)
    await db_session.flush()
    db_session.add(CharacterStats(character_id=ch_a.id, era_id=era_row.id, score=500, all_time_score=500, level=5, votes_spent_this_era=0))
    db_session.add(CharacterStats(character_id=ch_b.id, era_id=era_row.id, score=500, all_time_score=500, level=5, votes_spent_this_era=0))
    await db_session.commit()
    await db_session.refresh(ch_a)
    await db_session.refresh(ch_b)
    headers_a = {"Authorization": f"Bearer {create_jwt(acc_a.id)}"}
    headers_b = {"Authorization": f"Bearer {create_jwt(acc_b.id)}"}

    create_a = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "First Collab"},
        headers=headers_a,
    )
    assert create_a.status_code == 201
    praxis_a_id = create_a.json()["id"]

    invite_a = await client.post(
        f"/praxes/{praxis_a_id}/invite",
        json={"invitee_id": character2.id},
        headers=headers_a,
    )
    assert invite_a.status_code == 200
    await client.post(
        f"/praxes/{praxis_a_id}/invite/{invite_a.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers2,
    )

    create_b = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Second Collab"},
        headers=headers_b,
    )
    assert create_b.status_code == 201
    praxis_b_id = create_b.json()["id"]

    reinvite = await client.post(
        f"/praxes/{praxis_b_id}/invite",
        json={"invitee_id": character2.id},
        headers=headers_b,
    )
    assert reinvite.status_code == 200


# change-type — solo <-> collab in place (#321)


@pytest.mark.asyncio
async def test_change_type_solo_to_collab_preserves_id_and_content(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Keep me", "body_text": "and me"},
        headers=auth_headers2,
    )
    assert create.status_code == 201
    pid = create.json()["id"]

    resp = await client.post(
        f"/praxes/{pid}/change-type", json={"type": "collab"}, headers=auth_headers2
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == pid  # same praxis, not a recreate
    assert body["type"] == "collab"
    assert body["title"] == "Keep me"
    assert body["body_text"] == "and me"


@pytest.mark.asyncio
async def test_change_type_collab_to_solo_is_a_takeover(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """collab → solo by a co-author is a takeover: actor becomes sole owner,
    others dropped, content kept (#321)."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared work"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    pid = create.json()["id"]

    db_session.add(PraxisMember(praxis_id=pid, character_id=character.id, has_submitted=False))
    await db_session.commit()

    resp = await client.post(
        f"/praxes/{pid}/change-type", json={"type": "solo"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["type"] == "solo"
    assert body["title"] == "Shared work"  # content kept
    assert body["created_by_id"] == character.id  # ownership transferred to the actor
    member_ids = {m["character_id"] for m in body["members"]}
    assert member_ids == {character.id}  # co-authors (incl. original creator) dropped


@pytest.mark.asyncio
async def test_change_type_rejects_duel_side(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from models.duel import Duel, DuelStatus

    create = await client.post(
        "/praxes", json={"task_id": active_task.id, "type": "solo"}, headers=auth_headers2
    )
    assert create.status_code == 201
    pid = create.json()["id"]
    db_session.add(Duel(
        task_id=active_task.id,
        challenger_praxis_id=pid,
        opponent_character_id=character.id,
        status=DuelStatus.pending,
    ))
    await db_session.commit()

    resp = await client.post(
        f"/praxes/{pid}/change-type", json={"type": "collab"}, headers=auth_headers2
    )
    assert resp.status_code == 409
@pytest.mark.asyncio
async def test_change_type_takeover_clears_pending_publish_window(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """A takeover resets the ADR-0012 window, so a flip back can't auto-seal on a
    stale one."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared work"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    pid = create.json()["id"]
    db_session.add(PraxisMember(praxis_id=pid, character_id=character.id, has_submitted=False))
    await db_session.commit()

    submit = await client.post(f"/praxes/{pid}/submit", headers=auth_headers2)
    assert submit.status_code == 200, submit.text
    assert submit.json()["submit_proposed_at"] is not None

    resp = await client.post(
        f"/praxes/{pid}/change-type", json={"type": "solo"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert all(not m["has_submitted"] for m in body["members"])


# Pending consensus state + unsubmit (#590)


@pytest.mark.asyncio
async def test_pending_collab_counts_against_bank_cap(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from services.signup_eligibility import count_in_progress_praxes

    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert resp.json()["status"] == "pending"
    assert await count_in_progress_praxes(character2.id, db_session) == 1
    assert await count_in_progress_praxes(character.id, db_session) == 1


@pytest.mark.asyncio
async def test_pending_collab_appears_in_active_tasks(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    from services.activity_feed import _get_my_task_ids

    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert active_task.id in await _get_my_task_ids(character2.id, db_session)
    assert active_task.id in await _get_my_task_ids(character.id, db_session)


@pytest.mark.asyncio
async def test_unsubmit_pending_reopens_the_whole_group(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Withdraw is ADR-0012's hard reset, for any member (ADR-0079).

    The holdout withdraws here: under #590 they had nothing to pull back (422).
    """
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Trio"},
        headers=auth_headers2,
    )
    praxis_id = create.json()["id"]
    for invitee_id, invitee_headers in (
        (character.id, auth_headers),
        (character3.id, auth_headers3),
    ):
        inv = await client.post(
            f"/praxes/{praxis_id}/invite",
            json={"invitee_id": invitee_id},
            headers=auth_headers2,
        )
        await client.post(
            f"/praxes/{praxis_id}/invite/{inv.json()['id']}/respond",
            json={"accept": True},
            headers=invitee_headers,
        )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers3)
    assert resp.json()["status"] == "pending"

    # `character` is the holdout: invited and accepted, never submitted.
    unsub = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert unsub.status_code == 200
    data = unsub.json()
    assert data["status"] == "in_progress"
    assert data["submit_proposed_at"] is None
    submitted = {m["character_id"]: m["has_submitted"] for m in data["members"]}
    assert submitted == {
        character.id: False,
        character2.id: False,
        character3.id: False,
    }


@pytest.mark.asyncio
async def test_unsubmit_last_pending_member_returns_to_in_progress(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["submit_proposed_at"] is None
    assert all(not m["has_submitted"] for m in data["members"])


@pytest.mark.asyncio
async def test_unsubmit_fresh_in_progress_returns_422(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Fresh"},
        headers=auth_headers,
    )
    praxis_id = create.json()["id"]
    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert resp.status_code == 422
# Full-fidelity card fields for mobile praxis cards (#573)


def _find_card(cards: list[dict], praxis_id: int) -> dict:
    match = next((card for card in cards if card["id"] == praxis_id), None)
    assert match is not None, f"praxis {praxis_id} missing from list"
    return match


@pytest.mark.asyncio
async def test_card_out_includes_full_fidelity_fields(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={
            "task_id": active_task.id,
            "type": "solo",
            "title": "Card Fidelity",
            "body_text": "the full proof text",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    list_resp = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert list_resp.status_code == 200
    card = _find_card(list_resp.json(), praxis_id)

    assert card["body_text"] == "the full proof text"
    assert card["created_by_faction_slug"] == DEFAULT_FACTION_SLUG
    member_names = [m["character_display_name"] for m in card["members"]]
    assert character.display_name in member_names
    assert card["media_items"] == []


@pytest.mark.asyncio
async def test_card_out_viewer_vote_none_for_anonymous(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Anon View"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    list_resp = await client.get("/praxes", params={"task_id": active_task.id})
    assert list_resp.status_code == 200
    card = _find_card(list_resp.json(), praxis_id)
    assert card["viewer_vote"] is None


@pytest.mark.asyncio
async def test_card_out_viewer_vote_none_when_not_voted(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Not Voted"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    list_resp = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert list_resp.status_code == 200
    card = _find_card(list_resp.json(), praxis_id)
    assert card["viewer_vote"] is None


@pytest.mark.asyncio
async def test_card_out_viewer_vote_reflects_cast_value(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Voted Card"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert vote_resp.status_code == 200

    voter_list = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert voter_list.status_code == 200
    assert _find_card(voter_list.json(), praxis_id)["viewer_vote"] == 3

    author_list = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers2
    )
    assert author_list.status_code == 200
    assert _find_card(author_list.json(), praxis_id)["viewer_vote"] is None
