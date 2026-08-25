"""The ADR-0086 backfill counts before it writes, and moves a delta (#2633).

A praxis only moves when it carries metatask points AND its resolved
``faction_multiplier x duel_multiplier`` is not 1.0. On most databases that set
is empty and the script has nothing to do — which is precisely why it has to
*say* so, and why the non-empty case needs a fixture that actually produces one.
The dev seed's duel pair is that fixture: Snide's ``duel_loss_modifier`` is 0.0,
the only multiplier in the game that can delete a term outright.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from scripts.backfill_metatask_multiplier import backfill_metatask_multiplier
from scripts.seed_demo_praxes import (
    DUEL_LOSER_TITLE,
    DUEL_LOSER_USERNAME,
    METATASK_PRAXIS_TITLE,
    get_or_create_players,
    seed_metatask_fixture,
    seed_score_fixtures,
)
from services.era import get_or_create_stats
from services.praxis_scoring import compute_contributions
from services.scoring import exact, round_half_up
from tests.integration.test_seed_score_fixtures import _board, _character, _praxis


async def _stats(
    session: AsyncSession, character_id: int, era_id: int
) -> CharacterStats:
    """This era's stats row, minted if the seed never made one (it does not)."""
    return await get_or_create_stats(session, character_id, era_id)


@pytest.mark.asyncio
async def test_backfill_reports_zero_when_every_metatask_sits_at_unit_multiplier(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    capsys,
):
    """The metatask fixture alone is a x1.0 solo praxis — a reported zero."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_metatask_fixture(db_session, players, CURRENT_ERA)
    # Premise: the search space is non-empty, so a zero here is a real answer.
    await _praxis(db_session, METATASK_PRAXIS_TITLE)

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
    """Both seeded duel sides land in the affected set, and a dry run writes nothing."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    loser = await _character(db_session, DUEL_LOSER_USERNAME)
    stats = await _stats(db_session, loser.id, era.id)
    stats.score = 4321
    stats.all_time_score = 99
    await db_session.flush()

    assert await backfill_metatask_multiplier(db_session, apply=False) == 0

    output = capsys.readouterr().out
    assert "AFFECTED ROWS: 2 praxis/es" in output
    assert "DRY RUN" in output
    # A dry run is a read. The deliberately wrong row is untouched.
    assert stats.score == 4321
    assert stats.all_time_score == 99


@pytest.mark.asyncio
async def test_backfill_moves_all_time_score_by_the_delta_not_a_re_derivation(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """``score`` is re-gathered; ``all_time_score`` moves by ``new - old``.

    The baseline below is deliberately not ``SUM(score)`` — that is what an era
    reset leaves behind (``EraConfig.reset_all_time_score``), and re-deriving
    would silently undo it. Asserting the arithmetic from an arbitrary starting
    point is the only way to tell a delta from a re-derivation.
    """
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

    # The gather agrees with the sum of this character's per-praxis scores.
    loser_praxis = await _praxis(db_session, DUEL_LOSER_TITLE)
    contributions = await compute_contributions(
        [loser_praxis], loser, CURRENT_ERA, db_session, character_level=stats.level
    )
    expected = round_half_up(sum(exact(c.total) for c in contributions.values()))
    assert stats.score == expected
    # A losing Snide side keeps its metatask now, so it is not scoring zero.
    assert stats.score > 0
    assert stats.all_time_score == baseline + (expected - stale_score)
