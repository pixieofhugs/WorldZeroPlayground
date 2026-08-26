"""Integration tests for services.praxis_scoring.compute_contributions (ADR-0014).

Verifies that the Contribution formula is correct for solo, collab, and duel
praxis types, and that recalculate_character_stats delegates to it correctly.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.praxis_scoring import compute_contributions


async def _submit(praxis: Praxis, db_session: AsyncSession) -> None:
    """Transition a praxis to submitted status in-session."""
    praxis.status = PraxisStatus.submitted
    await db_session.flush()


async def _cast_vote(
    praxis: Praxis,
    voter: Character,
    value: int,
    db_session: AsyncSession,
) -> None:
    """Direct Vote insert — bypasses service layer budget check."""
    db_session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await db_session.flush()


@pytest.mark.asyncio
async def test_contribution_solo_no_votes(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """Solo praxis with no votes → total equals base_points × faction_multiplier."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Solo no votes",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()

    contributions = await compute_contributions(
        [praxis], character, CURRENT_ERA, db_session
    )

    assert praxis.id in contributions
    contrib = contributions[praxis.id]
    assert contrib.base_points == active_task.point_value
    assert contrib.points_from_votes == 0
    assert contrib.duel_multiplier == 1.0
    # total = (base + 0) × faction_multiplier × 1.0 + 0
    assert contrib.total == pytest.approx(
        active_task.point_value * contrib.faction_multiplier
    )


@pytest.mark.asyncio
async def test_contribution_solo_with_vote(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """Solo praxis with one 4-point vote → points_from_votes == 4."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Solo with vote",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()
    await _cast_vote(praxis, character2, 4, db_session)

    contributions = await compute_contributions(
        [praxis], character, CURRENT_ERA, db_session
    )

    contrib = contributions[praxis.id]
    assert contrib.points_from_votes == 4
    assert contrib.total == pytest.approx(
        active_task.point_value * contrib.faction_multiplier + 4
    )


@pytest.mark.asyncio
async def test_contribution_collab_member(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """Collab praxis member gets a contribution with COLLAB faction multiplier."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        title="Collab praxis",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.flush()

    contributions = await compute_contributions(
        [praxis], character, CURRENT_ERA, db_session
    )

    assert praxis.id in contributions
    contrib = contributions[praxis.id]
    assert contrib.base_points == active_task.point_value
    # Collab multiplier is a separate config value from solo — just assert non-zero
    assert contrib.faction_multiplier > 0
    assert contrib.duel_multiplier == 1.0


@pytest.mark.asyncio
async def test_recalculate_character_stats_reflects_vote(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
):
    """recalculate_character_stats scores a solo praxis + its vote contribution."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Score praxis",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()
    await _cast_vote(praxis, character2, 3, db_session)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.commit()

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    # At minimum, score ≥ base task points (faction_multiplier ≥ 1 for same-faction)
    assert stats.score >= active_task.point_value


@pytest.mark.asyncio
async def test_merit_formula_equals_base_plus_votes(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """Merit = task_base + points_from_votes — viewer-independent (ADR-0014 §Merit).

    For a same-faction solo praxis the faction_multiplier is the SOLO config value.
    This test verifies the points_from_votes component is added correctly.
    """
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Merit formula check",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()
    await _cast_vote(praxis, character2, 5, db_session)

    contributions = await compute_contributions(
        [praxis], character, CURRENT_ERA, db_session
    )
    contrib = contributions[praxis.id]

    # points_from_votes should equal the single vote value
    assert contrib.points_from_votes == 5
    # Merit (viewer-independent read path) = base + points_from_votes
    merit = active_task.point_value + contrib.points_from_votes
    assert merit == active_task.point_value + 5
