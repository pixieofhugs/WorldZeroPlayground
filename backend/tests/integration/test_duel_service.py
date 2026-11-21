"""Duel acceptance gates only on the flat era.duel_level_required floor, never
task.level_required (ADR-0051, #815).
"""
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import ModerationStatus, Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.duel import respond_to_duel_challenge

import dataclasses

import pytest
from fastapi import HTTPException
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_accept_duel_at_duel_level_but_below_task_level_succeeds(
    db_session: AsyncSession,
    character2: Character,
    era: Era,
) -> None:
    task = Task(
        title="High Level Task",
        description="",
        point_value=10,
        level_required=CURRENT_ERA.duel_level_required + 20,
        status=TaskStatus.active,
        created_by_id=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.flush()

    challenger_praxis = Praxis(
        task_id=task.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        moderation_status=ModerationStatus.visible,
        created_by_id=character2.id,
    )
    db_session.add(challenger_praxis)
    await db_session.flush()

    opponent_account = Account(email="duel-opponent@example.com")
    db_session.add(opponent_account)
    await db_session.flush()

    opponent = Character(
        account_id=opponent_account.id,
        username="duelopponent",
        display_name="Duel Opponent",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(opponent)
    await db_session.flush()

    opponent_stats = CharacterStats(
        character_id=opponent.id,
        era_id=era.id,
        score=0,
        level=CURRENT_ERA.duel_level_required,
        votes_spent_this_era=0,
    )
    db_session.add(opponent_stats)
    await db_session.flush()

    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=opponent.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.commit()
    await db_session.refresh(duel)

    opponent_praxis, updated_duel = await respond_to_duel_challenge(
        duel.id, opponent.id, True, db_session
    )

    assert opponent_praxis is not None
    assert updated_duel.status == DuelStatus.active
    assert updated_duel.opponent_praxis_id == opponent_praxis.id


async def _pending_duel(db_session, character2, era, status, tag):
    task = Task(
        title=f"{tag} task",
        description="",
        point_value=10,
        level_required=0,
        status=status,
        created_by_id=character2.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.flush()
    cp = Praxis(
        task_id=task.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        moderation_status=ModerationStatus.visible,
        created_by_id=character2.id,
    )
    account = Account(email=f"{tag}@example.com")
    db_session.add_all([cp, account])
    await db_session.flush()
    opponent = Character(
        account_id=account.id,
        username=tag,
        display_name=tag,
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(opponent)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=opponent.id,
            era_id=era.id,
            score=0,
            level=CURRENT_ERA.duel_level_required,
            votes_spent_this_era=0,
        )
    )
    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=cp.id,
        opponent_character_id=opponent.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.commit()
    await db_session.refresh(duel)
    return duel, opponent


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status", [TaskStatus.retired, TaskStatus.pending, TaskStatus.deleted]
)
async def test_accept_duel_on_closed_task_is_refused(
    db_session: AsyncSession, character2: Character, era: Era, status: TaskStatus
) -> None:
    duel, opponent = await _pending_duel(
        db_session, character2, era, status, f"closed{status.value}"
    )
    with pytest.raises(HTTPException) as exc:
        await respond_to_duel_challenge(duel.id, opponent.id, True, db_session)
    assert exc.value.status_code == 403
    assert "TASK_NOT_OPEN_FOR_SIGNUP" in str(exc.value.detail)
    await db_session.refresh(duel)
    assert duel.status == DuelStatus.pending
    assert duel.opponent_praxis_id is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status,field",
    [
        (TaskStatus.retired, "allow_praxis_on_retired_task_factions"),
        (TaskStatus.pending, "allow_praxis_on_pending_task_factions"),
    ],
)
async def test_accept_duel_on_closed_task_allowed_for_permitted_faction(
    db_session: AsyncSession,
    character2: Character,
    era: Era,
    status: TaskStatus,
    field: str,
) -> None:
    duel, opponent = await _pending_duel(
        db_session, character2, era, status, f"allowed{status.value}"
    )
    permissive = dataclasses.replace(
        CURRENT_ERA, **{field: frozenset({DEFAULT_FACTION_SLUG})}
    )
    praxis, updated = await respond_to_duel_challenge(
        duel.id, opponent.id, True, db_session, permissive
    )
    assert praxis is not None
    assert updated.status == DuelStatus.active
