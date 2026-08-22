"""#1712 — a vote the voter CHANGES has to say so, out loud, in its own row.

**The seam under test** is ``GET /activity-feed`` →
:func:`services.activity_feed.get_activity_feed`, driven through the real vote
endpoint (``POST /praxes/{id}/vote``). That is the seam the defect lived at: the
feed is a read-time projection over live rows (ADR-0023), so re-rating a vote
moved the number a player had already been told without emitting anything.

Three things had to be true and none of them were:

1. Changing a vote emits an item at all. ``_vote_on_mine_query`` filtered and
   ordered on ``Vote.created_at``, which a re-rate never moves.
2. It arrives even if the author archived the original vote's notification.
   ``vote_on_mine:{id}`` is the key ``FeedDismissal`` already suppresses, so
   resurfacing under it stays silent — hence a *separate type*.
3. The original row stops rewriting its own points. The two sources partition
   the same table on ``updated_at > created_at``, so a vote is in exactly one
   of them and never re-prints an old headline with a new number.
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
    """character files a solo praxis; character2 rates it. Returns the praxis id."""
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
        # "A vote raised and a vote lowered both notify. The score moved either
        # way." — the source partitions on *whether* the row was touched, never
        # on the direction, so this pair is one code path with two readings.
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
    """The whole defect, end to end: a re-rate is news, and the old row goes."""
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
    # `value` is the whole number the row prints (#2402): what this voter added,
    # which is their star value exactly. The praxis's total is not on the
    # payload. The measured pin lives in test_activity_feed_vote_points.py.
    assert changed[0]["payload"]["praxis_id"] == praxis_id
    assert changed[0]["actor_display_name"] == character2.display_name

    # The original row is GONE, not sitting there quietly printing the new
    # number under the old headline. That silent rewrite is half the bug.
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
    """The reason this is a separate TYPE and not a re-ordered query (#1712).

    ``FeedDismissal`` is unique on ``(character_id, item_key)``, so anything
    resurfacing under ``vote_on_mine:{id}`` resurfaces already-dismissed. The
    changed vote carries its own key and cannot inherit that silence.
    """
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
    # Same source row, different item — which is exactly what lets it through.
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
    """A voter who changes their mind five times is one thread, not five.

    The key is per-vote, not per-revision. See the note on
    ``_vote_changed_on_mine_query`` for why that trade was taken.
    """
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
