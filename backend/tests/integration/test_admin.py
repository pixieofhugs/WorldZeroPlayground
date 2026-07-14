"""Integration tests for /admin endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.contact import ContactMessage
from models.era import Era
from models.praxis import Praxis, ModerationStatus
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus


async def _make_admin(account: Account, session: AsyncSession) -> None:
    """Grant the admin role to an account."""
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    ar = AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    session.add(ar)
    await session.commit()


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_endpoints_require_admin_role(
    client: AsyncClient,
    auth_headers: dict,
):
    """Non-admin accounts get 403 on admin endpoints."""
    resp = await client.get("/admin/tasks/pending", headers=auth_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Tasks — list, approve, retire, reactivate, create, task-vision
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_list_pending_tasks(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    task = Task(
        title="Pending Admin Test",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.get("/admin/tasks/pending", headers=auth_headers)
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert task.id in ids


@pytest.mark.asyncio
async def test_admin_approve_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    task = Task(
        title="To Approve",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.put(f"/admin/tasks/{task.id}/approve", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_admin_retire_task(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)
    resp = await client.put(f"/admin/tasks/{active_task.id}/retire", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "retired"


@pytest.mark.asyncio
async def test_admin_reactivate_task(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Retire a task, then reactivate it."""
    await _make_admin(account, db_session)

    # Retire first
    await client.put(f"/admin/tasks/{active_task.id}/retire", headers=auth_headers)

    resp = await client.post(f"/admin/tasks/{active_task.id}/reactivate", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_admin_update_task_status(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Use the generic status endpoint to retire a task."""
    await _make_admin(account, db_session)

    resp = await client.put(
        f"/admin/tasks/{active_task.id}/status",
        json={"status": "retired"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "retired"


@pytest.mark.asyncio
async def test_admin_can_move_task_freely_between_states(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can move a task pending → retired → pending → active without restrictions."""
    await _make_admin(account, db_session)

    task = Task(
        title="Free-move",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    # pending → retired (previously rejected by /retire)
    resp = await client.put(f"/admin/tasks/{task.id}/retire", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "retired"

    # retired → pending (new: previously no path)
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "pending"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    # pending → active via /approve
    resp = await client.put(f"/admin/tasks/{task.id}/approve", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # Same-state is rejected as confused intent
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "active"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_create_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can create a task directly in active status."""
    await _make_admin(account, db_session)

    resp = await client.post(
        "/admin/tasks",
        json={"title": "Admin-created", "point_value": 50, "level_required": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Admin-created"
    assert data["status"] == "active"
    assert data["point_value"] == 50


@pytest.mark.asyncio
async def test_admin_toggle_task_vision(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.patch(
        f"/admin/tasks/{active_task.id}/task-vision",
        json={"is_task_vision_eligible": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_task_vision_eligible"] is True


# ---------------------------------------------------------------------------
# Praxis moderation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_list_flagged_praxes(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    signed_up_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Flagged praxes appear in the admin moderation queue."""
    await _make_admin(account, db_session)

    # Create and flag a praxis
    sub_resp = await client.post(
        "/praxes",
        json={"task_id": signed_up_task.id, "title": "Flaggable"},
        headers=auth_headers,
    )
    praxis_id = sub_resp.json()["id"]

    # character2 (level 5) flags it
    await client.post(
        f"/praxes/{praxis_id}/flag",
        json={"reason": "harassment"},
        headers=auth_headers2,
    )

    resp = await client.get("/admin/praxes/flagged", headers=auth_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert praxis_id in ids

    # Flag rows ride along for the moderator queue (#237, ADR-0031).
    row = next(p for p in resp.json() if p["id"] == praxis_id)
    assert [flag["reason"] for flag in row["flags"]] == ["harassment"]
    assert row["flags"][0]["reason_detail"] is None
    assert row["flags"][0]["flagged_by_name"] == character2.display_name


@pytest.mark.asyncio
async def test_flag_reason_outside_vocabulary_rejected(
    client: AsyncClient,
    character: Character,
    character2: Character,
    signed_up_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Free-text reasons are rejected at the trust boundary (ADR-0031)."""
    sub_resp = await client.post(
        "/praxes",
        json={"task_id": signed_up_task.id, "title": "Flaggable"},
        headers=auth_headers,
    )
    praxis_id = sub_resp.json()["id"]

    resp = await client.post(
        f"/praxes/{praxis_id}/flag",
        json={"reason": "inappropriate"},
        headers=auth_headers2,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_list_flagged_comments_includes_flags(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    signed_up_task: Task,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Flagged comments surface with normalized flag rows; an `other` note is
    preserved as reason_detail (#237, ADR-0031)."""
    await _make_admin(account, db_session)

    sub_resp = await client.post(
        "/praxes",
        json={"task_id": signed_up_task.id, "title": "Host praxis"},
        headers=auth_headers,
    )
    praxis_id = sub_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    # Commenting is level-gated (era.comment_level_required); lift the author
    # after praxis submit — the submit path recalculates level from score and
    # would clobber an earlier lift.
    stats_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = stats_result.scalar_one()
    stats.level = 5
    await db_session.commit()

    created = await client.post(
        f"/praxes/{praxis_id}/comments",
        json={"body_text": "questionable remark"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    comment_id = created.json()["id"]

    # character2 (level 5) flags it with the `other` free-text escape hatch.
    flag_resp = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "other", "reason_detail": "reads like an ad"},
        headers=auth_headers2,
    )
    assert flag_resp.status_code == 200, flag_resp.text

    resp = await client.get("/admin/comments/flagged", headers=auth_headers)
    assert resp.status_code == 200
    row = next(c for c in resp.json() if c["id"] == comment_id)
    assert row["flags"][0]["reason"] == "other"
    assert row["flags"][0]["reason_detail"] == "reads like an ad"
    assert row["flags"][0]["flagged_by_name"] == character2.display_name


# ---------------------------------------------------------------------------
# Character stats
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_patch_character_stats(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can set a character's score, level, and vote budget."""
    await _make_admin(account, db_session)

    resp = await client.patch(
        f"/admin/characters/{character.id}/stats",
        json={"score": 999, "level": 7, "votes_available": 50},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 999
    assert data["level"] == 7
    assert data["votes_available"] == 50


@pytest.mark.asyncio
async def test_admin_backfill_stats(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Backfill recomputes stats for all characters."""
    await _make_admin(account, db_session)

    resp = await client.post("/admin/characters/backfill-stats", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["recalculated"] >= 1


# ---------------------------------------------------------------------------
# Character ban
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_ban_character(
    client: AsyncClient,
    account: Account,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can ban and unban a character."""
    await _make_admin(account, db_session)

    # Ban
    resp = await client.post(
        f"/admin/characters/{character2.id}/ban",
        json={"banned": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["banned"] is True

    # Unban
    resp = await client.post(
        f"/admin/characters/{character2.id}/ban",
        json={"banned": False},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["banned"] is False


# ---------------------------------------------------------------------------
# Accounts & roles
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_list_accounts(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.get("/admin/accounts", headers=auth_headers)
    assert resp.status_code == 200
    emails = [a["email"] for a in resp.json()]
    assert account.email in emails


@pytest.mark.asyncio
async def test_admin_get_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.get(f"/admin/accounts/{account.id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == account.email


@pytest.mark.asyncio
async def test_admin_list_characters(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.get("/admin/characters", headers=auth_headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id in ids


@pytest.mark.asyncio
async def test_admin_suspend_account(
    client: AsyncClient,
    account: Account,
    account2: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.post(
        f"/admin/accounts/{account2.id}/suspend",
        json={"suspended": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "suspended"


@pytest.mark.asyncio
async def test_admin_manage_role(
    client: AsyncClient,
    account: Account,
    account2: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can grant and revoke roles."""
    await _make_admin(account, db_session)

    # Grant moderator role
    resp = await client.post(
        f"/admin/accounts/{account2.id}/role",
        json={"role": "moderator", "action": "grant"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["action"] == "grant"


# ---------------------------------------------------------------------------
# Overview & messages
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_overview(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.get("/admin/overview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "accounts" in data
    assert "characters" in data


@pytest.mark.asyncio
async def test_admin_messages(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can list and archive contact messages."""
    await _make_admin(account, db_session)

    msg = ContactMessage(name="Tester", email="t@t.com", message="Hello")
    db_session.add(msg)
    await db_session.commit()

    # List
    resp = await client.get("/admin/messages", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # Archive
    msg_id = resp.json()[0]["id"]
    archive_resp = await client.patch(
        f"/admin/messages/{msg_id}/archive", headers=auth_headers
    )
    assert archive_resp.status_code == 200
    assert archive_resp.json()["is_archived"] is True


# ---------------------------------------------------------------------------
# Hide / unhide praxis via DELETE and moderate endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_delete_praxis_hides_it(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """DELETE /admin/praxes/{id} sets moderation_status to hidden (soft-delete)."""
    await _make_admin(account, db_session)

    resp = await client.delete(f"/admin/praxes/{praxis_solo.id}", headers=auth_headers)
    assert resp.status_code == 204

    # Verify the row is still in the DB but now hidden
    result = await db_session.execute(select(Praxis).where(Praxis.id == praxis_solo.id))
    updated = result.scalar_one()
    assert updated.moderation_status == ModerationStatus.hidden


@pytest.mark.asyncio
async def test_admin_moderate_praxis_hide(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """PATCH /admin/praxes/{id}/moderate with status=hidden hides a visible praxis."""
    await _make_admin(account, db_session)

    resp = await client.patch(
        f"/admin/praxes/{praxis_solo.id}/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["moderation_status"] == "hidden"


@pytest.mark.asyncio
async def test_admin_moderate_praxis_unhide(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """PATCH /admin/praxes/{id}/moderate with status=visible restores a hidden praxis."""
    await _make_admin(account, db_session)

    # First hide it
    await client.patch(
        f"/admin/praxes/{praxis_solo.id}/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )

    # Now restore it
    resp = await client.patch(
        f"/admin/praxes/{praxis_solo.id}/moderate",
        json={"status": "visible"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["moderation_status"] == "visible"


@pytest.mark.asyncio
async def test_admin_moderate_praxis_failed_direct(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """PATCH /admin/praxes/{id}/moderate with status=failed stores the admin note."""
    await _make_admin(account, db_session)

    resp = await client.patch(
        f"/admin/praxes/{praxis_solo.id}/moderate",
        json={"status": "failed", "admin_note": "Does not meet requirements."},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["moderation_status"] == "failed"
    assert data["admin_note"] == "Does not meet requirements."


@pytest.mark.asyncio
async def test_admin_moderate_nonexistent_praxis_returns_404(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Moderating a praxis that does not exist returns 404."""
    await _make_admin(account, db_session)

    resp = await client.patch(
        "/admin/praxes/999999/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_delete_nonexistent_praxis_returns_404(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """DELETE on a praxis that does not exist returns 404."""
    await _make_admin(account, db_session)

    resp = await client.delete("/admin/praxes/999999", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Additional 403 coverage — multiple admin endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_admin_cannot_access_characters(
    client: AsyncClient,
    auth_headers: dict,
):
    """Non-admin account receives 403 on GET /admin/characters."""
    resp = await client.get("/admin/characters", headers=auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_patch_character_stats(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """Non-admin account receives 403 on PATCH /admin/characters/{id}/stats."""
    resp = await client.patch(
        f"/admin/characters/{character.id}/stats",
        json={"score": 9999},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_patch_task(
    client: AsyncClient,
    active_task: Task,
    auth_headers: dict,
):
    """Non-admin account receives 403 on PATCH /admin/tasks/{id}."""
    resp = await client.patch(
        f"/admin/tasks/{active_task.id}",
        json={"title": "Hacked"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_delete_praxis(
    client: AsyncClient,
    auth_headers: dict,
):
    """Non-admin account receives 403 on DELETE /admin/praxes/{id}."""
    resp = await client.delete("/admin/praxes/1", headers=auth_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Admin character list with filters
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_list_characters_filter_faction(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can filter character list by faction slug."""
    await _make_admin(account, db_session)

    resp = await client.get("/admin/characters?faction=ua", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids
    assert character2.id in ids
    for c in data:
        assert c["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_admin_list_characters_no_results(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Admin character list returns empty list for unknown faction."""
    await _make_admin(account, db_session)

    resp = await client.get("/admin/characters?faction=nonexistent", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Era reset
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_era_reset(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Era reset creates a new era row and resets character stats."""
    from sqlalchemy import select
    from models.character_stats import CharacterStats

    await _make_admin(account, db_session)

    # Record pre-reset score for character2 (level 5, score 500)
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    old_stats = result.scalar_one()
    assert old_stats.score == 500

    resp = await client.put("/admin/era/reset", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "era_id" in data
    assert data["era_id"] != era.id  # New era row created
    assert data["characters_reset"] >= 2  # At least character + character2

    new_era_id = data["era_id"]
    # Both characters should have new stat rows with reset values
    result2 = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == new_era_id,
        )
    )
    new_stats = result2.scalar_one()
    # ERA_1 has reset_score=True
    assert new_stats.score == 0


@pytest.mark.asyncio
async def test_admin_era_reset_requires_admin(
    client: AsyncClient,
    auth_headers: dict,
):
    """Non-admin gets 403 on era reset."""
    resp = await client.put("/admin/era/reset", headers=auth_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Admin edit task (PATCH /admin/tasks/{id})
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_edit_pending_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can edit title and point_value of a pending task."""
    await _make_admin(account, db_session)

    task = Task(
        title="Original Title",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"title": "Updated Title", "point_value": 20},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["point_value"] == 20


@pytest.mark.asyncio
async def test_admin_edit_active_task_rejected(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin cannot edit an active task (must retire first)."""
    await _make_admin(account, db_session)

    resp = await client.patch(
        f"/admin/tasks/{active_task.id}",
        json={"title": "Should Fail"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# T.8 SESSION T additions — vote budget recompute + era reset semantics (R.5)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_patch_stats_recomputes_votes_available(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """PATCH /admin/characters/{id}/stats with votes_available=5 stores the
    equivalent votes_spent_this_era so the on-read budget lands at 5 (R.5)."""
    from math import floor
    from sqlalchemy import select

    from game_config import CURRENT_ERA

    await _make_admin(account, db_session)

    # Set a known score so we can predict votes_available
    patch_resp = await client.patch(
        f"/admin/characters/{character.id}/stats",
        json={"score": 0, "votes_available": 5},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["votes_available"] == 5

    # The service should have stored votes_spent_this_era = cap - 5
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    cap = CURRENT_ERA.vote_budget_base + floor(CURRENT_ERA.vote_budget_multiplier * 0)
    assert stats.votes_spent_this_era == max(0, cap - 5)

    # Re-reading via /admin/characters confirms the computed value
    list_resp = await client.get(
        f"/admin/characters?faction={character.faction_slug}",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    matching = [c for c in list_resp.json() if c["id"] == character.id]
    assert len(matching) == 1
    assert matching[0]["votes_available"] == 5


@pytest.mark.asyncio
async def test_admin_era_reset_zeros_votes_spent_this_era(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Era reset with reset_vote_budget=True zeros votes_spent_this_era (R.5)."""
    from sqlalchemy import select
    from math import floor

    from game_config import CURRENT_ERA

    await _make_admin(account, db_session)

    # Pre-reset: force character to have votes_spent_this_era > 0
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.votes_spent_this_era = 7
    stats.score = 50
    await db_session.commit()

    # Sanity: ERA_1 has reset_vote_budget=True, so the helper won't run
    # against a different config.
    assert CURRENT_ERA.reset_vote_budget is True

    reset_resp = await client.put("/admin/era/reset", headers=auth_headers)
    assert reset_resp.status_code == 200
    new_era_id = reset_resp.json()["era_id"]

    # Fetch the new-era stats row
    new_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == new_era_id,
        )
    )
    new_stats = new_result.scalar_one()
    await db_session.refresh(new_stats)
    assert new_stats.votes_spent_this_era == 0

    # With reset_score=True on ERA_1, score is 0 in the new era, so budget == base.
    expected_budget = CURRENT_ERA.vote_budget_base + floor(
        CURRENT_ERA.vote_budget_multiplier * new_stats.score
    )
    # compute_votes_available should equal the expected budget
    from services.scoring import compute_votes_available
    assert compute_votes_available(new_stats, CURRENT_ERA) == expected_budget


@pytest.mark.asyncio
async def test_admin_era_reset_preserves_votes_spent_without_flag(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """With reset_vote_budget=False the new era carries over votes_spent_this_era (R.5)."""
    from dataclasses import replace

    from game_config import CURRENT_ERA
    from models.era import Era as EraModel
    from services.era import apply_era_reset
    from sqlalchemy import select

    await _make_admin(account, db_session)

    # Pre-reset spend
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.votes_spent_this_era = 9
    await db_session.commit()

    # Build a new era row and trigger reset directly through the service
    # with a custom EraConfig that disables reset_vote_budget. The public
    # /admin/era/reset endpoint uses CURRENT_ERA unconditionally, so to
    # exercise the preservation branch we invoke the service with an
    # overridden EraConfig.
    new_era_row = EraModel(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    db_session.add(new_era_row)
    await db_session.flush()

    preserving_era = replace(CURRENT_ERA, reset_vote_budget=False)
    await apply_era_reset([character], new_era_row, db_session, era=preserving_era)

    # Load the new-era stats row
    new_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == new_era_row.id,
        )
    )
    new_stats = new_result.scalar_one()
    await db_session.refresh(new_stats)
    assert new_stats.votes_spent_this_era == 9
