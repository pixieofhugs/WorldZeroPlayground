"""A proposer edits or withdraws their own pending proposal (#3771)."""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.mod_action import ModAction
from models.task import Task, TaskStatus
from tests.integration.factories import make_task

BODY = {"title": "Better title", "point_value": 12, "level_required": 1}


@pytest_asyncio.fixture
async def proposer(db_session: AsyncSession, character: Character) -> Character:
    await db_session.execute(
        update(CharacterStats)
        .where(CharacterStats.character_id == character.id)
        .values(level=CURRENT_ERA.level_to_propose_task)
    )
    await db_session.commit()
    return character


async def _pending(db_session: AsyncSession, who: Character) -> Task:
    return await make_task(db_session, who, status=TaskStatus.pending, commit=True)


def _code(resp) -> str:
    return resp.json()["detail"]["code"]


@pytest.mark.asyncio
async def test_proposer_edits_every_field_without_restarting_the_window(
    client: AsyncClient, db_session: AsyncSession, proposer, auth_headers
):
    task = await _pending(db_session, proposer)
    created = task.created_at

    resp = await client.put(
        f"/tasks/{task.id}",
        json={**BODY, "description": "d", "notes": "n"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    await db_session.refresh(task)
    assert (task.title, task.description, task.notes, task.point_value) == (
        "Better title", "d", "n", 12,
    )
    assert task.status == TaskStatus.pending
    assert task.created_at == created


@pytest.mark.asyncio
async def test_edit_reruns_the_level_gate(
    client: AsyncClient, db_session: AsyncSession, proposer, auth_headers
):
    task = await _pending(db_session, proposer)

    resp = await client.put(
        f"/tasks/{task.id}", json={**BODY, "task_type": "metatask"}, headers=auth_headers
    )

    assert resp.status_code == 403
    assert _code(resp) == ErrorCode.metatask_proposal_level_too_low.value


@pytest.mark.asyncio
async def test_edit_refuses_another_character(
    client: AsyncClient, db_session: AsyncSession, proposer, character2, auth_headers2
):
    task = await _pending(db_session, proposer)

    for resp in (
        await client.put(f"/tasks/{task.id}", json=BODY, headers=auth_headers2),
        await client.delete(f"/tasks/{task.id}", headers=auth_headers2),
    ):
        assert resp.status_code == 403
        assert _code(resp) == ErrorCode.task_not_yours.value


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [TaskStatus.active, TaskStatus.deleted])
async def test_refused_once_no_longer_pending(
    client: AsyncClient, db_session: AsyncSession, proposer, auth_headers, status
):
    task = await _pending(db_session, proposer)
    task.status = status
    await db_session.commit()

    for resp in (
        await client.put(f"/tasks/{task.id}", json=BODY, headers=auth_headers),
        await client.delete(f"/tasks/{task.id}", headers=auth_headers),
    ):
        assert resp.status_code == 409
        assert _code(resp) == ErrorCode.task_not_pending.value


@pytest.mark.asyncio
async def test_withdraw_deletes_and_logs_with_the_proposer_as_actor(
    client: AsyncClient, db_session: AsyncSession, proposer, account, auth_headers
):
    task = await _pending(db_session, proposer)

    resp = await client.delete(f"/tasks/{task.id}", headers=auth_headers)

    assert resp.status_code == 204
    await db_session.refresh(task)
    assert task.status == TaskStatus.deleted
    rows = (await db_session.execute(select(ModAction))).scalars().all()
    assert [(r.action, r.target_type, r.target_id, r.actor_account_id) for r in rows] == [
        ("task_withdraw", "task", task.id, account.id)
    ]
