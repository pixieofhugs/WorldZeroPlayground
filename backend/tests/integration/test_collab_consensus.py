"""Done / Propose / Approve stay split (ADR-0079, #1810), via the consensus routes.

Cancel-on-edit is tested at the room (``test_praxis_room.py``); pending-window
mechanics in ``test_praxes.py``.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis
from models.task import Task


def _member(body: dict, character_id: int) -> dict:
    return next(m for m in body["members"] if m["character_id"] == character_id)


# Done — social only


@pytest.mark.asyncio
async def test_marking_done_changes_nothing_else(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Done gates nothing and starts nothing (ADR-0079)."""
    before = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers)
    assert before.json()["status"] == "in_progress"

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/done",
        json={"is_done": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert not any(m["has_submitted"] for m in body["members"])
    assert all(m["submitted_at"] is None for m in body["members"])
    assert _member(body, character.id)["character_id"] == character.id
    assert _member(body, character2.id)["has_submitted"] is False


@pytest.mark.asyncio
async def test_done_is_reversible(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Asserted on the wire and on the row: the wire must mirror the column."""
    for value in (True, False, True):
        resp = await client.post(
            f"/praxes/{praxis_collab.id}/done",
            json={"is_done": value},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        wire = next(
            m for m in resp.json()["members"] if m["character_id"] == character.id
        )
        assert wire["is_done"] is value

        await db_session.commit()
        praxis = await db_session.get(Praxis, praxis_collab.id)
        await db_session.refresh(praxis)
        row = next(m for m in praxis.members if m.character_id == character.id)
        assert row.is_done is value


@pytest.mark.asyncio
async def test_a_cancelled_proposal_leaves_done_alone(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Withdraw clears approvals, not Done; clearing Done would re-merge the flags."""
    await client.post(
        f"/praxes/{praxis_collab.id}/done", json={"is_done": True}, headers=auth_headers
    )
    proposed = await client.post(
        f"/praxes/{praxis_collab.id}/submit", headers=auth_headers
    )
    assert proposed.json()["status"] == "pending"

    withdrawn = await client.post(
        f"/praxes/{praxis_collab.id}/unsubmit", headers=auth_headers2
    )
    assert withdrawn.status_code == 200, withdrawn.text
    assert not any(m["has_submitted"] for m in withdrawn.json()["members"])

    await db_session.commit()
    praxis = await db_session.get(Praxis, praxis_collab.id)
    await db_session.refresh(praxis)
    row = next(m for m in praxis.members if m.character_id == character.id)
    assert row.is_done is True


@pytest.mark.asyncio
async def test_done_on_a_solo_praxis_publishes_nothing(
    client: AsyncClient,
    active_task: Task,
    auth_headers: dict,
):
    """One member means ``all(approved)`` holds on any consent; Done must record none.

    Covers duels too (two solo praxes, ADR-0011).
    """
    created = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Alone"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text

    resp = await client.post(
        f"/praxes/{created.json()['id']}/done",
        json={"is_done": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["status"] == "in_progress"
    assert body["submitted_at"] is None
    assert body["submit_proposed_at"] is None
    assert not any(m["has_submitted"] for m in body["members"])


@pytest.mark.asyncio
async def test_a_non_member_cannot_mark_done(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers3: dict,
):
    resp = await client.post(
        f"/praxes/{praxis_collab.id}/done",
        json={"is_done": True},
        headers=auth_headers3,
    )
    assert resp.status_code == 403, resp.text


# Propose / Approve / Withdraw


@pytest.mark.asyncio
async def test_the_proposer_implicitly_approves(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Otherwise the proposer would be a holdout against their own proposal."""
    resp = await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    body = resp.json()

    assert body["status"] == "pending"
    assert body["submit_proposed_at"] is not None
    assert _member(body, character.id)["has_submitted"] is True
    assert _member(body, character2.id)["has_submitted"] is False


@pytest.mark.asyncio
async def test_withdraw_returns_the_collab_to_drafting(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Any member may withdraw — here the non-proposer."""
    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/unsubmit", headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert not any(m["has_submitted"] for m in body["members"])
    assert all(m["submitted_at"] is None for m in body["members"])


@pytest.mark.asyncio
async def test_silence_publishes_the_praxis_the_window_was_opened_on(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
    active_task: Task,
):
    from game_config import CURRENT_ERA

    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)

    praxis = await db_session.get(Praxis, praxis_collab.id)
    praxis.submit_proposed_at = datetime.now(timezone.utc) - timedelta(
        days=CURRENT_ERA.collab_auto_submit_days, seconds=1
    )
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_collab.id}")
    assert resp.json()["status"] == "submitted"
