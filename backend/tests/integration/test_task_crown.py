"""Integration tests for the Task Crown (ADR-0028, #354).

The crown (``is_top_for_task``) marks the top-scoring **submitted** praxis for
its task, computed live from vote-points. Fully permissive: ties are all
crowned (including the all-zero-votes case), a sole entrant is crowned by
default, and ``in_progress`` praxes never compete.
"""
import pytest
from httpx import AsyncClient

from models.character import Character
from models.task import Task


async def _create_and_submit_praxis(
    client: AsyncClient, task_id: int, title: str, headers: dict
) -> int:
    create_resp = await client.post(
        "/praxes",
        json={"task_id": task_id, "type": "solo", "title": title},
        headers=headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submit_resp.status_code == 200
    return praxis_id


async def _crown_by_id(client: AsyncClient, task_id: int, headers: dict | None = None) -> dict[int, bool]:
    list_resp = await client.get(
        "/praxes", params={"task_id": task_id}, headers=headers or {}
    )
    assert list_resp.status_code == 200
    return {card["id"]: card["is_top_for_task"] for card in list_resp.json()}


@pytest.mark.asyncio
async def test_sole_entrant_is_crowned(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A task's only submitted praxis holds the crown, zero votes required."""
    praxis_id = await _create_and_submit_praxis(
        client, active_task.id, "Sole entrant", auth_headers2
    )

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis_id: True}

    # The detail read (PraxisOut) carries the same flag.
    detail_resp = await client.get(f"/praxes/{praxis_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["is_top_for_task"] is True


@pytest.mark.asyncio
async def test_higher_vote_praxis_takes_the_crown(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Votes decide the crown; the out-voted praxis loses it."""
    praxis1_id = await _create_and_submit_praxis(
        client, active_task.id, "Challenger", auth_headers
    )
    praxis2_id = await _create_and_submit_praxis(
        client, active_task.id, "Champion", auth_headers2
    )

    # Fresh field: zero votes each is a tie — both crowned (ADR-0028).
    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: True, praxis2_id: True}

    # character votes on character2's praxis (cross-account, so allowed).
    vote_resp = await client.post(
        f"/praxes/{praxis2_id}/vote", json={"value": 4}, headers=auth_headers
    )
    assert vote_resp.status_code == 200

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: False, praxis2_id: True}


@pytest.mark.asyncio
async def test_tied_vote_points_crown_all(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Equal non-zero vote-points → co-champions, all crowned."""
    praxis1_id = await _create_and_submit_praxis(
        client, active_task.id, "Co-champion A", auth_headers
    )
    praxis2_id = await _create_and_submit_praxis(
        client, active_task.id, "Co-champion B", auth_headers2
    )

    resp = await client.post(
        f"/praxes/{praxis2_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert resp.status_code == 200
    resp = await client.post(
        f"/praxes/{praxis1_id}/vote", json={"value": 3}, headers=auth_headers2
    )
    assert resp.status_code == 200

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: True, praxis2_id: True}


@pytest.mark.asyncio
async def test_in_progress_praxis_neither_competes_nor_wears_the_crown(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Only submitted praxes compete; a draft is never crowned."""
    # character's praxis stays in_progress (visible only to its member).
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Still drafting"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    draft_id = create_resp.json()["id"]

    submitted_id = await _create_and_submit_praxis(
        client, active_task.id, "Published", auth_headers2
    )

    # Viewer = draft member, so the list shows both cards (ADR-0024).
    crowns = await _crown_by_id(client, active_task.id, headers=auth_headers)
    assert crowns == {draft_id: False, submitted_id: True}
