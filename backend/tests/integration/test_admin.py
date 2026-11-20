"""Integration tests for /admin endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import CROSS_FACTION_SLUG, real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.contact import ContactMessage
from models.era import Era
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis
from models.task import Task, TaskStatus, TaskType
from schemas.task import MAX_TASK_NOTES
from services.character_stats import recalculate_character_stats
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    make_account,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)


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
        created_by_id=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.get("/admin/tasks/pending", headers=auth_headers)
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert task.id in ids


@pytest.mark.asyncio
async def test_admin_can_move_task_freely_between_states(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Every hop goes through ``PUT /admin/tasks/{id}/status`` (#1667)."""
    await make_admin(db_session, account)

    task = Task(
        title="Free-move",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by_id=character.id,
    )
    db_session.add(task)
    await db_session.commit()

    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "retired"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "retired"

    resp = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "pending"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

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




@pytest.mark.asyncio
async def test_admin_list_flagged_praxes(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    sub_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "title": "Flaggable"},
        headers=auth_headers,
    )
    praxis_id = sub_resp.json()["id"]

    await client.post(
        f"/praxes/{praxis_id}/flag",
        json={"reason": "harassment"},
        headers=auth_headers2,
    )

    resp = await client.get("/admin/praxes/flagged", headers=auth_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert praxis_id in ids

    #237, ADR-0037
    row = next(p for p in resp.json() if p["id"] == praxis_id)
    assert [flag["reason"] for flag in row["flags"]] == ["harassment"]
    assert row["flags"][0]["reason_detail"] is None
    assert row["flags"][0]["flagged_by_name"] == character2.display_name
    # The card moderates its author through the existing ban/suspend routes.
    assert row["author_account_id"] == character.account_id
    assert row["author_flagged_count"] == 1
    assert row["author_username"] == character.username
    assert row["author_status"] == "active"
    assert row["author_account_status"] == "active"


@pytest.mark.asyncio
async def test_flag_reason_outside_vocabulary_rejected(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    sub_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "title": "Flaggable"},
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
    active_task: Task,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    sub_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "title": "Host praxis"},
        headers=auth_headers,
    )
    praxis_id = sub_resp.json()["id"]
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    # Comment is level-gated; lift after submit, which recalculates level.
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

    flag_resp = await client.post(
        f"/comments/{comment_id}/flag",
        # A note spelling an enum value must not collapse into that reason (#3433).
        json={"reason": "other", "reason_detail": "spam"},
        headers=auth_headers2,
    )
    assert flag_resp.status_code == 200, flag_resp.text

    resp = await client.get("/admin/comments/flagged", headers=auth_headers)
    assert resp.status_code == 200
    row = next(c for c in resp.json() if c["id"] == comment_id)
    assert row["flags"][0]["reason"] == "other"
    assert row["flags"][0]["reason_detail"] == "spam"
    assert row["flags"][0]["flagged_by_name"] == character2.display_name




@pytest.mark.asyncio
async def test_admin_patch_character_stats(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
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
    """A ban destroys nothing on disk (#1568): moderation must not shred its evidence,
    and unbanning must restore an intact character.
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
async def test_people_search_by_email_and_status_columns(
    client: AsyncClient,
    account: Account,
    account2: Account,
    character: Character,
    era: Era,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    account2.status = AccountStatus.suspended
    other = await make_character(db_session, era, username="other_p", account=account2)
    await db_session.commit()

    rows = (
        await client.get(
            "/admin/characters",
            params={"search": account2.email[:6]},
            headers=auth_headers,
        )
    ).json()
    assert [r["id"] for r in rows] == [other.id]
    assert rows[0]["account_status"] == "suspended" and rows[0]["votes_cast"] == 0
    assert "email" not in rows[0]


@pytest.mark.asyncio
async def test_people_list_is_admin_only(
    client: AsyncClient, character: Character, auth_headers2: dict
):
    resp = await client.get("/admin/characters", headers=auth_headers2)
    assert resp.status_code == 403


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
    await make_admin(db_session, account)

    msg = ContactMessage(name="Tester", email="t@t.com", message="Hello")
    db_session.add(msg)
    await db_session.commit()

    resp = await client.get("/admin/messages", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    msg_id = resp.json()[0]["id"]
    archive_resp = await client.patch(
        f"/admin/messages/{msg_id}/archive", headers=auth_headers
    )
    assert archive_resp.status_code == 200
    assert archive_resp.json()["is_archived"] is True




@pytest.mark.asyncio
async def test_admin_moderate_praxis_failed_direct(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
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
    await make_admin(db_session, account)

    resp = await client.patch(
        "/admin/praxes/999999/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert resp.status_code == 404




@pytest.mark.asyncio
async def test_admin_list_characters_filter_faction(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
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
    await make_admin(db_session, account)

    resp = await client.get("/admin/characters?faction=nonexistent", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []






@pytest.mark.asyncio
async def test_admin_edit_pending_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    task = Task(
        title="Original Title",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by_id=character.id,
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
    """Admin can move a task to another of the era's factions (#1714)."""
    await make_admin(db_session, account)

    task = Task(
        title="Filed Against The Wrong Faction",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by_id=character.id,
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

    # The cross-faction sentinel is a real slug in config.
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
    await make_admin(db_session, account)

    task = Task(
        title="Untouched",
        point_value=5,
        level_required=0,
        status=TaskStatus.pending,
        created_by_id=character.id,
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


# --- Vote budget recompute + era reset semantics (R.5) ---


@pytest.mark.asyncio
async def test_admin_patch_stats_recomputes_votes_available(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
):
    from math import floor

    from sqlalchemy import select

    from game_config import CURRENT_ERA

    await make_admin(db_session, account)

    patch_resp = await client.patch(
        f"/admin/characters/{character.id}/stats",
        json={"score": 0, "votes_available": 5},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["votes_available"] == 5

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
    from math import floor

    from sqlalchemy import select

    from game_config import CURRENT_ERA

    await make_admin(db_session, account)

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

    assert CURRENT_ERA.reset_vote_budget is True

    # The behaviour under test is apply_era_reset's reset_vote_budget branch.
    from models.era import Era as EraModel
    from services.era import apply_era_reset

    new_era_row = EraModel(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
    )
    db_session.add(new_era_row)
    await db_session.flush()
    await apply_era_reset([character], new_era_row, db_session)

    new_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == new_era_row.id,
        )
    )
    new_stats = new_result.scalar_one()
    await db_session.refresh(new_stats)
    assert new_stats.votes_spent_this_era == 0

    # reset_score=True on ERA_1: new-era score is 0, so budget == base.
    expected_budget = CURRENT_ERA.vote_budget_base + floor(
        CURRENT_ERA.vote_budget_multiplier * new_stats.score
    )
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

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.votes_spent_this_era = 9
    await db_session.commit()

    # Service called directly with an EraConfig that disables reset_vote_budget.
    new_era_row = EraModel(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
    )
    db_session.add(new_era_row)
    await db_session.flush()

    preserving_era = replace(CURRENT_ERA, reset_vote_budget=False)
    await apply_era_reset([character], new_era_row, db_session, era=preserving_era)

    new_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == new_era_row.id,
        )
    )
    new_stats = new_result.scalar_one()
    await db_session.refresh(new_stats)
    assert new_stats.votes_spent_this_era == 9


# --- Notes to admin (#1823) ---
# Assert the round trip, and that the note travels no further than the queue.


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
    """`notes` lives only on admin ``PendingTaskOut``; TaskOut must never carry it.

    Read as an ADMIN: since #1725 a fresh proposal 404s at `GET /tasks/{id}` for
    everyone else, and not even an admin gets `notes` off the public payload.
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


@pytest.mark.asyncio
async def test_overview_active_accounts_counts_accounts_not_characters(
    client: AsyncClient,
    account: Account,
    era,
    some_faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    two_lives = await make_account(db_session, "two@example.com")
    await make_character(db_session, era, username="first", account=two_lives)
    await make_character(db_session, era, username="second", account=two_lives)
    await make_character(
        db_session,
        era,
        username="banned",
        status=CharacterStatus.banned,
    )
    suspended = await make_character(db_session, era, username="sus")
    suspended_account = await db_session.get(Account, suspended.account_id)
    suspended_account.status = AccountStatus.suspended
    await db_session.commit()

    stats = (await client.get("/admin/overview", headers=auth_headers)).json()
    assert stats["characters"] == 4
    assert stats["active_accounts"] == 1


@pytest.mark.asyncio
async def test_remove_flagged_hides_only_the_authors_flagged_posts(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    ids = []
    for title in ("one", "two", "unflagged"):
        task = await make_task(db_session, character, title=title, commit=True)
        created = await client.post(
            "/praxes",
            json={"task_id": task.id, "title": title},
            headers=auth_headers,
        )
        ids.append(created.json()["id"])
    for praxis_id in ids[:2]:
        flagged = await client.post(
            f"/praxes/{praxis_id}/flag", json={"reason": "spam"}, headers=auth_headers2
        )
        assert flagged.status_code == 200, flagged.text

    resp = await client.post(
        f"/admin/characters/{character.id}/praxes/remove-flagged",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json() == {"removed": 2}
    states = {
        praxis.id: praxis.moderation_status.value
        for praxis in (
            await db_session.execute(select(Praxis).where(Praxis.id.in_(ids)))
        ).scalars()
    }
    assert [states[i] for i in ids] == ["hidden", "hidden", "visible"]

    missing = await client.post(
        "/admin/characters/999999/praxes/remove-flagged", headers=auth_headers
    )
    assert missing.status_code == 404


async def _stored(db_session, character) -> tuple[int, int, int]:
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    await db_session.refresh(stats)
    await db_session.refresh(character)
    return stats.score, stats.level, character.all_time_score


async def _doer_on_retired_task(
    db_session, era, creator, *, task_kw=None, meta=None
):
    """A doer with a settled score on a retired task (``meta`` attached when given)."""
    doer = await make_character(db_session, era, username="doer")
    task = await make_task(
        db_session, creator, status=TaskStatus.retired, **(task_kw or {})
    )
    praxis = await make_solo_praxis(
        db_session, meta[0] if meta else task, doer
    )
    if meta:
        db_session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=task.id))
    await recalculate_character_stats(doer.id, db_session)
    await db_session.commit()
    return doer, task


async def _patch_and_compare(client, auth_headers, db_session, doer, task, body):
    before = await _stored(db_session, doer)
    resp = await client.patch(
        f"/admin/tasks/{task.id}", json=body, headers=auth_headers
    )
    assert resp.status_code == 200
    after = await _stored(db_session, doer)
    await recalculate_character_stats(doer.id, db_session)
    assert after == await _stored(db_session, doer)
    return before, after


@pytest.mark.asyncio
@pytest.mark.parametrize("new_points", [50, 1])
async def test_admin_edit_task_points_rescores_doers(
    client, account, character, era, auth_headers, db_session, new_points
):
    await make_admin(db_session, account)
    doer, task = await _doer_on_retired_task(
        db_session, era, character, task_kw={"point_value": 10}
    )
    before, after = await _patch_and_compare(
        client, auth_headers, db_session, doer, task, {"point_value": new_points}
    )
    assert before[0] > 0
    assert (after[0] > before[0]) == (new_points > 10)
    assert after[0] != before[0]
    assert after[2] - before[2] == after[0] - before[0]


@pytest.mark.asyncio
async def test_admin_edit_task_faction_rescores_doers(
    client, account, character, era, auth_headers, db_session, monkeypatch
):
    await make_admin(db_session, account)
    other = real_faction_slugs(CURRENT_ERA)[1]
    # Every Era 1 faction multiplies by 1.0, so make the other-task case differ.
    monkeypatch.setattr(
        "services.praxis_scoring.compute_faction_multiplier",
        lambda mine, task_faction, *a, **k: 1.0 if task_faction == mine else 3.0,
    )
    doer, task = await _doer_on_retired_task(db_session, era, character)
    before, after = await _patch_and_compare(
        client, auth_headers, db_session, doer, task, {"primary_faction_slug": other}
    )
    assert after[0] != before[0]


@pytest.mark.asyncio
@pytest.mark.parametrize("field,value", [("point_value", 50), ("level_required", 99)])
async def test_admin_edit_metatask_rescores_applied_praxis_authors(
    client, account, character, era, auth_headers, db_session, field, value
):
    await make_admin(db_session, account)
    parent = await make_task(db_session, character)
    doer, meta = await _doer_on_retired_task(
        db_session,
        era,
        character,
        task_kw={"task_type": TaskType.metatask, "point_value": 10},
        meta=(parent,),
    )
    before, after = await _patch_and_compare(
        client, auth_headers, db_session, doer, meta, {field: value}
    )
    assert after[0] != before[0]


@pytest.mark.asyncio
async def test_admin_edit_task_text_only_does_not_rescore(
    client, account, character, era, auth_headers, db_session, monkeypatch
):
    await make_admin(db_session, account)
    doer, task = await _doer_on_retired_task(db_session, era, character)
    calls = []

    async def spy(*a, **k):
        calls.append(a)

    monkeypatch.setattr("services.admin_service.recalculate_character_stats", spy)
    resp = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"title": "New", "description": "New", "point_value": task.point_value},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert calls == []
