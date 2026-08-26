"""The era-reset CLI's confirmation gate, and what it assembles when it opens (#1666).

Seam under test: ``scripts.era_reset.reset_era`` → ``services.era.apply_era_reset``.
The rollover itself is already pinned elsewhere (``test_era_reset_*``); what is
new here is the only thing standing between an operator and it — a script that
runs on invocation rather than on ``--yes`` is a different, much worse tool than
the route it replaces, which at least required an admin session.

So these tests assert the *refusals*: no ``--yes``, no admin, no such character —
each leaves the database exactly as it found it. Plus the one positive case,
that a confirmed run writes the same rows ``PUT /admin/era/reset`` did.
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
from models.roles import AccountRole, Role
from scripts.era_reset import reset_era
from services.era import get_closing_era_id, get_current_era_row_safe
from tests.integration.factories import make_admin



async def _era_count(session: AsyncSession) -> int:
    return (await session.execute(select(func.count()).select_from(Era))).scalar_one()


@pytest.mark.asyncio
async def test_without_confirmation_nothing_is_written(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
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
    faction_ua: Faction,
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
    faction_ua: Faction,
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
    faction_ua: Faction,
):
    exit_code = await reset_era(db_session, "no-such-character", confirmed=True)

    assert exit_code == 1
    assert await _era_count(db_session) == 1


@pytest.mark.asyncio
async def test_a_rollover_into_a_new_config_key_opens_it_and_closes_the_old(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
):
    """The rollover CURRENT_ERA exists for: the live row carries the *old* key (#2705).

    Every other test here rolls Era N into Era N — the ``era`` fixture builds its
    row from ``CURRENT_ERA.config_key``, so the keys always matched and the bug
    hid. Re-keying the seeded row to the era it succeeded is the same shape as
    flipping ``CURRENT_ERA`` forward, without re-binding the constant in two
    modules: what matters is that the live row's key is not the configured one.
    """
    await make_admin(db_session, account, commit=False)
    era.config_key = "era_0_previous"
    await db_session.commit()

    # No 500 in the deploy window: the live era is the latest row, whatever key
    # it carries. This is the read every character-stats path makes.
    live = await get_current_era_row_safe(db_session)
    assert live is not None and live.id == era.id

    exit_code = await reset_era(db_session, character.username, confirmed=True)

    assert exit_code == 0
    new_era = (
        await db_session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one()
    assert new_era.id != era.id
    assert new_era.config_key == CURRENT_ERA.config_key
    assert await get_closing_era_id(new_era, db_session) == era.id

    # apply_era_reset ran against the era it opened.
    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == new_era.id,
            )
        )
    ).scalar_one()
    assert stats.era_id == new_era.id
