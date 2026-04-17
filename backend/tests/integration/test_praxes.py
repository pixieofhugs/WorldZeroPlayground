"""Integration tests for /praxes endpoints — praxis model (P.8).

Covers solo praxis CRUD, collab praxis workflow, and error cases.
Uses the standard conftest fixtures: client, character, character2, active_task, etc.

NOTE: The new model does NOT require a pre-existing CharacterTask signup before
creating a praxis.  create_praxis() checks level and bank cap only.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus
from models.task import Task


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

    resp = await client.get(f"/praxes/{praxis_id}")
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

    resp = await client.get("/praxes", params={"task_id": active_task.id})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    for item in data:
        assert item["task_id"] == active_task.id


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
    """POST /praxes/{id}/withdraw marks praxis as withdrawn, is_withdrawn=True."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Withdraw Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    withdraw_resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
    assert withdraw_resp.status_code == 200
    data = withdraw_resp.json()
    assert data["is_withdrawn"] is True


@pytest.mark.asyncio
async def test_withdraw_updates_score(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Submitting then withdrawing a praxis changes the character's score."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Score Withdraw"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Submit the praxis (score calculated after this)
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

    # Withdraw — score may change
    withdraw_resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
    assert withdraw_resp.status_code == 200

    await db_session.refresh(stats)
    # After withdraw, score should not be greater than after submit
    assert stats.score <= score_after_submit


@pytest.mark.asyncio
async def test_resubmit_praxis(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """POST /praxes/{id}/resubmit un-withdraws a withdrawn praxis."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Resubmit Test"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)

    resubmit_resp = await client.post(f"/praxes/{praxis_id}/resubmit", headers=auth_headers)
    assert resubmit_resp.status_code == 200
    data = resubmit_resp.json()
    assert data["is_withdrawn"] is False


@pytest.mark.asyncio
async def test_withdraw_already_withdrawn_returns_422(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Withdrawing an already-withdrawn praxis returns 422."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Double Withdraw"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
    resp2 = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
    assert resp2.status_code == 422


@pytest.mark.asyncio
async def test_resubmit_not_withdrawn_returns_422(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Resubmitting a praxis that is not withdrawn returns 422."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Not Withdrawn"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.post(f"/praxes/{praxis_id}/resubmit", headers=auth_headers)
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
    praxis.moderation_status = ModerationStatus.hidden.value
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
    praxis.moderation_status = ModerationStatus.hidden.value
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


@pytest.mark.asyncio
async def test_collab_invite_accept_at_cap_returns_400(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    account2: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """R.3: Accepting a collab invite that would exceed era.max_collab_participants returns 400."""
    from game_config import CURRENT_ERA
    from models.account import Account as AccountModel
    from models.character import Character as CharacterModel
    from models.character_stats import CharacterStats
    from models.praxis import PraxisMember, PraxisType
    from services.auth import create_jwt
    from sqlalchemy import func, select

    cap = CURRENT_ERA.max_collab_participants
    assert cap > 0

    # character2 (level 5) creates the collab praxis and is member #1
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Cap Test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Seed cap-2 filler members to bring total to cap-1 (creator counts as 1).
    # This leaves room to issue one legitimate invite to `character`, after
    # which we will fill the last slot via DB seeding and then try to have
    # `character` accept — which must fail because the cap is reached at
    # accept time.
    filler_accounts: list[AccountModel] = []
    filler_characters: list[CharacterModel] = []
    for index in range(cap - 2):
        filler_account = AccountModel(email=f"filler{index}@example.com")
        db_session.add(filler_account)
        await db_session.flush()
        filler_accounts.append(filler_account)

        filler_character = CharacterModel(
            account_id=filler_account.id,
            username=f"filler_char_{index}",
            display_name=f"Filler {index}",
            faction_slug="ua",
        )
        db_session.add(filler_character)
        await db_session.flush()
        filler_characters.append(filler_character)

        db_session.add(
            CharacterStats(
                character_id=filler_character.id,
                era_id=era.id,
                score=100,
                all_time_score=100,
                level=5,
                votes_spent_this_era=0,
            )
        )
        db_session.add(
            PraxisMember(
                praxis_id=praxis_id,
                character_id=filler_character.id,
                has_submitted=False,
            )
        )
    await db_session.commit()

    # Confirm the praxis is at cap-1 members (still one slot open for invite)
    count_result = await db_session.execute(
        select(func.count()).select_from(PraxisMember).where(
            PraxisMember.praxis_id == praxis_id
        )
    )
    assert count_result.scalar_one() == cap - 1

    # Issue an invite while under capacity (should succeed)
    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_id = invite_resp.json()["id"]

    # Fill the last slot with a direct-DB filler to bring total to `cap`.
    final_account = AccountModel(email="finalfiller@example.com")
    db_session.add(final_account)
    await db_session.flush()
    final_character = CharacterModel(
        account_id=final_account.id,
        username="final_filler",
        display_name="Final Filler",
        faction_slug="ua",
    )
    db_session.add(final_character)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=final_character.id,
            era_id=era.id,
            score=100,
            all_time_score=100,
            level=5,
            votes_spent_this_era=0,
        )
    )
    db_session.add(
        PraxisMember(
            praxis_id=praxis_id,
            character_id=final_character.id,
            has_submitted=False,
        )
    )
    await db_session.commit()

    # Confirm we are exactly at cap
    count_at_cap = await db_session.execute(
        select(func.count()).select_from(PraxisMember).where(
            PraxisMember.praxis_id == praxis_id
        )
    )
    assert count_at_cap.scalar_one() == cap

    # character accepts the invite → should fail because the cap is reached
    accept_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept_resp.status_code == 400
    assert str(cap) in accept_resp.json()["detail"]

    # Verify the extra member was NOT added
    count_result2 = await db_session.execute(
        select(func.count()).select_from(PraxisMember).where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == character.id,
        )
    )
    assert count_result2.scalar_one() == 0
