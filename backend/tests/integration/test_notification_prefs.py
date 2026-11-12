"""Notification prefs on the wire, and the feed they move (#1047).

``/me/notification-prefs`` resolves ``{}`` to defaults and returns the resolved
save; the "show on Updates" switch is wired into ``/activity-feed`` (list and tab
count move together, requests count does not). Email is storage-only: nothing
sends email yet (#2164). Unit half: ``tests/unit/test_notification_prefs.py``.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.task import Task
from services.notification_prefs import LEVEL_UP


@pytest.mark.asyncio
async def test_a_fresh_account_reads_every_default(
    client: AsyncClient, account: Account, auth_headers: dict
):
    """``notification_prefs = '{}'`` answers all nine rows — no backfill."""
    assert account.notification_prefs == {}

    resp = await client.get("/me/notification-prefs", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()["events"]

    assert len(events) == 9
    assert events["duel_challenge"] == {
        "on_updates": True,
        "by_email": True,
        "locked": True,
    }
    assert events["comment_on_mine"] == {
        "on_updates": True,
        "by_email": True,
        "locked": False,
    }
    assert events["vote_on_mine"] == {
        "on_updates": True,
        "by_email": False,
        "locked": False,
    }
    assert events[LEVEL_UP] == {"on_updates": False, "by_email": False, "locked": True}


@pytest.mark.asyncio
async def test_a_save_round_trips_and_answers_with_what_was_stored(
    client: AsyncClient, auth_headers: dict
):
    save = await client.put(
        "/me/notification-prefs",
        json={"events": {"vote_on_mine": {"on_updates": False, "by_email": True}}},
        headers=auth_headers,
    )
    assert save.status_code == 200
    assert save.json()["events"]["vote_on_mine"] == {
        "on_updates": False,
        "by_email": True,
        "locked": False,
    }
    assert save.json()["events"]["era_announcement"]["on_updates"] is True

    reread = await client.get("/me/notification-prefs", headers=auth_headers)
    assert reread.json()["events"]["vote_on_mine"]["on_updates"] is False


@pytest.mark.asyncio
async def test_a_locked_row_comes_back_on_however_hard_a_client_pushes(
    client: AsyncClient, auth_headers: dict
):
    """The requests section may never be suppressed; the response says so."""
    save = await client.put(
        "/me/notification-prefs",
        json={
            "events": {
                "duel_challenge": {"on_updates": False, "by_email": False},
                "collab_invite": {"on_updates": False, "by_email": False},
                "invitation_letter": {"on_updates": False, "by_email": False},
                "made_up_event": {"on_updates": False, "by_email": False},
            }
        },
        headers=auth_headers,
    )
    assert save.status_code == 200
    events = save.json()["events"]
    assert events["duel_challenge"]["on_updates"] is True
    assert events["collab_invite"]["on_updates"] is True
    assert events["invitation_letter"]["on_updates"] is True
    # The email half of a locked row is the reader's.
    assert events["duel_challenge"]["by_email"] is False
    # Unknown keys are dropped, not 400'd.
    assert "made_up_event" not in events


@pytest.mark.asyncio
async def test_switching_a_row_off_empties_the_list_and_the_badge_together(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """A count that reported the muted row would promise items the list hides."""
    created = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Muted praxis"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    vote = await client.post(
        f"/praxes/{created.json()['id']}/vote",
        json={"value": 4},
        headers=auth_headers2,
    )
    assert vote.status_code == 200

    before = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert any(item["type"] == "vote_on_mine" for item in before.json()["items"])
    assert before.json()["counts"]["your_stuff"] > 0

    off = await client.put(
        "/me/notification-prefs",
        json={"events": {"vote_on_mine": {"on_updates": False, "by_email": False}}},
        headers=auth_headers,
    )
    assert off.status_code == 200

    after = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    data = after.json()
    assert not any(item["type"] == "vote_on_mine" for item in data["items"])
    assert data["counts"]["your_stuff"] == (
        before.json()["counts"]["your_stuff"] - 1
    ), "the badge must drop the row with the list, not keep counting it"
    assert "vote_on_mine" not in data["counts"]["by_type"]


@pytest.mark.asyncio
async def test_a_muted_row_is_still_in_the_archive(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Muting hides from Updates; the archive still shows everything."""
    created = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Archived praxis"},
        headers=auth_headers,
    )
    praxis_id = created.json()["id"]
    await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers2
    )

    live = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    item_key = next(
        item["item_key"]
        for item in live.json()["items"]
        if item["type"] == "vote_on_mine"
    )
    archived = await client.post(
        "/activity-feed/dismiss", json={"item_key": item_key}, headers=auth_headers
    )
    assert archived.status_code == 200

    await client.put(
        "/me/notification-prefs",
        json={"events": {"vote_on_mine": {"on_updates": False, "by_email": False}}},
        headers=auth_headers,
    )

    archive = await client.get(
        "/activity-feed", params={"archived": True}, headers=auth_headers
    )
    assert any(item["item_key"] == item_key for item in archive.json()["items"])


@pytest.mark.asyncio
async def test_muting_never_reaches_the_bell(client: AsyncClient, auth_headers: dict):
    """Muting cannot reach the requests count, checked via the sidebar."""
    before = await client.get("/me/sidebar", headers=auth_headers)
    assert before.status_code == 200

    await client.put(
        "/me/notification-prefs",
        json={
            "events": {
                key: {"on_updates": False, "by_email": False}
                for key in (
                    "duel_challenge",
                    "collab_invite",
                    "invitation_letter",
                    "vote_on_mine",
                    "comment_on_mine",
                    "comment_mention",
                    "era_announcement",
                    "global_task",
                    LEVEL_UP,
                )
            }
        },
        headers=auth_headers,
    )

    after = await client.get("/me/sidebar", headers=auth_headers)
    assert after.status_code == 200
    assert (
        after.json()["pending_requests_count"]
        == before.json()["pending_requests_count"]
    )
