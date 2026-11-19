"""ADR-0097: secret-faction state is per account and per faction slug.

Seam: the stamp services and the reveal/glimpse predicates, each handed an era.
"""
from dataclasses import replace

import pytest

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from services.albescent_reveal import is_albescent_glimpsed, is_albescent_revealed
from services.character import can_start_as_albescent, stamp_albescent_glimpse
from tests.stamps import stamp, stamped

pytestmark = pytest.mark.asyncio

FLOOR = CURRENT_ERA.secret_faction_glimpse_level
NO_SECRET = replace(CURRENT_ERA, secret_faction_slug=None)
OTHER_SLUG = next(
    slug
    for slug in CURRENT_ERA.factions
    if slug not in ("na", CURRENT_ERA.secret_faction_slug)
)
OTHER_SECRET = replace(CURRENT_ERA, secret_faction_slug=OTHER_SLUG)


async def test_an_era_with_no_secret_faction_surfaces_nothing(
    db_session, account: Account, character: Character
):
    stamp(account, "revealed")
    stamp(account, "unlocked")
    glimpsed = await stamp_albescent_glimpse(character, FLOOR, db_session, NO_SECRET)
    assert glimpsed is False
    assert is_albescent_revealed(account, is_admin=True, era=NO_SECRET) is False
    assert is_albescent_glimpsed(account, is_admin=True, era=NO_SECRET) is False
    assert await can_start_as_albescent(account.id, db_session, NO_SECRET) is False


async def test_the_same_secret_faction_next_era_keeps_every_stamp(
    db_session, account: Account, character: Character
):
    await stamp_albescent_glimpse(character, FLOOR, db_session)
    stamp(account, "revealed")
    next_era = replace(CURRENT_ERA, name="Next", config_key="era_next")
    assert is_albescent_revealed(account, era=next_era) is True
    assert is_albescent_glimpsed(account, era=next_era) is True


async def test_a_different_secret_faction_starts_everyone_fresh(
    db_session, account: Account, character: Character
):
    await stamp_albescent_glimpse(character, FLOOR, db_session)
    stamp(account, "revealed")
    stamp(account, "unlocked")
    assert is_albescent_revealed(account, era=OTHER_SECRET) is False
    assert is_albescent_glimpsed(account, era=OTHER_SECRET) is False
    assert await can_start_as_albescent(account.id, db_session, OTHER_SECRET) is False

    assert (
        await stamp_albescent_glimpse(character, FLOOR, db_session, OTHER_SECRET)
        is True
    )
    assert stamped(account, "glimpsed", OTHER_SLUG) is True
    assert stamped(account, "glimpsed") is True
