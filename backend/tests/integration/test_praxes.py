"""Integration tests for /praxes endpoints — praxis model (P.8).

Covers solo praxis CRUD, collab praxis workflow, and error cases.
Uses the standard conftest fixtures: client, character, character2, active_task, etc.

NOTE: The new model does NOT require a pre-existing CharacterTask signup before
creating a praxis.  create_praxis() checks level and bank cap only.
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


# ---------------------------------------------------------------------------
# Public list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_praxes_public(client: AsyncClient):
    resp = await client.get("/praxes")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# Solo praxis — create, read, filter
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_solo_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes with type=solo creates a praxis and a PraxisMember for the creator."""
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
    """POST /praxes (solo) against a metatask row is a 400, not a created praxis (#1001)."""
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
    """GET /praxes/{id} returns full PraxisOut with members list."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Test Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # in_progress praxes are member-only (ADR-0024); read as the author-member.
    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == praxis_id
    assert isinstance(data["members"], list)
    assert len(data["members"]) == 1


@pytest.mark.asyncio
async def test_get_nonexistent_praxis_returns_404(client: AsyncClient):
    """GET /praxes/99999 for a non-existent praxis returns 404."""
    resp = await client.get("/praxes/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_praxes_filter_by_task_id(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """GET /praxes?task_id=X returns only praxes for that task."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Filtered Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    # Read as the author-member so the in_progress praxis is visible (ADR-0024).
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
    """GET /praxes?faction=X returns only praxes whose task belongs to faction X.

    Praxis has no faction of its own — it inherits the linked task's faction
    (Task.primary_faction_slug). The filter joins through Task.
    """
    from models.faction import Faction, FactionStatus
    from models.task import TaskStatus

    # active_task is a UA task; add a second task in another faction. The faction
    # row must exist for the FK constraint.
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

    # One praxis on each task.
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

    # Filter to UA — only the UA praxis comes back. Read as the author-member so
    # the in_progress praxes are visible (ADR-0024).
    ua_list = await client.get(
        "/praxes",
        params={"faction": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert ua_list.status_code == 200
    ua_ids = {item["id"] for item in ua_list.json()}
    assert ua_praxis_id in ua_ids
    assert wow_praxis_id not in ua_ids

    # Filter to Wow — only the Wow praxis comes back.
    wow_list = await client.get("/praxes", params={"faction": "wow"}, headers=auth_headers)
    assert wow_list.status_code == 200
    wow_ids = {item["id"] for item in wow_list.json()}
    assert wow_praxis_id in wow_ids
    assert ua_praxis_id not in wow_ids


# ---------------------------------------------------------------------------
# Feed: sort + free-text search (#658)
# ---------------------------------------------------------------------------


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

    Both timestamps are pinned explicitly, and the ordering tests set them in
    *opposite* orders, so a sort that silently fell back to the wrong column
    fails instead of passing by coincidence.

    ``created_at`` must be pinned for any test that asserts on creation order:
    its ``server_default`` is ``now()``, which in Postgres is *transaction*-start
    time, and the fixture session runs the whole test in one transaction — so
    rows created in a single test all tie, and the tiebreak is arbitrary.
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
    """?sort=newest|oldest orders on submitted_at, and oldest reverses newest.

    The three praxes are created oldest-first but sealed newest-first, so any
    implementation that ordered on ``created_at`` would return them backwards.
    """
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
                # Inverted on purpose: praxis 0 was started first but filed
                # last, so created_at DESC and submitted_at DESC disagree.
                submitted_at=now - timedelta(days=index),
                created_at=now - timedelta(days=10 - index),
            )
        )

    # all_eras: these seal times are days old, and the feed now defaults to
    # this-era-only (#1362). The subject here is the ordering, not the scope.
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
    """A caller that passes no ``sort`` still gets created_at DESC.

    ``list_praxes`` is shared — the sidebar, task detail and profile lists all
    call it. This is the regression guard on that blast radius: the seal times
    below invert the creation order, so a sort that leaked into the default
    would flip this list.
    """
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
    # created_at DESC — last created first, i.e. the reverse of `ids`.
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
    """?q= also matches the praxis's own title and body_text."""
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
    """?q= also matches a member's handle and display name (#681).

    Reverses #658's deliberate exclusion of the author: one box now finds
    content OR a person.
    """
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

    # By handle, with the '@' sigil the player typed (#624).
    resp = await client.get(
        "/praxes", params={"status": "submitted", "q": "@othercharacter"}
    )
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()}
    assert theirs in ids
    assert mine not in ids

    # By display name ("Other Character") — case-insensitive, partial.
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
    """A praxis with TWO matching members still yields exactly one feed row.

    This is why the player axis is an ``IN (subquery)`` and not a join: a
    multi-member collab would otherwise be multiplied once per matching member.
    """
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
    # Second member, so the term below matches two rows of the same praxis.
    db_session.add(PraxisMember(praxis_id=praxis_id, character_id=character2.id))
    await db_session.commit()

    # "character" is a substring of BOTH usernames (testcharacter/othercharacter).
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
    """The player axis is an OR *within* ?q=, still a plain AND with filters.

    ``?faction=wow`` excludes a praxis whose member matches the term, proving
    the name match cannot smuggle a row past another active filter.
    """
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

    # Same term, matching faction: present.
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

    # Same term, non-matching faction: gone.
    resp = await client.get(
        "/praxes",
        params={"status": "submitted", "q": "othercharacter", "faction": "wow"},
    )
    assert resp.status_code == 200
    assert theirs not in {item["id"] for item in resp.json()}


@pytest.mark.asyncio
async def test_invalid_sort_returns_422(client: AsyncClient):
    """An unknown ?sort= is rejected, not silently ignored."""
    resp = await client.get("/praxes", params={"sort": "sideways"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_in_progress_still_returns_null_submitted_at(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The submitted_at guard is scoped to status=submitted only.

    In-progress praxes have a NULL submitted_at *by definition* — a blanket
    ``submitted_at IS NOT NULL`` would empty the sidebar's in-progress list.
    """
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
    """A submitted praxis with no submitted_at is corrupt, and is not shown.

    _apply_seal makes this unreachable and the #658 backfill cleared the legacy
    rows, so this can only ever fire on a genuine future bug — which is exactly
    what it is here for.
    """
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


# ---------------------------------------------------------------------------
# Solo praxis — submit lifecycle
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes/{id}/submit sets has_submitted=True; praxis becomes submitted."""
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
    """POST /praxes/{id}/submit by non-member returns 403."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Non-member submit"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit_resp.status_code == 403


# ---------------------------------------------------------------------------
# Withdraw / resubmit
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_withdraw_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes/{id}/withdraw moves praxis back to in_progress (editing)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Withdraw Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Must be submitted before withdrawing back to editing
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
    """Submitting then moving back to editing pauses the praxis score."""
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
    # Score is paused while in editing; should not exceed the submitted score
    assert stats.score <= score_after_submit


@pytest.mark.asyncio
async def test_submit_editing_withdraw_submit_roundtrip(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """submitted → editing → submitted restores both state and score contribution."""
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
    """Withdrawing a praxis that is already in editing returns 422."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Double Withdraw"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Praxis starts in_progress — withdrawing immediately returns 422
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
    """Withdrawing another character's praxis returns 403."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Others Praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_in_progress_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """DELETE /praxes/{id} removes an in_progress praxis."""
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


# ---------------------------------------------------------------------------
# Bank cap
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_praxis_bank_cap(
    client: AsyncClient,
    character2: Character,
    db_session: AsyncSession,
    auth_headers2: dict,
    era: Era,
):
    """POST /praxes when at bank cap (max_task_signups in-progress) returns 400.

    character2 starts with level 5 so it can create collab/duel types too.
    We create tasks on the fly and fill the bank to the cap.
    """
    from game_config import CURRENT_ERA
    from models.task import Task, TaskStatus

    cap = CURRENT_ERA.max_task_signups

    # Seed enough tasks to fill the bank
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

    # Create one praxis per task to fill the bank
    for task in tasks:
        resp = await client.post(
            "/praxes",
            json={"task_id": task.id, "type": "solo"},
            headers=auth_headers2,
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.json()}"

    # Now one more task — should hit the cap
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


# ---------------------------------------------------------------------------
# Collab praxis — create, invite, respond, submit
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_collab_praxis(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """POST /praxes with type=collab creates praxis; creator is first member.

    character2 is level 5 which meets the collab level requirement.
    """
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
    """POST /praxes (collab) against a metatask row is a 400, not a created praxis (#1001).

    character2 is level 5 and meets the collab gate — the metatask gate fires first.
    """
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
    """Full collab invite flow: invite sent by character2, accepted by character."""
    # character2 creates the collab (level 5)
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Collab Invite"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # character2 invites character
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

    # character accepts the invite
    respond_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert respond_resp.status_code == 200
    # The respond route answers an ack, not the praxis (#1383).
    assert respond_resp.json() == {"praxis_id": praxis_id, "accepted": True}

    # Membership is the real effect, so read it off the praxis itself.
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
    """The inviter rescinds a pending invite and the row is gone (#421).

    The 403 here is now a *membership* refusal, not an inviter one (#1415 §3):
    the invitee is not a member of the praxis, and never was.
    """
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

    # The invitee is not a member, so they cannot rescind.
    forbidden = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers
    )
    assert forbidden.status_code == 403

    # The inviter rescinds → 204, and the row is gone (re-delete → 404).
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
    """The ruling of #1415 §3: rescinding is a member power, not an inviter one.

    A collab is co-owned (ADR-0013): every member may invite and every member may
    kick, so "only the person who typed the name may untype it" was the one
    asymmetric rule — and it made the roster's rescind control appear on some
    pending rows and not others with nothing on screen to explain why.

    Membership is still the boundary, which is the second half of this test: the
    invitee is an outsider until they accept, and an outsider gets 403.
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

    # The invitee — not a member — still may not.
    outsider = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers3
    )
    assert outsider.status_code == 403, outsider.text

    # The other member, who did not send it, may.
    rescinded = await client.delete(
        f"/praxes/{praxis_id}/invite/{invite_id}", headers=auth_headers
    )
    assert rescinded.status_code == 204, rescinded.text

    # By value: that row is gone, and only that row — the accepted invite the
    # praxis was built from is untouched.
    after = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    invites = after.json()["invites"]
    assert invite_id not in {invite["id"] for invite in invites}
    assert character3.id not in {invite["invitee_id"] for invite in invites}

    # The surviving invite carries the INVITEE's display name only (#1387):
    # `inviter_display_name` had no client reader, and every roster row the UI
    # draws is keyed off the invitee. These invites have a real inviter with a
    # real display name, so a leftover serializer would emit it, not a blank.
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
    """#386: a joined collaborator sees the shared in_progress draft in their own
    active-tasks list. ``character_id`` filters by membership (ADR-0013 co-owned
    draft), not just the creator."""
    # character2 creates the collab; character is invited and accepts.
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

    # The invitee (not the creator) still sees the draft in their own list...
    invitee_list = await client.get(
        "/praxes",
        params={"character_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert invitee_list.status_code == 200
    assert praxis_id in [p["id"] for p in invitee_list.json()]

    # ...and so does the creator (membership includes them too).
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
    """#344/#349: ``member_id`` filters by PraxisMember, mirroring the slot count.

    A praxis where the character is a member but NOT the creator shows up;
    a praxis the character is not a member of does not.
    """
    # character2 creates a collab; character is invited and accepts (member, not creator).
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

    # character2 also creates a solo praxis (on a second task — one active
    # membership per task) that character has no membership in.
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

    # Membership list for character: the joined collab appears...
    member_list = await client.get(
        "/praxes",
        params={"member_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert member_list.status_code == 200
    member_ids = [p["id"] for p in member_list.json()]
    assert collab_id in member_ids
    assert solo_id not in member_ids

    # ...and filtering by a non-member's id excludes the praxis even when the
    # viewer could otherwise see it (character2 is a member of both).
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
    """character can decline a collab invite."""
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
    # The respond route answers an ack, not the praxis (#1383). A decline is
    # still an answer, so `accepted` reports which way it went.
    assert respond_resp.json() == {"praxis_id": praxis_id, "accepted": False}

    # character should NOT be a member
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
    """All members submitting transitions the praxis to submitted status."""
    # character2 creates
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "All Submit"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Invite character
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

    # character2 submits
    submit1 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit1.status_code == 200
    # Not yet submitted (character still needs to submit)
    assert submit1.json()["status"] == "pending"

    # character submits
    submit2 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit2.status_code == 200
    assert submit2.json()["status"] == "submitted"


# ---------------------------------------------------------------------------
# Edit praxis — moved wholesale to the room (#1743)
#
# There is no edit *endpoint* left to test here. Title and body are written in
# the praxis's room and flushed to the record by the room server, so both the
# capability and its member check live at that seam now and are tested there
# (``test_praxis_room.py``): the flush itself, ADR-0013's "any member may edit",
# and the non-member refusal that used to be this file's 403.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Collab co-ownership (ADR-0013): any member may edit / reopen / kick
# ---------------------------------------------------------------------------


async def _two_member_collab(
    client: AsyncClient,
    task: Task,
    creator_headers: dict,
    invitee_id: int,
    invitee_headers: dict,
) -> int:
    """Create a collab owned by ``creator_headers`` and add ``invitee`` as a member."""
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


# "A non-creator member can edit" (ADR-0013) is now a room rule, asserted where
# it is enforced: ``test_a_non_creator_members_edit_reaches_the_record``.


@pytest.mark.asyncio
async def test_collab_non_creator_can_reopen(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A non-creator member can reopen (withdraw) a submitted collab (ADR-0013)."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    # Both submit so the collab is fully submitted.
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
    """A non-creator member can kick the creator; created_by has no special power (ADR-0013)."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    # character (non-creator) kicks character2 (the creator).
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

    A kick resets the whole group back to drafting, so on a published praxis it
    would silently unpublish it and wipe every cast. Reopen first.
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

    # Nothing moved: still published, still two members, both still cast.
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
    """The ADR-0013 reset survives the #1076 guard: a pending kick is still allowed
    and still drops the group back to drafting, clearing the remaining cast."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    # The kicker casts first, so the collab is pending with their own cast in.
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


# ---------------------------------------------------------------------------
# Collab lazy-consensus publish (ADR-0012): pending-publish window + timeout + leave
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_collab_partial_submit_opens_pending_window(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One member submitting a two-member collab opens the pending-publish window."""
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
    """All members submitting publishes immediately and clears the window."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"
    assert data["submit_proposed_at"] is None


# A *text* edit cancels a live proposal again (ADR-0079), but not through any
# route: it fires from the room's own document observer, so its assertions live
# in ``test_praxis_room.py`` where a real CRDT client can make the text move.
# Media edits reach the same rule through ``on_member_edit`` —
# ``test_praxis_media_batch.py`` holds those — and Withdraw through this router,
# in ``test_collab_consensus.py``.


@pytest.mark.asyncio
async def test_roster_row_carries_when_each_member_filed(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """``PraxisMemberOut.submitted_at`` — the column has existed since #571 and
    never reached the wire until #1415.

    Pinned across the whole flip, not just the True case: NULL while a member
    still owes their part, a timestamp once they file, and NULL again after the
    hard reset — because a "when they filed" that survived an unsubmit would be
    worse than not shipping it at all.
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
    # The member who has not filed is still NULL — one row moved, not the pair.
    assert rows[character.id]["submitted_at"] is None

    # ...and NULL again when the proposal is withdrawn. Withdraw is a group
    # action now (ADR-0079) — there is no per-member submission left to retract
    # some or all of — so it clears the pair. The claim is unchanged: a "when
    # they filed" that outlived the filing would be worse than never shipping
    # the field.
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

    # Backdate the window past era.collab_auto_submit_days (= 10).
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
    """If the only un-submitted member leaves, the collab goes Live for those who stayed.

    The seal runs BEFORE the ADR-0060 one-member conversion, and that ordering is
    the point of this test: converting first would cancel the pending-publish
    window and wipe the survivor's own cast, throwing away the consensus the
    departure had just completed. Sealing first keeps it Live, then reprices it
    as a solo praxis.
    """
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    # Creator (character2) submits; character has not.
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    # character (the only hold-out) leaves → remaining (character2) all submitted → Live.
    resp = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "submitted"
    remaining = {m["character_id"] for m in data["members"]}
    assert remaining == {character2.id}
    # One member left standing, so it is no longer a collaboration (ADR-0060).
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
    """A non-member cannot leave a collab."""
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
    """A solo praxis publishes immediately on submit; no pending window (ADR-0012 scope)."""
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


# ---------------------------------------------------------------------------
# Change type (in-place solo↔collab, #321)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_change_type_to_duel_rejected(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """Duels are issued via the challenge endpoint, not a direct type change."""
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


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_hidden_praxis_returns_404(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """GET /praxes/{id} for a hidden praxis returns 404."""
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
    """GET /praxes default listing does not include hidden praxes.

    The praxis is **submitted** before it is hidden so the moderation filter is
    the only thing that can keep it out: an unsubmitted one is already excluded
    by ADR-0024 (member-only) and, since #1112, by the profile grid's
    finished-work-only default — which would pass this test for the wrong
    reason.
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

    # Control: visible and listed before moderation touches it.
    resp_before = await client.get("/praxes", params={"character_id": character.id})
    assert praxis_id in [item["id"] for item in resp_before.json()]

    praxis = await db_session.get(Praxis, praxis_id)
    praxis.moderation_status = ModerationStatus.hidden
    await db_session.commit()

    resp = await client.get("/praxes", params={"character_id": character.id})
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert praxis_id not in ids


# ---------------------------------------------------------------------------
# T.10 SESSION T additions — R-rule explicit coverage
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_praxis_below_required_level_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """R.1: POST /praxes returns 403 when character.level < task.level_required."""
    from models.task import Task, TaskStatus

    # character is level 0 by default; seed a task with level_required=5
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
    # Error message must name the required level
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_level_too_low.value
    assert "5" in detail["message"]



# ---------------------------------------------------------------------------
# Bug 6 — can_flag on PraxisOut (viewer-relative)
# ---------------------------------------------------------------------------


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
    """Level-4 non-author fetching a praxis sees ``can_flag == True``.

    character (level 0 by default) authors the praxis. character2 is seeded at
    level 5 by the fixture; we bump it to exactly 4 to pin the boundary.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Flag Me"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so the non-author can view it (in_progress is member-only, ADR-0024).
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    # Force character2's level to exactly era.flag_level_required (4)
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
    """Level-3 non-author sees ``can_flag == False`` — just below threshold."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Below Flag Level"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so the non-author can view it (in_progress is member-only, ADR-0024).
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    # Force character2's level to 3 (one below era.flag_level_required)
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
    """Author fetching their own praxis sees ``can_flag == False`` even at high level."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "My Own"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Bump the author well above era.flag_level_required to prove the self-author
    # gate (not the level gate) is what blocks can_flag.
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
    """Anonymous viewer (no character) sees ``can_flag == False``."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Public View"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so anonymous can view it (in_progress is member-only, ADR-0024).
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    # Hit the detail endpoint without auth headers
    resp = await client.get(f"/praxes/{praxis_id}")
    assert resp.status_code == 200
    assert resp.json()["can_flag"] is False


# ---------------------------------------------------------------------------
# Bug 7 — one-praxis-per-task guard in create_praxis (Analog carve-out)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_praxis_duplicate_blocked_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Non-Analog characters cannot create a second praxis for the same task."""
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

    # Ensure the everymen faction row exists for the FK constraint
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

    # Flip character's faction to everymen
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
    """Deleting (abandoning) an in-progress praxis frees the slot for a fresh one."""
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


# ---------------------------------------------------------------------------
# Bug 3 — draft praxis creation (minimal body)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_praxis_minimal_body_starts_as_draft(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes with only task_id succeeds and returns an in-progress draft.

    The frontend relies on this to jump a user directly into an editor after
    they click "sign up" on a task — no title, body, or mode required up front.
    """
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["task_id"] == active_task.id
    # Defaults: solo mode, in-progress status, empty content
    assert data["type"] == "solo"
    assert data["status"] == "in_progress"
    assert data["title"] is None
    # Service stores empty string for body_text when caller omits it
    assert data["body_text"] == ""
    assert data["moderation_status"] == "visible"
    # Creator was added as the sole member and has not submitted yet
    assert len(data["members"]) == 1
    assert data["members"][0]["character_id"] == character.id
    assert data["members"][0]["has_submitted"] is False
    # No media attached yet
    assert data["media_items"] == []


# Filling in a minimal draft later is the room's job now, and lands in
# ``body_text`` through the flush: ``test_an_edit_in_a_room_lands_in_body_text``.


@pytest.mark.asyncio
async def test_create_minimal_draft_blocks_duplicate_non_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Duplicate-submission guard still fires for minimal-body drafts."""
    first_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert first_resp.status_code == 201

    # A second minimal-body draft for the same task is blocked with 409.
    second_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert second_resp.status_code == 409
    detail = second_resp.json()["detail"]
    assert detail["code"] == ErrorCode.task_already_active_member.value
    assert "already submitted" in detail["message"].lower()


# ---------------------------------------------------------------------------
# Issue #165 — task-must-be-active gate in create_praxis
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("task_status", [TaskStatus.pending, TaskStatus.retired])
async def test_create_praxis_non_active_task_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
    task_status: TaskStatus,
):
    """Praxis creation against a pending or retired task is rejected for non-carve-out factions."""
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
    """The Task Vision holder may create praxes on retired tasks."""
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


# ---------------------------------------------------------------------------
# PraxisCardOut new fields: task_level_required, voter_count,
# submitted_at (issue #159)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_praxis_card_includes_new_fields(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """GET /praxes list returns task_level_required, voter_count (0),
    and submitted_at (null) for a newly-created in_progress praxis."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Card Fields Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Read as the author-member so the in_progress card is visible (ADR-0024).
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
    """submitted_at is null before submit and non-null after the in_progress → submitted transition."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "SubmittedAt Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Read as the author-member so the in_progress card is visible (ADR-0024).
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
    """voter_count and score (task points + points-from-votes) reflect votes cast on the praxis."""
    # character2 creates a praxis
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Vote Fields Test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so the praxis is publicly listable (in_progress is member-only, ADR-0024).
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    # character votes 4
    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 200

    list_resp = await client.get("/praxes")
    card = next(c for c in list_resp.json() if c["id"] == praxis_id)

    assert card["voter_count"] == 1
    assert card["score"] == active_task.point_value + 4


# ---------------------------------------------------------------------------
# Active-membership gate — single-source correctness (issue #183)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_joined_collaborator_blocked_from_resigning_up(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A non-author collab member is blocked from signing up for the same task again."""
    # character2 creates a collab and invites character
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

    # character accepts — now a joined (non-author) member of the collab
    await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    # character tries to sign up for the same task independently — must be blocked
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
    """A player already in an in-progress collab for a task cannot be re-invited to another collab for the same task."""
    from sqlalchemy import select as sa_select

    from models.character_stats import CharacterStats
    from models.era import Era
    from services.auth import create_jwt

    era_row = (await db_session.execute(sa_select(Era))).scalar_one()

    # character3: creates collab A and invites character2 to join
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

    # character4: creates collab B and tries to invite character2
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

    # ch3 creates collab A; character2 joins as a non-author member
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

    # ch4 creates collab B and tries to invite character2 — must fail (already in collab A)
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
    """Everymen (Double Dipper) may sign up for the same task even as a collab member."""
    from sqlalchemy import select as sa_select

    from models.faction import Faction, FactionStatus

    result = await db_session.execute(sa_select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", status=FactionStatus.visible))
        await db_session.commit()

    character.faction_slug = "everymen"
    await db_session.commit()

    # character2 creates a collab and invites character (Everymen)
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

    # Everymen character can sign up again independently
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
    """Everymen (Double Dipper) can receive an invite even when already in a collab for the same task."""
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

    # Create two collab owners (each level 5, separate accounts)
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

    # ch_a creates collab A; character2 (Everymen) joins
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

    # ch_b creates collab B and invites character2 (Everymen) — should succeed despite existing collab
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


# ---------------------------------------------------------------------------
# change-type — solo <-> collab in place (#321)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_change_type_solo_to_collab_preserves_id_and_content(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """solo → collab flips in place: same id, title, and body preserved (#321)."""
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
    other members dropped, content kept (grill 2026-07-01, #321)."""
    # character2 (level 5) creates the collab; content lives on it.
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared work"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    pid = create.json()["id"]

    # character joins as a co-author.
    db_session.add(PraxisMember(praxis_id=pid, character_id=character.id, has_submitted=False))
    await db_session.commit()

    # character (a non-creator member) takes it over → solo.
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
    """A duel side can't switch mode — dissolve the duel first (409)."""
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
    """A takeover resets the ADR-0012 pending-publish window, so a later flip
    back to collab can't inherit a stale, already-lapsed window and auto-seal."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared work"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    pid = create.json()["id"]
    db_session.add(PraxisMember(praxis_id=pid, character_id=character.id, has_submitted=False))
    await db_session.commit()

    # The creator proposes submit → the pending-publish window opens.
    submit = await client.post(f"/praxes/{pid}/submit", headers=auth_headers2)
    assert submit.status_code == 200, submit.text
    assert submit.json()["submit_proposed_at"] is not None

    # The co-author takes it over → solo; the window must be gone.
    resp = await client.post(
        f"/praxes/{pid}/change-type", json={"type": "solo"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert all(not m["has_submitted"] for m in body["members"])


# ---------------------------------------------------------------------------
# Pending consensus state + per-member unsubmit (#590)
# ---------------------------------------------------------------------------


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
    """A pending (mid-consensus) collab is still an open, slot-consuming membership."""
    from services.praxis import _count_in_progress_praxes

    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert resp.json()["status"] == "pending"
    assert await _count_in_progress_praxes(character2.id, db_session) == 1
    assert await _count_in_progress_praxes(character.id, db_session) == 1


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
    """A pending collab's task still counts as one its members are working on."""
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

    #590 cleared only the caller's part and left the collab pending. ADR-0079
    dissolves that question rather than settling it: with the proposal held on
    the praxis and approvals cast against it, there is no per-member submission
    for a pull-back to take back some or all of.

    Which is why the **holdout** is the one who withdraws here: they never
    approved, so under #590 they had nothing of their own to pull back and got a
    422 — the member the countdown is running against was the one with no move.
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
    """The last submitted member unsubmitting a pending collab reopens it fully (#590)."""
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
    """Unsubmitting a praxis that was never submitted is a 422 — nothing to pull back."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Fresh"},
        headers=auth_headers,
    )
    praxis_id = create.json()["id"]
    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert resp.status_code == 422
# Full-fidelity card fields for mobile praxis cards (#573)
# ---------------------------------------------------------------------------


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
    """A /praxes list row carries body_text, created_by_faction_slug, and members (#573)."""
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

    # Read as the author-member so the in_progress praxis is visible (ADR-0024).
    list_resp = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert list_resp.status_code == 200
    card = _find_card(list_resp.json(), praxis_id)

    assert card["body_text"] == "the full proof text"
    # character is seeded in the 'ua' faction by the conftest fixture.
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
    """viewer_vote is None on an anonymous (unauthenticated) list read (#573)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Anon View"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    # Submit so an anonymous viewer can see it (in_progress is member-only).
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
    """viewer_vote is None for an authenticated viewer who has not voted (#573)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Not Voted"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    # character reads the list but has cast no vote.
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
    """viewer_vote equals the viewer's own cast value once they have voted (#573)."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Voted Card"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    # character casts a 3-star vote.
    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert vote_resp.status_code == 200

    # The voter sees their own value pre-highlighted...
    voter_list = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers
    )
    assert voter_list.status_code == 200
    assert _find_card(voter_list.json(), praxis_id)["viewer_vote"] == 3

    # ...but the author (a different viewer, who did not vote) does not.
    author_list = await client.get(
        "/praxes", params={"task_id": active_task.id}, headers=auth_headers2
    )
    assert author_list.status_code == 200
    assert _find_card(author_list.json(), praxis_id)["viewer_vote"] is None
