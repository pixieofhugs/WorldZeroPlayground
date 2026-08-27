"""Integration tests for /admin endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import CROSS_FACTION_SLUG
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.contact import ContactMessage
from models.era import Era
from models.praxis import Praxis
from models.task import Task, TaskStatus
from schemas.task import MAX_TASK_NOTES
from tests.integration.factories import DEFAULT_FACTION_SLUG, make_admin

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
# Tasks — list, approve, retire, reactivate, create
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_list_pending_tasks(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

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
async def test_admin_update_task_status(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Use the generic status endpoint to retire a task."""
    await make_admin(db_session, account)

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
    """Admin can move a task pending → retired → pending → active without restrictions.

    Every hop goes through ``PUT /admin/tasks/{id}/status``, which is the whole
    claim #1667 rests on: ``/approve``, ``/retire`` and ``/reactivate`` each
    passed one fixed ``TaskStatus`` to the same ``update_task_status`` call this
    one takes as a parameter, so they were three routes spelling three of this
    route's arguments. Two of the hops below had no dedicated route at all.
    """
    await make_admin(db_session, account)

    task = Task(
        title="Free-move",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    # pending → retired (the hop the old /retire route rejected)
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "retired"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "retired"

    # retired → pending (never had a dedicated route)
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "pending"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    # pending → active (what /approve did)
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "active"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # Same-state is rejected as confused intent
    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "active"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


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
    await make_admin(db_session, account)

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

    # Flag rows ride along for the moderator queue (#237, ADR-0037).
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
    """Free-text reasons are rejected at the trust boundary (ADR-0037)."""
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
    preserved as reason_detail (#237, ADR-0037)."""
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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


@pytest.mark.asyncio
async def test_admin_ban_deletes_no_media(
    client: AsyncClient,
    account: Account,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """A ban destroys nothing on disk (#1568).

    Self-deletion erases the avatar; moderation does not. Two reasons, both
    load-bearing: moderation must not shred the evidence it is acting on, and a
    ban is a reversible toggle — un-banning would otherwise restore a character
    with holes in it. The two paths land in the same ``status = banned`` state,
    so nothing but a test distinguishes them.
    """
    import os

    from config import settings as _settings

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))
    await make_admin(db_session, account)

    relative_path = os.path.join(str(character2.id), "avatar", "abc", "avatar.jpg")
    absolute_path = os.path.join(str(tmp_path), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(b"avatar bytes")
    character2.avatar_url = relative_path
    await db_session.flush()

    resp = await client.post(
        f"/admin/characters/{character2.id}/ban",
        json={"banned": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    await db_session.refresh(character2)
    assert os.path.isfile(absolute_path)
    assert character2.avatar_url == relative_path


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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

    resp = await client.post(
        f"/admin/accounts/{account2.id}/suspend",
        json={"suspended": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "suspended"


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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
# Hide / unhide praxis via the moderate endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_moderate_praxis_hide(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """PATCH /admin/praxes/{id}/moderate with status=hidden hides a visible praxis."""
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

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
    await make_admin(db_session, account)

    resp = await client.patch(
        "/admin/praxes/999999/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
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
async def test_non_admin_cannot_moderate_praxis(
    client: AsyncClient,
    auth_headers: dict,
):
    """Non-admin account receives 403 on PATCH /admin/praxes/{id}/moderate.

    This guard used to point at ``DELETE /admin/praxes/{id}``, deleted in #1386.
    It is repointed rather than dropped so the surviving hide path keeps its
    only non-admin 403 assertion.
    """
    resp = await client.patch(
        "/admin/praxes/1/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
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
    await make_admin(db_session, account)

    resp = await client.get(
        f"/admin/characters?faction={DEFAULT_FACTION_SLUG}", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids
    assert character2.id in ids
    for c in data:
        assert c["faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_admin_list_characters_no_results(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Admin character list returns empty list for unknown faction."""
    await make_admin(db_session, account)

    resp = await client.get("/admin/characters?faction=nonexistent", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Era reset
# ---------------------------------------------------------------------------


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
    await make_admin(db_session, account)

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
async def test_admin_edit_task_faction(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin can move a task to another of the era's factions (#1714).

    ``primary_faction_slug`` decides which kit renders the task and who earns
    the own-faction modifier, so a task filed against the wrong faction was
    unfixable short of SQL before this.
    """
    await make_admin(db_session, account)

    task = Task(
        title="Filed Against The Wrong Faction",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
        primary_faction_slug=CROSS_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"primary_faction_slug": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["primary_faction_slug"] == DEFAULT_FACTION_SLUG

    await db_session.refresh(task)
    assert task.primary_faction_slug == DEFAULT_FACTION_SLUG

    # …and back to the cross-faction sentinel, which is a real slug in config.
    back = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"primary_faction_slug": CROSS_FACTION_SLUG},
        headers=auth_headers,
    )
    assert back.status_code == 200
    assert back.json()["primary_faction_slug"] == CROSS_FACTION_SLUG


@pytest.mark.asyncio
async def test_admin_edit_task_unknown_faction_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """An unknown slug is a coded 422, not a 500 from the FK (#1714)."""
    await make_admin(db_session, account)

    task = Task(
        title="Untouched",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"primary_faction_slug": "not-a-faction"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == ErrorCode.task_faction_unknown.value

    await db_session.refresh(task)
    assert task.primary_faction_slug == CROSS_FACTION_SLUG


@pytest.mark.asyncio
async def test_admin_edit_active_task_rejected(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Admin cannot edit an active task (must retire first)."""
    await make_admin(db_session, account)

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

    await make_admin(db_session, account)

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
    from math import floor

    from sqlalchemy import select

    from game_config import CURRENT_ERA

    await make_admin(db_session, account)

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

    # Driven through the service, exactly as the preservation test below does.
    # This ran against PUT /admin/era/reset until #1667 deleted that route as
    # unreachable; the rollover's entry point is now scripts/era_reset.py, and
    # the behaviour under test was never the route's -- it is apply_era_reset's
    # reset_vote_budget branch (R.5).
    from models.era import Era as EraModel
    from services.era import apply_era_reset

    new_era_row = EraModel(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    db_session.add(new_era_row)
    await db_session.flush()
    await apply_era_reset([character], new_era_row, db_session)

    # Fetch the new-era stats row
    new_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == new_era_row.id,
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

    from sqlalchemy import select

    from game_config import CURRENT_ERA
    from models.era import Era as EraModel
    from services.era import apply_era_reset

    await make_admin(db_session, account)

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


# ---------------------------------------------------------------------------
# Notes to admin (#1823)
# ---------------------------------------------------------------------------
#
# The seam these cover is the whole point of the field: a player writes a note
# on the propose form and an admin reads it in the review queue. Before #1823
# the value was dropped client-side, so a test that only asserted the schema
# accepted `notes` would have passed against the broken build. These assert the
# round trip, and that the note does *not* travel any further than the queue.


@pytest.mark.asyncio
async def test_proposal_notes_reach_the_admin_review_queue(
    client: AsyncClient,
    account: Account,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """A player's note to the admin survives POST /tasks and is readable in the queue."""
    note = "My run group already does this every Sunday.\n\nSeemed worth sharing."

    resp = await client.post(
        "/tasks",
        json={
            "title": "Sunday long run",
            "description": "Run for an hour",
            "point_value": 15,
            "notes": note,
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    await make_admin(db_session, account)
    queue = await client.get("/admin/tasks/pending", headers=auth_headers)
    assert queue.status_code == 200

    row = next(t for t in queue.json() if t["id"] == task_id)
    assert row["notes"] == note


@pytest.mark.asyncio
async def test_proposal_notes_are_absent_from_the_public_task_payload(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """`notes` is addressed to an admin, so TaskOut must not carry it anywhere.

    Guards the placement decision in #1823: the field lives on the admin-only
    ``PendingTaskOut``. If someone later moves it up onto ``TaskOut`` for
    convenience, every player would be able to read every proposer's note off
    the browse list and the task detail page.

    The detail read is made by an ADMIN, not by the proposer: since #1725 a fresh
    proposal 404s at `GET /tasks/{id}` for everyone inside the review window, its
    own author included (there is deliberately no proposer exemption — the detail
    door answers exactly what the browse answers). Reading it as the one viewer
    the gate lets through is the stronger assertion anyway: not even an admin
    gets `notes` off the public payload, only off `/admin/tasks/pending`.
    """
    await make_admin(db_session, account)
    resp = await client.post(
        "/tasks",
        json={
            "title": "Sunday long run",
            "point_value": 15,
            "notes": "private context for the reviewer",
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    assert "notes" not in resp.json()

    task_id = resp.json()["id"]
    detail = await client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    assert "notes" not in detail.json()


@pytest.mark.asyncio
async def test_proposal_notes_over_the_cap_are_rejected(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """The trust-boundary cap is enforced by the schema, not just the textarea."""
    resp = await client.post(
        "/tasks",
        json={
            "title": "Sunday long run",
            "point_value": 15,
            "notes": "x" * (MAX_TASK_NOTES + 1),
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 422
