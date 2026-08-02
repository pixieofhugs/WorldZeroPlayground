"""``praxis.era_id`` is stamped on the transition to ``submitted`` (#1398).

The column exists so that "which era does this praxis's score belong to?" is a
recorded fact rather than a timestamp comparison. It cannot be derived after the
event: ``services.era.apply_era_reset`` inserts the new ``Era`` row inside the
transaction that closes the old one, so a praxis sealed near a boundary
timestamps on the wrong side of ``era.started_at`` — the identical trap
``duel.resolved_era_id`` was added for (#823).

Nothing reads the column yet. #1345's era-bounded score recalculation is the
consumer and ships separately, which is exactly why the write needs its own
test: an unread column that is written wrong is invisible until the reader
lands, and by then the wrong values are already in the table.

The seam is ``services.collab_consensus._apply_seal`` — the single writer of the
transition into ``submitted``, and therefore of ``submitted_at`` and ``era_id``
alike. These tests drive it through the API so the pairing is asserted on the
real path, not on a direct call.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.praxis import Praxis, PraxisStatus
from models.task import Task


async def _create_solo(client: AsyncClient, task: Task, headers: dict, title: str) -> int:
    response = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": title},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_open_praxis_carries_no_era(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """NULL while in progress: era membership is a seal-time fact, not a create-time one."""
    praxis_id = await _create_solo(client, active_task, auth_headers, "Still Drafting")

    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis is not None
    assert praxis.status == PraxisStatus.in_progress
    assert praxis.era_id is None


@pytest.mark.asyncio
async def test_submit_stamps_the_current_era(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """Sealing writes ``era_id`` and ``submitted_at`` together."""
    praxis_id = await _create_solo(client, active_task, auth_headers, "Sealed")

    response = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert response.status_code == 200

    praxis = await db_session.get(Praxis, praxis_id)
    await db_session.refresh(praxis)
    assert praxis.status == PraxisStatus.submitted
    assert praxis.submitted_at is not None
    assert praxis.era_id == era.id


@pytest.mark.asyncio
async def test_resubmitting_restamps_the_era(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """A second seal re-stamps rather than keeping the first era.

    The stamp moves with ``submitted_at`` on purpose: an unsubmit that outlives
    an era reset must not leave the praxis attributed to the era it was pulled
    out of. Asserted against a second ``Era`` row so "it re-stamps" is
    distinguishable from "it never changed".
    """
    praxis_id = await _create_solo(client, active_task, auth_headers, "Resealed")
    assert (
        await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    ).status_code == 200

    praxis = await db_session.get(Praxis, praxis_id)
    await db_session.refresh(praxis)
    assert praxis.era_id == era.id

    later_era = Era(
        name="Era Two",
        config_key=era.config_key,
        started_by=era.started_by,
    )
    db_session.add(later_era)
    await db_session.commit()

    assert (
        await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    ).status_code == 200
    assert (
        await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    ).status_code == 200

    praxis = await db_session.get(Praxis, praxis_id)
    await db_session.refresh(praxis)
    assert praxis.era_id == later_era.id
