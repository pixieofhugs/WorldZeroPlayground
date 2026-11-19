"""Submitting needs proof (#3473)."""
import pytest
from httpx import AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.praxis import MediaItem, Praxis, PraxisStatus
from models.task import Task
from tests.integration.factories import attach_proof, make_admin

pytestmark = [pytest.mark.asyncio, pytest.mark.proof_rule]


async def _draft(
    client: AsyncClient, headers: dict, task: Task, *, praxis_type: str = "solo"
) -> int:
    response = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": praxis_type, "title": "t"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _give_proof(db_session: AsyncSession, praxis_id: int) -> None:
    praxis = await db_session.get(Praxis, praxis_id)
    await attach_proof(db_session, praxis)
    await db_session.commit()


def _code(response) -> str:
    return response.json()["detail"]["code"]


async def test_no_media_is_refused_and_scores_nothing(
    client: AsyncClient, db_session: AsyncSession, active_task: Task, auth_headers: dict
):
    praxis_id = await _draft(client, auth_headers, active_task)
    refused = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert refused.status_code == 422
    assert _code(refused) == "PRAXIS_NEEDS_PROOF"
    praxis = await db_session.get(Praxis, praxis_id)
    await db_session.refresh(praxis)
    assert praxis.status == PraxisStatus.in_progress
    assert praxis.submitted_at is None

    await _give_proof(db_session, praxis_id)
    accepted = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "submitted"


async def test_admin_may_submit_without_media(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    active_task: Task,
    auth_headers: dict,
):
    await make_admin(db_session, account)
    praxis_id = await _draft(client, auth_headers, active_task)
    response = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    assert response.status_code == 200


async def test_last_media_of_a_submitted_praxis_cannot_be_deleted(
    client: AsyncClient, db_session: AsyncSession, active_task: Task, auth_headers: dict
):
    praxis_id = await _draft(client, auth_headers, active_task)
    await _give_proof(db_session, praxis_id)
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    media_id = await db_session.scalar(
        select(MediaItem.id).where(MediaItem.praxis_id == praxis_id)
    )
    refused = await client.delete(
        f"/praxes/{praxis_id}/media/{media_id}", headers=auth_headers
    )
    assert refused.status_code == 422
    assert _code(refused) == "PRAXIS_NEEDS_PROOF"
    assert await db_session.scalar(
        select(func.count()).select_from(MediaItem).where(MediaItem.praxis_id == praxis_id)
    ) == 1


async def test_a_collab_needs_one_media_item_from_any_member(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers: dict,
    praxis_collab: Praxis,
):
    # The fixture's media row stands for another member's upload; take it away first.
    await db_session.execute(delete(MediaItem).where(MediaItem.praxis_id == praxis_collab.id))
    await db_session.commit()
    refused = await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    assert _code(refused) == "PRAXIS_NEEDS_PROOF"

    await attach_proof(db_session, praxis_collab)
    await db_session.commit()
    proposed = await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    assert proposed.status_code == 200
    assert proposed.json()["status"] == "pending"
