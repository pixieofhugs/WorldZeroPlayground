"""services.praxis_scoring.compute_contributions (ADR-0014)."""

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
    praxis.status = PraxisStatus.submitted
    await db_session.flush()


async def _cast_vote(
    praxis: Praxis,
    voter: Character,
    value: int,
    db_session: AsyncSession,
) -> None:
    """Bypasses the service's budget check."""
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
    assert contrib.total == pytest.approx(active_task.point_value)


@pytest.mark.asyncio
async def test_contribution_solo_with_vote(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
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
    own = CURRENT_ERA.factions[character.faction_slug].own_task_modifier
    assert contrib.faction_multiplier == own
    assert contrib.total == pytest.approx(active_task.point_value * own + 4)


@pytest.mark.asyncio
async def test_contribution_collab_member(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
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
    assert contrib.faction_multiplier == (
        CURRENT_ERA.factions[character.faction_slug].collab_own_modifier
    )
    assert contrib.duel_multiplier == 1.0


@pytest.mark.asyncio
async def test_recalculate_character_stats_reflects_vote(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
):
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
    own = CURRENT_ERA.factions[character.faction_slug].own_task_modifier
    assert stats.score == active_task.point_value * own + 3

