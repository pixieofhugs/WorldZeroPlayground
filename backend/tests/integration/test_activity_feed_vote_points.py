"""#2199 — the vote notification's number must be the number on the praxis.

**The seam under test** is ``GET /activity-feed`` →
:func:`services.activity_feed.get_activity_feed`, specifically the
``points_earned`` field of the ``vote_on_mine`` / ``vote_changed_on_mine``
payload — the "+N pts" the row prints.

The defect was arithmetic invented at the payload: ``value * task_point_value``,
a product where the score is a sum. The reporter was told 120 and found 34.

The assertion is deliberately NOT ``points_earned == base + stars``: that is the
same class of mistake, a formula restated at a second site, and it would go
quietly wrong the moment a metatask, a faction modifier or a duel outcome joins
the sum. The praxis detail route already publishes the authoritative total
(``PraxisOut.score``, ADR-0053), so these tests pin the two surfaces *to each
other* — which is exactly what the reporter did by clicking through.
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
async def test_vote_notification_prints_the_praxis_score_not_a_product(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The bell and the praxis page agree — the whole of #2199."""
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated once")

    stars = 4
    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": stars}, headers=auth_headers2
    )
    assert vote.status_code == 200, vote.text

    row = await _one_vote_row(client, auth_headers, "vote_on_mine")
    score = await _praxis_score(client, praxis_id, auth_headers)

    assert row["payload"]["points_earned"] == score, (
        "the notification and the praxis page must print the same total; "
        f"feed said {row['payload']['points_earned']}, praxis says {score}"
    )
    # The product this replaced, spelled out so the regression cannot creep back
    # in behind an equality that a coincidence also satisfies.
    assert row["payload"]["points_earned"] != stars * active_task.point_value


@pytest.mark.asyncio
async def test_a_changed_vote_reprints_the_score_that_now_stands(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The other half of the vote partition (#1712) reads the same total."""
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated twice")

    for value in (3, 5):
        vote = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": value}, headers=auth_headers2
        )
        assert vote.status_code == 200, vote.text

    row = await _one_vote_row(client, auth_headers, "vote_changed_on_mine")
    score = await _praxis_score(client, praxis_id, auth_headers)

    assert row["payload"]["value"] == 5
    assert row["payload"]["points_earned"] == score


@pytest.mark.asyncio
async def test_the_total_counts_every_voter_not_just_the_one_that_notified(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Two voters, one row each — and both rows print the praxis's whole score.

    This is the assertion a restated ``base + this vote`` would fail: the second
    voter's stars are already in the total the first voter's row prints, because
    the number is the praxis's score and not a per-vote share.
    """
    praxis_id = await _file_praxis(client, active_task, auth_headers, "Rated by two")

    for headers, value in ((auth_headers2, 4), (auth_headers3, 2)):
        vote = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": value}, headers=headers
        )
        assert vote.status_code == 200, vote.text

    rows = await _vote_rows(client, auth_headers, "vote_on_mine")
    assert len(rows) == 2, rows

    score = await _praxis_score(client, praxis_id, auth_headers)
    assert {row["payload"]["points_earned"] for row in rows} == {score}
