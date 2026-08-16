"""Where an era reset drops a character is the *opening* era's setting (#1580).

Seam under test: ``services.era.apply_era_reset`` reading
``era.reset_faction_slug``. Until #1580 the landing faction was a module constant
(``ERA_RESET_DEFAULT_FACTION``), so no era could override it and no test could
observe anything but ``na`` — which proves nothing about where the value is read
from. This pins the override: an era that names a different landing faction gets
it.

The two knobs stay separate on purpose — ``starting_faction_slug`` answers where
a character is *born*, this one where a rollover *returns* them. See the comments
in ``game_config.py``.
"""
from dataclasses import replace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from services.era import apply_era_reset


@pytest.mark.asyncio
async def test_reset_lands_character_in_the_opening_eras_reset_faction(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
):
    """``reset_faction_slug`` is honoured, not just the ``na`` default."""
    character.faction_slug = "na"
    await db_session.flush()

    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    db_session.add(new_era_row)
    await db_session.flush()

    # `faction_ua` seeds both `ua` and `na`, so `ua` is a real FK target here.
    sorting_era = replace(CURRENT_ERA, reset_faction=True, reset_faction_slug="ua")
    await apply_era_reset([character], new_era_row, db_session, era=sorting_era)

    await db_session.refresh(character)
    assert character.faction_slug == "ua"
