"""#330 — the single sign-up eligibility predicate (evaluate_signup).

The predicate is the test surface (ADR-0008): one place asserts each denial
reason, and the regression pins the can_sign_up flag to the bank cap it
previously omitted.
"""
from dataclasses import replace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from services.praxis import (
    SignupDenialReason,
    can_sign_up_for_task,
    evaluate_signup,
)
from tests.integration.factories import make_task


async def _seed_in_progress_praxis(
    db_session: AsyncSession, character: Character, task: Task
) -> None:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="wip",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()


async def _make_task(
    db_session: AsyncSession,
    character: Character,
    *,
    level_required: int = 0,
    status: TaskStatus = TaskStatus.active,
    task_type: TaskType = TaskType.standard,
) -> Task:
    return await make_task(
        db_session,
        character,
        title="Extra Task",
        description="",
        point_value=5,
        level_required=level_required,
        status=status,
        task_type=task_type,
        commit=True,
    )
@pytest.mark.asyncio
async def test_evaluate_signup_allowed(
    db_session: AsyncSession, character: Character, active_task: Task, era: Era, some_faction: Faction
):
    result = await evaluate_signup(character, active_task, db_session)
    assert result.allowed is True
    assert result.reason is None


@pytest.mark.asyncio
async def test_evaluate_signup_anonymous_not_allowed(
    db_session: AsyncSession, active_task: Task, era: Era, some_faction: Faction
):
    result = await evaluate_signup(None, active_task, db_session)
    assert result.allowed is False


@pytest.mark.asyncio
async def test_evaluate_signup_below_level(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    hard_task = await _make_task(db_session, character, level_required=5)
    result = await evaluate_signup(character, hard_task, db_session)
    assert result.allowed is False
    assert result.reason is SignupDenialReason.below_level


@pytest.mark.asyncio
async def test_evaluate_signup_task_status_closed(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    retired = await _make_task(db_session, character, status=TaskStatus.retired)
    result = await evaluate_signup(character, retired, db_session)
    assert result.allowed is False
    assert result.reason is SignupDenialReason.task_status_closed


@pytest.mark.asyncio
async def test_evaluate_signup_metatask_rejected(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    """Metatasks are seals applied to a praxis, never signup targets (#1001).

    The gate fires before level/status work, so an otherwise-eligible character
    is still denied purely on task_type.
    """
    metatask = await _make_task(db_session, character, task_type=TaskType.metatask)
    result = await evaluate_signup(character, metatask, db_session)
    assert result.allowed is False
    assert result.reason is SignupDenialReason.is_metatask


@pytest.mark.asyncio
async def test_evaluate_signup_already_active_member(
    db_session: AsyncSession, character: Character, active_task: Task, era: Era, some_faction: Faction
):
    await _seed_in_progress_praxis(db_session, character, active_task)
    result = await evaluate_signup(character, active_task, db_session)
    assert result.allowed is False
    assert result.reason is SignupDenialReason.already_active_member


@pytest.mark.asyncio
async def test_evaluate_signup_bank_full(
    db_session: AsyncSession, character: Character, active_task: Task, era: Era, some_faction: Faction
):
    # One in-progress praxis on active_task; evaluate a DIFFERENT task with cap=1
    # so the bank-cap gate (not active-member) is the one that fires.
    await _seed_in_progress_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character)
    capped = replace(CURRENT_ERA, max_task_signups=1)
    result = await evaluate_signup(character, other, db_session, capped)
    assert result.allowed is False
    assert result.reason is SignupDenialReason.bank_full


@pytest.mark.asyncio
async def test_can_submit_flag_false_when_bank_full(
    db_session: AsyncSession, character: Character, active_task: Task, era: Era, some_faction: Faction
):
    """Regression: the can_sign_up flag now reflects the bank cap.

    Before #330 the flag omitted the bank cap, so a full-bank character got
    can_sign_up=True and the sign-up button lied.
    """
    await _seed_in_progress_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character)
    capped = replace(CURRENT_ERA, max_task_signups=1)
    assert await can_sign_up_for_task(character, other, db_session, capped) is False
