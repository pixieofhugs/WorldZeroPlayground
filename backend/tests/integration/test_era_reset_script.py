"""The era-reset CLI's confirmation gate, and what it assembles when it opens (#1666).

Seam under test: ``scripts.era_reset.reset_era`` → ``services.era.apply_era_reset``.
The rollover itself is already pinned elsewhere (``test_era_reset_*``); what is
new here is the only thing standing between an operator and it — a script that
runs on invocation rather than on ``--yes`` is a different, much worse tool than
the route it replaces, which at least required an admin session.

So these tests assert the *refusals*: no ``--yes``, no admin, no such character,
no era file for the key the live row names — each leaves the database exactly as
it found it. Plus the positive cases: a confirmed run writes the same rows
``PUT /admin/era/reset`` did, and leaves the process bound to what it wrote.
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
    """The plan prints, the rollover does not happen, and the exit code says so."""
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
    """Same rows the deleted route produced: a new Era, stamped with the operator."""
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
    """``started_by`` is an audit field; the route only ever wrote an admin into it."""
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
    """A key nothing registers stops the script rather than steering it (#3013).

    This test used to assert the opposite, and it was right to at the time: under
    the pre-#827 procedure the live row legitimately carried the *previous* era's
    key during the window between an owner's code flip and the hand rollover, and
    rolling forward into the compile-time era was the whole job (#2705).

    ADR-0091 abolishes that window — the row **chooses** the ruleset, so the row
    and the live era agree by construction, and this script re-opens whatever the
    row names. The one state left is a row whose ``config_key`` no era file
    registers: a deleted era file, or a row from a newer build. The resolver
    ``services.era.rebind_live_era`` falls back to the compile-time era there
    because start-up must survive it. A rollover must not: falling back would
    turn "re-open the live era" into "roll the game back to Era 1", silently, on
    the operation with no undo.
    """
    await make_admin(db_session, account, commit=False)
    era.config_key = "era_0_previous"
    await db_session.commit()
    eras_before = await _era_count(db_session)

    # The live era is still the latest row, whatever key it carries — the read
    # every character-stats path makes, and it must not 500 (#2705).
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
    """The script's half of ADR-0091's binding rule.

    It re-opens the era the live row names, so the process must end on exactly
    that — bound after the commit, not before it, through the same
    ``commit_and_bind_live_era`` the route uses.
    """
    import game_config

    await make_admin(db_session, account, commit=False)

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 0
    new_era = (
        await db_session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one()
    assert game_config.CURRENT_ERA.config_key == new_era.config_key
