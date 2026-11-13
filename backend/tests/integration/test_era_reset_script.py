"""The era-reset CLI's confirmation gate, and what it assembles when it opens (#1666).

The rollover itself is tested in ``test_era_reset_*``; this pins the refusals
(each leaves the DB untouched) and that a confirmed run binds what it wrote.
"""
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from scripts.era_reset import reset_era
from services.era import get_current_era_row_safe
from tests.integration.factories import make_admin


async def _era_count(session: AsyncSession) -> int:
    return (await session.execute(select(func.count()).select_from(Era))).scalar_one()


@pytest.mark.asyncio
async def test_without_confirmation_nothing_is_written(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    await make_admin(db_session, account, commit=False)
    eras_before = await _era_count(db_session)

    exit_code = await reset_era(db_session, character.username, confirmed=False)

    assert exit_code == 1
    assert await _era_count(db_session) == eras_before


@pytest.mark.asyncio
async def test_confirmed_run_opens_a_new_era_and_reseeds_stats(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    await make_admin(db_session, account, commit=False)

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 0
    new_era = (
        await db_session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one()
    assert new_era.id != era.id
    assert new_era.config_key == CURRENT_ERA.config_key
    assert new_era.started_by == account.id

    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == new_era.id,
            )
        )
    ).scalar_one()
    assert stats.score == (0 if CURRENT_ERA.reset_score else stats.score)


@pytest.mark.asyncio
async def test_a_non_admin_operator_is_refused(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """``started_by`` is an audit field: admins only."""
    eras_before = await _era_count(db_session)

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 1
    assert await _era_count(db_session) == eras_before


@pytest.mark.asyncio
async def test_an_unknown_operator_is_refused(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    exit_code = await reset_era(db_session, "no-such-character", confirmed=True)

    assert exit_code == 1
    assert await _era_count(db_session) == 1


@pytest.mark.asyncio
async def test_a_live_row_naming_no_era_file_is_refused(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """An unregistered key stops the script (#3013, ADR-0091).

    ``rebind_live_era`` falls back to the compile-time era so start-up survives;
    a rollover must not, or it silently rolls the game back with no undo.
    """
    await make_admin(db_session, account, commit=False)
    era.config_key = "era_0_previous"
    await db_session.commit()
    eras_before = await _era_count(db_session)

    # Must not 500 whatever key the row carries (#2705).
    live = await get_current_era_row_safe(db_session)
    assert live is not None and live.id == era.id

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 1
    assert await _era_count(db_session) == eras_before
    still_live = await get_current_era_row_safe(db_session)
    assert still_live is not None and still_live.id == era.id


@pytest.mark.asyncio
async def test_a_confirmed_run_ends_bound_to_what_it_wrote(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """ADR-0091: bound after the commit, via ``commit_and_bind_live_era``."""
    import game_config

    await make_admin(db_session, account, commit=False)

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 0
    new_era = (
        await db_session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one()
    assert game_config.CURRENT_ERA.config_key == new_era.config_key
