"""``praxis.era_id`` is stamped on the transition to ``submitted`` (#1398).

Not derivable later: ``apply_era_reset`` inserts the new ``Era`` inside the
closing transaction, so timestamps near a boundary land on the wrong side (same
trap as ``duel.resolved_era_id``, #823). Writer: ``collab_consensus._apply_seal``.
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
    """NULL while in progress: era membership is a seal-time fact."""
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
    """A second seal re-stamps: an unsubmit across a reset must not keep the old era."""
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
