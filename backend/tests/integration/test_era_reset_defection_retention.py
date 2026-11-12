"""An era reset retains defection history and still frees the join gate (#1372).

No purge: the fresh start comes from era scoping alone — every reader filters on
the era in hand.
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
from services.faction_service import get_defection_history
from tests.integration.factories import DEFAULT_FACTION_SLUG, rejoin_gate_open

DEFECTED_FROM_SLUG: str = DEFAULT_FACTION_SLUG


async def _defect(
    session: AsyncSession, character: Character, era: Era
) -> FactionDefectionHistory:
    """As ``choose_faction`` does."""
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
    """``ua`` has ``can_always_rejoin=False``, so only era scoping permits this."""
    await _defect(db_session, character, era)
    assert (
        await rejoin_gate_open(
            character.id, DEFECTED_FROM_SLUG, era.id, db_session
        )
        is False
    ), "the defection must gate the join within its own era"

    new_era_row = await _close_era(db_session, account, [character])

    assert (
        await rejoin_gate_open(
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
    await _defect(db_session, character, era)
    await _defect(db_session, character2, era)

    await _close_era(db_session, account, [character, character2])

    result = await db_session.execute(
        select(FactionDefectionHistory.character_id).where(
            FactionDefectionHistory.era_id == era.id
        )
    )
    assert sorted(result.scalars().all()) == sorted([character.id, character2.id])
