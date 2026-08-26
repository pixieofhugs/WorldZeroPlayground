"""An era reset retains defection history and still frees the join gate (#1372).

The seam under test is ``apply_era_reset`` → ``can_join_faction``. The reset used
to call a purge keyed on the *new* era row's id, which by construction holds zero
defection rows, so it could never delete anything; the purge is gone. These tests
pin what actually makes the rule work: rows survive the reset as history, and the
fresh start on the join gate comes from era scoping alone — every reader filters
on the era in hand, so a prior era's row cannot gate a new-era join.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.faction_defection_history import FactionDefectionHistory
from services.era import apply_era_reset
from services.faction_service import can_join_faction, get_defection_history

DEFECTED_FROM_SLUG: str = "ua"


async def _defect(
    session: AsyncSession, character: Character, era: Era
) -> FactionDefectionHistory:
    """Stamp a defection from ``ua`` in the given era, as ``choose_faction`` does."""
    defection = FactionDefectionHistory(
        character_id=character.id,
        faction_slug=DEFECTED_FROM_SLUG,
        era_id=era.id,
    )
    session.add(defection)
    await session.flush()
    return defection


async def _close_era(
    session: AsyncSession, account: Account, characters: list[Character]
) -> Era:
    """Append the next Era row and run the reset over ``characters``."""
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset(characters, new_era_row, session)
    return new_era_row


@pytest.mark.asyncio
async def test_era_reset_retains_prior_era_defection_rows(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """The closing era's defection rows are still there after the reset."""
    assert CURRENT_ERA.reset_faction is True
    await _defect(db_session, character, era)

    await _close_era(db_session, account, [character])

    retained = await get_defection_history(character.id, era.id, db_session)
    assert [row.faction_slug for row in retained] == [DEFECTED_FROM_SLUG]


@pytest.mark.asyncio
async def test_era_reset_does_not_block_rejoining_in_the_new_era(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """A faction defected from last era is joinable again this era.

    ``ua`` has ``can_always_rejoin=False``, so the only thing that can permit the
    join is era scoping — the retained prior-era row must not be consulted.
    """
    await _defect(db_session, character, era)
    assert (
        await can_join_faction(
            character.id, DEFECTED_FROM_SLUG, era.id, db_session
        )
        is False
    ), "the defection must gate the join within its own era"

    new_era_row = await _close_era(db_session, account, [character])

    assert (
        await can_join_faction(
            character.id, DEFECTED_FROM_SLUG, new_era_row.id, db_session
        )
        is True
    )


@pytest.mark.asyncio
async def test_era_reset_leaves_other_characters_history_alone(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
):
    """No row for any character is dropped — the reset touches this table not at all."""
    await _defect(db_session, character, era)
    await _defect(db_session, character2, era)

    await _close_era(db_session, account, [character, character2])

    result = await db_session.execute(
        select(FactionDefectionHistory.character_id).where(
            FactionDefectionHistory.era_id == era.id
        )
    )
    assert sorted(result.scalars().all()) == sorted([character.id, character2.id])
