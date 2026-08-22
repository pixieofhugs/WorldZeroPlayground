"""#2402 — the vote notification's number is what THAT voter added.

**The seam under test** is ``GET /activity-feed`` →
:func:`services.activity_feed.get_activity_feed`, specifically the ``value``
field of the ``vote_on_mine`` / ``vote_changed_on_mine`` payload — the number
the row's "+N pts" prints.

The reported defect was a row reading ``+19 pts`` under "voted on your praxis"
when the voter had given somewhere between one and five stars: 19 was the
praxis's whole current score (#2199's ``points_earned``, now gone).

These tests restate no formula. Each one **measures** the praxis's score on the
authoritative surface (``PraxisOut.score``, ADR-0053) either side of a vote and
pins the row's number to the movement it caused — so what is under test is the
claim the fix rests on: ``points_from_votes`` is a plain ``sum(Vote.value)``
added after the multipliers, therefore one vote's contribution to the total is
its own star value, exactly. If a metatask, a faction modifier or a duel
outcome ever made that false, these go red.
"""

import pytest
from httpx import AsyncClient

from models.character import Character
from models.task import Task


async def _vote_rows(client: AsyncClient, auth_headers: dict, item_type: str) -> list[dict]:
    resp = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    return [item for item in resp.json()["items"] if item["type"] == item_type]


async def _one_vote_row(client: AsyncClient, auth_headers: dict, item_type: str) -> dict:
    rows = await _vote_rows(client, auth_headers, item_type)
    assert len(rows) == 1, f"expected one {item_type} item, got: {rows}"
    return rows[0]


async def _praxis_score(client: AsyncClient, praxis_id: int, auth_headers: dict) -> float:
    resp = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["score"]


async def _file_praxis(
    client: AsyncClient, active_task: Task, auth_headers: dict, title: str
) -> int:
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": title},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_the_row_prints_what_the_vote_added_not_the_praxis_total(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The number on the row is the movement that vote caused — the whole of #2402."""
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated once")
    before = await _praxis_score(client, praxis_id, auth_headers)

    stars = 4
    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": stars}, headers=auth_headers2
    )
    assert vote.status_code == 200, vote.text

    row = await _one_vote_row(client, auth_headers, "vote_on_mine")
    after = await _praxis_score(client, praxis_id, auth_headers)

    assert row["payload"]["value"] == stars
    assert after - before == pytest.approx(stars), (
        "a vote adds exactly its star value to the praxis score; "
        f"score moved {before} -> {after} on a {stars}-star vote"
    )
    # The praxis total is not on the payload at all any more: it is a different
    # number from the one this row is about, and printing it was the bug.
    assert "points_earned" not in row["payload"]
    assert row["payload"]["value"] != after


@pytest.mark.asyncio
async def test_a_changed_vote_prints_the_value_that_now_stands(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The other half of the vote partition (#1712).

    ponytail: the ceiling is that this row can only ever say what the vote is
    worth now, never that it rose by two — no prior value is stored anywhere.
    The upgrade path is a ``previous_value`` column on ``Vote`` set in
    ``cast_or_update_vote``; deliberately out of scope for #2402.
    """
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated twice")
    before = await _praxis_score(client, praxis_id, auth_headers)

    for value in (3, 5):
        vote = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": value}, headers=auth_headers2
        )
        assert vote.status_code == 200, vote.text

    row = await _one_vote_row(client, auth_headers, "vote_changed_on_mine")
    after = await _praxis_score(client, praxis_id, auth_headers)

    assert row["payload"]["value"] == 5
    assert after - before == pytest.approx(5), (
        "a re-rate replaces the vote, it does not add a second one"
    )


@pytest.mark.asyncio
async def test_two_voters_get_two_different_numbers(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Each row is about its own voter — the assertion #2199's total inverted.

    Under the praxis-total payload both rows printed the same figure, each one
    silently including the other voter's stars. Two voters who gave different
    ratings must reach the author as two different numbers, and the pair of them
    must account for the whole rise in the score.
    """
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated by two")
    before = await _praxis_score(client, praxis_id, auth_headers)

    for headers, value in ((auth_headers2, 4), (auth_headers3, 2)):
        vote = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": value}, headers=headers
        )
        assert vote.status_code == 200, vote.text

    rows = await _vote_rows(client, auth_headers, "vote_on_mine")
    assert len(rows) == 2, rows

    after = await _praxis_score(client, praxis_id, auth_headers)
    printed = sorted(row["payload"]["value"] for row in rows)
    assert printed == [2, 4]
    assert after - before == pytest.approx(sum(printed))
