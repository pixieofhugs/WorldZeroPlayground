"""The ADR-0086 backfill counts before it writes, and moves a delta (#2633).

Affected = metatask points AND resolved multiplier != 1.0. The seed's duel pair is
the non-empty fixture (Snide's ``duel_loss_modifier`` is 0.0).
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.task import Task
from scripts.backfill_metatask_multiplier import backfill_metatask_multiplier
from scripts.seed_demo_praxes import (
    DUEL_LOSER_TITLE,
    DUEL_LOSER_USERNAME,
    DUEL_WINNER_USERNAME,
    METATASK_PRAXIS_TITLE,
    get_or_create_players,
    seed_metatask_fixture,
    seed_score_fixtures,
)
from services.era import get_or_create_stats
from services.praxis_scoring import compute_contributions
from services.scoring import compute_faction_multiplier, exact, round_half_up
from tests.integration.test_seed_score_fixtures import _board, _character, _praxis


async def _stats(
    session: AsyncSession, character_id: int, era_id: int
) -> CharacterStats:
    """The seed makes no stats row, so mint one."""
    return await get_or_create_stats(session, character_id, era_id)


@pytest.mark.asyncio
async def test_backfill_reports_zero_when_every_metatask_sits_at_unit_multiplier(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    capsys,
):
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_metatask_fixture(db_session, players, CURRENT_ERA)
    praxis = await _praxis(db_session, METATASK_PRAXIS_TITLE)

    # A solo's resolved multiplier is the faction one; eras with no x1.0 task
    # cannot reach this branch (#2708).
    author = await db_session.get(Character, praxis.created_by_id)
    task = await db_session.get(Task, praxis.task_id)
    resolved = compute_faction_multiplier(
        author.faction_slug, task.primary_faction_slug, CURRENT_ERA
    )
    if resolved != 1.0:
        pytest.skip(
            f"{CURRENT_ERA.config_key} prices this solo at x{resolved}, so no "
            "metatask in it can sit at a unit multiplier"
        )

    assert await backfill_metatask_multiplier(db_session, apply=False) == 0

    output = capsys.readouterr().out
    assert "AFFECTED ROWS: 0" in output
    assert "Nothing to backfill" in output


@pytest.mark.asyncio
async def test_backfill_counts_the_duel_sides_carrying_a_metatask(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    capsys,
):
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    loser = await _character(db_session, DUEL_LOSER_USERNAME)
    winner = await _character(db_session, DUEL_WINNER_USERNAME)
    stats = await _stats(db_session, loser.id, era.id)
    stats.score = 4321
    stats.all_time_score = 99
    await db_session.flush()

    assert await backfill_metatask_multiplier(db_session, apply=False) == 0

    output = capsys.readouterr().out
    # By name, not count: the count is era-dependent (#2708).
    assert f"({loser.display_name}) era" in output
    assert f"({winner.display_name}) era" in output
    assert "DRY RUN" in output
    assert stats.score == 4321
    assert stats.all_time_score == 99


@pytest.mark.asyncio
async def test_backfill_moves_all_time_score_by_the_delta_not_a_re_derivation(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """Re-deriving all_time_score would undo ``reset_all_time_score``; baseline is
    arbitrary so a delta is distinguishable from a re-derivation."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    loser = await _character(db_session, DUEL_LOSER_USERNAME)
    stats = await _stats(db_session, loser.id, era.id)
    stale_score, baseline = 4321, 99
    stats.score = stale_score
    stats.all_time_score = baseline
    await db_session.flush()

    assert await backfill_metatask_multiplier(db_session, apply=True) == 0

    loser_praxis = await _praxis(db_session, DUEL_LOSER_TITLE)
    contributions = await compute_contributions(
        [loser_praxis], loser, CURRENT_ERA, db_session, character_level=stats.level
    )
    expected = round_half_up(sum(exact(c.total) for c in contributions.values()))
    assert stats.score == expected
    assert stats.score > 0
    assert stats.all_time_score == baseline + (expected - stale_score)
