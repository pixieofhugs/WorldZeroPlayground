"""Rows that claim a lifecycle state must carry that state's facts (#3450).

Core inserts: the ORM-level fixtures stamp these for tests (conftest).
"""
import pytest
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskType
from tests.integration.factories import make_solo_praxis


async def _refused(session: AsyncSession, statement) -> str:
    savepoint = await session.begin_nested()
    try:
        await session.execute(statement)
    except IntegrityError as error:
        await savepoint.rollback()
        return str(error)
    pytest.fail("the CHECK let the row in")


@pytest.mark.asyncio
async def test_a_sealed_praxis_needs_its_seal_stamps(
    db_session: AsyncSession, character: Character, active_task: Task, era: Era
) -> None:
    sealed = {
        "task_id": active_task.id,
        "created_by_id": character.id,
        "type": PraxisType.solo,
        "status": PraxisStatus.submitted,
    }
    message = await _refused(db_session, insert(Praxis).values(**sealed))
    assert "ck_praxis_submitted_has_stamps" in message
    await db_session.execute(
        insert(Praxis).values(**sealed, submitted_at=era.started_at, era_id=era.id)
    )


@pytest.mark.asyncio
async def test_a_duel_state_needs_its_facts(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
) -> None:
    challenger = await make_solo_praxis(db_session, active_task, character)
    base = {
        "task_id": active_task.id,
        "challenger_praxis_id": challenger.id,
        "opponent_character_id": character2.id,
    }
    declined = insert(Duel).values(**base, status=DuelStatus.declined)
    assert "ck_duel_declined_has_declined_at" in await _refused(db_session, declined)
    active = insert(Duel).values(**base, status=DuelStatus.active)
    assert "ck_duel_accepted_has_acceptance" in await _refused(db_session, active)
    resolved = insert(Duel).values(
        **base,
        status=DuelStatus.resolved,
        opponent_praxis_id=challenger.id,
        accepted_at=challenger.created_at,
    )
    assert "ck_duel_resolved_has_resolution" in await _refused(db_session, resolved)


@pytest.mark.asyncio
async def test_a_metatask_names_its_faction_and_a_standard_task_does_not(
    db_session: AsyncSession, character: Character
) -> None:
    base = {
        "title": "t",
        "point_value": 1,
        "level_required": 0,
        "created_by_id": character.id,
    }
    bare_meta = insert(Task).values(**base, task_type=TaskType.metatask)
    assert "ck_task_metatask_faction_iff_metatask" in await _refused(
        db_session, bare_meta
    )
    standard_with_faction = insert(Task).values(
        **base, task_type=TaskType.standard, metatask_faction_slug="na"
    )
    assert "ck_task_metatask_faction_iff_metatask" in await _refused(
        db_session, standard_with_faction
    )
