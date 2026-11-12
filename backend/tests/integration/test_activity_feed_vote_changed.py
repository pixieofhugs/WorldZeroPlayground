"""#1712: a CHANGED vote gets its own feed row.

The feed is a read-time projection (ADR-0023), driven via ``POST /praxes/{id}/vote``.
Vote sources partition on ``updated_at > created_at``, so a vote is in exactly
one. A separate type, because ``FeedDismissal`` already silences
``vote_on_mine:{id}``.
"""

import pytest
from httpx import AsyncClient

from models.character import Character
from models.task import Task


async def _praxis_and_vote(
    client: AsyncClient,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    value: int,
) -> int:
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Rated twice"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201, create_resp.text
    praxis_id = create_resp.json()["id"]

    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": value}, headers=auth_headers2
    )
    assert vote_resp.status_code == 200, vote_resp.text
    return praxis_id


async def _your_stuff(client: AsyncClient, auth_headers: dict) -> list[dict]:
    resp = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["items"]


def _of_type(items: list[dict], item_type: str) -> list[dict]:
    return [item for item in items if item["type"] == item_type]


@pytest.mark.parametrize(
    ("first", "second"),
    [
        pytest.param(3, 5, id="raised"),
        # The partition is on whether the row was touched, not the direction.
        pytest.param(5, 2, id="lowered"),
    ],
)
@pytest.mark.asyncio
async def test_changing_a_vote_replaces_the_original_row_with_a_changed_one(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    first: int,
    second: int,
):
    praxis_id = await _praxis_and_vote(
        client, active_task, auth_headers, auth_headers2, first
    )

    before = await _your_stuff(client, auth_headers)
    assert len(_of_type(before, "vote_on_mine")) == 1
    assert _of_type(before, "vote_changed_on_mine") == []

    change = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": second}, headers=auth_headers2
    )
    assert change.status_code == 200, change.text

    after = await _your_stuff(client, auth_headers)

    changed = _of_type(after, "vote_changed_on_mine")
    assert len(changed) == 1, f"expected one changed-vote item, got: {after}"
    assert changed[0]["payload"]["value"] == second
    # `value` is this voter's star value (#2402); see test_activity_feed_vote_points.
    assert changed[0]["payload"]["praxis_id"] == praxis_id
    assert changed[0]["actor_display_name"] == character2.display_name

    # The original row is gone, not reprinting the new number under the old headline.
    assert _of_type(after, "vote_on_mine") == [], (
        "the original vote row survived its own change and is now restating "
        f"points nobody was told about: {after}"
    )


@pytest.mark.asyncio
async def test_the_changed_row_arrives_even_if_the_original_was_archived(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Its own TYPE, so a dismissed ``vote_on_mine:{id}`` cannot silence it."""
    praxis_id = await _praxis_and_vote(
        client, active_task, auth_headers, auth_headers2, 2
    )
    vote_item = _of_type(await _your_stuff(client, auth_headers), "vote_on_mine")[0]
    original_key = vote_item["item_key"]

    dismiss = await client.post(
        "/activity-feed/dismiss", json={"item_key": original_key}, headers=auth_headers
    )
    assert dismiss.status_code == 200, dismiss.text
    assert _of_type(await _your_stuff(client, auth_headers), "vote_on_mine") == []

    change = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert change.status_code == 200, change.text

    changed = _of_type(await _your_stuff(client, auth_headers), "vote_changed_on_mine")
    assert len(changed) == 1, "the archived original swallowed the change"
    assert changed[0]["item_key"] != original_key
    assert changed[0]["item_key"].endswith(original_key.split(":", 1)[1])


@pytest.mark.asyncio
async def test_repeated_changes_collapse_into_one_row(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Key is per-vote, not per-revision; see ``_vote_changed_on_mine_query``."""
    praxis_id = await _praxis_and_vote(
        client, active_task, auth_headers, auth_headers2, 1
    )
    for value in (2, 3, 4, 5):
        resp = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": value}, headers=auth_headers2
        )
        assert resp.status_code == 200, resp.text

    changed = _of_type(await _your_stuff(client, auth_headers), "vote_changed_on_mine")
    assert len(changed) == 1, f"four re-rates produced {len(changed)} rows"
    assert changed[0]["payload"]["value"] == 5, "the row is not showing the latest vote"
