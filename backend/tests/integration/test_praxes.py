"""Integration tests for /praxes endpoints — praxis model (P.8).

Covers solo praxis CRUD, collab praxis workflow, and error cases.
Uses the standard conftest fixtures: client, character, character2, active_task, etc.

NOTE: The new model does NOT require a pre-existing CharacterTask signup before
creating a praxis.  create_praxis() checks level and bank cap only.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus


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
                name="Warriors of Whimsy",
                description="",
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
    ua_list = await client.get("/praxes", params={"faction": "ua"}, headers=auth_headers)
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

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
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

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
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

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
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
    resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
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

    resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers2)
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
            primary_faction_slug="ua",
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
        primary_faction_slug="ua",
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
    data = respond_resp.json()
    member_ids = [m["character_id"] for m in data["members"]]
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
    """Inviter rescinds a pending invite; only the inviter may, and the row is
    gone afterwards (#421)."""
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

    # A non-inviter (the invitee) cannot rescind.
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
        primary_faction_slug="ua",
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
    # character should NOT be a member
    data = respond_resp.json()
    member_ids = [m["character_id"] for m in data["members"]]
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
    assert submit1.json()["status"] == "in_progress"

    # character submits
    submit2 = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert submit2.status_code == 200
    assert submit2.json()["status"] == "submitted"


# ---------------------------------------------------------------------------
# Edit praxis
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_edit_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """PUT /praxes/{id} updates title and body_text."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Original"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    edit_resp = await client.put(
        f"/praxes/{praxis_id}",
        json={"title": "Updated Title", "body_text": "New body"},
        headers=auth_headers,
    )
    assert edit_resp.status_code == 200
    data = edit_resp.json()
    assert data["title"] == "Updated Title"
    assert data["body_text"] == "New body"


@pytest.mark.asyncio
async def test_edit_praxis_wrong_owner_returns_403(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    character2: Character,
):
    """Editing another character's praxis returns 403."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Mine"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.put(
        f"/praxes/{praxis_id}",
        json={"title": "Hacked"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


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


@pytest.mark.asyncio
async def test_collab_non_creator_can_edit(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A non-creator member can edit a collab's title/body (ADR-0013)."""
    # character2 creates, character (non-creator) edits.
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    resp = await client.put(
        f"/praxes/{praxis_id}",
        json={"title": "Edited by member", "body_text": "ours"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Edited by member"


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

    resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
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
    assert data["status"] == "in_progress"          # not Live yet
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


@pytest.mark.asyncio
async def test_collab_edit_cancels_pending_publish(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """An edit while pending hard-resets: window cancelled, everyone un-submitted."""
    praxis_id = await _two_member_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    resp = await client.put(
        f"/praxes/{praxis_id}",
        json={"body_text": "second thoughts"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["submit_proposed_at"] is None
    assert all(not m["has_submitted"] for m in data["members"])


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
    """If the only un-submitted member leaves, the collab goes Live for those who stayed."""
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
    """GET /praxes default listing does not include hidden praxes."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Will Be Hidden"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

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
        primary_faction_slug="ua",
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
    assert "5" in resp.json()["detail"]



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
    assert "already submitted" in second_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_praxis_duplicate_allowed_for_analog(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Analog characters may create multiple praxes for the same task (Double Dipper)."""
    from models.faction import Faction, FactionStatus
    from sqlalchemy import select as sa_select

    # Ensure the everymen faction row exists for the FK constraint
    existing = await db_session.execute(
        sa_select(Faction).where(Faction.slug == "everymen")
    )
    if existing.scalar_one_or_none() is None:
        db_session.add(
            Faction(
                slug="everymen",
                name="Everymen",
                description="Double Dipper perk",
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


@pytest.mark.asyncio
async def test_edit_minimal_draft_adds_content(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """A praxis created with a minimal body can be filled in later via PUT."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    edit_resp = await client.put(
        f"/praxes/{praxis_id}",
        json={"title": "Finally a title", "body_text": "Here is what I did."},
        headers=auth_headers,
    )
    assert edit_resp.status_code == 200
    data = edit_resp.json()
    assert data["title"] == "Finally a title"
    assert data["body_text"] == "Here is what I did."
    # Status stays in_progress — editing does not submit
    assert data["status"] == "in_progress"


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
    assert "already submitted" in second_resp.json()["detail"].lower()


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
        primary_faction_slug="ua",
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
    assert task_status.value in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_praxis_retired_task_allowed_for_ephemerists(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    faction_ephemerists,
    auth_headers: dict,
):
    """Ephemerists may create praxes on retired tasks (Task Vision carve-out in Era 1)."""
    character.faction_slug = "ephemerists"
    await db_session.commit()

    retired_task = Task(
        title="Ephemerists Can Do This",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.retired,
        created_by=character.id,
        primary_faction_slug="ua",
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
    from models.account import Account
    from models.character_stats import CharacterStats
    from models.era import Era
    from services.auth import create_jwt
    from sqlalchemy import select as sa_select

    era_row = (await db_session.execute(sa_select(Era))).scalar_one()

    # character3: creates collab A and invites character2 to join
    acc3 = Account(email="collab-a-owner@example.com")
    db_session.add(acc3)
    await db_session.flush()
    ch3 = Character(account_id=acc3.id, username="collab_a_owner", display_name="Collab A Owner", faction_slug="ua")
    db_session.add(ch3)
    await db_session.flush()
    db_session.add(CharacterStats(character_id=ch3.id, era_id=era_row.id, score=500, all_time_score=500, level=5, votes_spent_this_era=0))

    # character4: creates collab B and tries to invite character2
    acc4 = Account(email="collab-b-owner@example.com")
    db_session.add(acc4)
    await db_session.flush()
    ch4 = Character(account_id=acc4.id, username="collab_b_owner", display_name="Collab B Owner", faction_slug="ua")
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
    assert "active praxis" in re_invite.json()["detail"].lower()


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
    from models.faction import Faction, FactionStatus
    from sqlalchemy import select as sa_select

    result = await db_session.execute(sa_select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", name="Everymen", description="Double Dipper", status=FactionStatus.visible))
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
    from models.account import Account
    from models.character_stats import CharacterStats
    from models.era import Era
    from models.faction import Faction, FactionStatus
    from services.auth import create_jwt
    from sqlalchemy import select as sa_select

    result = await db_session.execute(sa_select(Faction).where(Faction.slug == "everymen"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="everymen", name="Everymen", description="Double Dipper", status=FactionStatus.visible))
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
    ch_a = Character(account_id=acc_a.id, username="evmtest_a", display_name="EV Test A", faction_slug="ua")
    ch_b = Character(account_id=acc_b.id, username="evmtest_b", display_name="EV Test B", faction_slug="ua")
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
