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
from tests.integration.factories import cast_vote


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
        started_by_id=era.started_by_id,
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


async def _collab(db_session, task, members, *, proposed_days_ago, proof=True):
    from datetime import datetime, timedelta, timezone

    from models.praxis import PraxisMember, PraxisType
    from tests.integration.factories import attach_proof

    praxis = Praxis(
        task_id=task.id,
        created_by_id=members[0].id,
        type=PraxisType.collab,
        status=PraxisStatus.pending,
        title="Nobody opened me",
        body_text="body",
        submit_proposed_at=datetime.now(timezone.utc)
        - timedelta(days=proposed_days_ago),
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        PraxisMember(praxis_id=praxis.id, character_id=m.id) for m in members
    )
    if proof:
        await attach_proof(db_session, praxis)
    await db_session.commit()
    return praxis


async def _roll(db_session, era, characters=()):
    from datetime import datetime, timedelta, timezone

    from services.era import apply_era_reset

    new_era = Era(
        name="Era Two",
        config_key=era.config_key,
        started_by_id=era.started_by_id,
        started_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db_session.add(new_era)
    await db_session.flush()
    await apply_era_reset(list(characters), new_era, db_session)
    await db_session.commit()
    return new_era


async def _score(db_session, character, era_id):
    from services.era import load_era_stats

    stats = await load_era_stats(character.id, era_id, db_session)
    return stats.score if stats else None


@pytest.mark.asyncio
async def test_roll_seals_a_lapsed_collab_into_the_closing_era(
    db_session, character, character2, active_task, era
):
    from datetime import timedelta

    from game_config import CURRENT_ERA

    days = CURRENT_ERA.collab_auto_submit_days
    praxis = await _collab(
        db_session, active_task, [character], proposed_days_ago=days + 2
    )
    proposed_at = praxis.submit_proposed_at
    await cast_vote(db_session, praxis, character2, 5)
    await db_session.commit()
    new_era = await _roll(db_session, era, [character])

    await db_session.refresh(praxis)
    assert praxis.status == PraxisStatus.submitted
    assert praxis.era_id == era.id
    assert praxis.submitted_at == proposed_at + timedelta(days=days)
    assert await _score(db_session, character, era.id) > 0
    assert await _score(db_session, character, new_era.id) == 0


@pytest.mark.asyncio
async def test_roll_leaves_an_unlapsed_collab_alone(
    db_session, character, active_task, era
):
    praxis = await _collab(db_session, active_task, [character], proposed_days_ago=1)
    await _roll(db_session, era)

    await db_session.refresh(praxis)
    assert praxis.status == PraxisStatus.pending
    assert praxis.era_id is None


@pytest.mark.proof_rule
@pytest.mark.asyncio
async def test_roll_leaves_a_lapsed_collab_without_proof_unsealed(
    db_session, character, active_task, era
):
    from game_config import CURRENT_ERA

    praxis = await _collab(
        db_session,
        active_task,
        [character],
        proposed_days_ago=CURRENT_ERA.collab_auto_submit_days + 2,
        proof=False,
    )
    await _roll(db_session, era)

    await db_session.refresh(praxis)
    assert praxis.status == PraxisStatus.pending
    assert praxis.era_id is None
