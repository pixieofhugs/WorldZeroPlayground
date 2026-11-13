"""#2770: Albescent's third state, absent below the floor, redacted from it.

* Stamp: ``stamp_albescent_glimpse`` writes the sticky ``Account.albescent_glimpsed``
at ``era.albescent_glimpse_level``. Sticky because per-character level would
blink with the switcher and vanish at an era reset.
* Read: ``is_albescent_glimpsed`` resolves reveal-implies-glimpse.
"""
from dataclasses import replace

import pytest

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from services.albescent_reveal import is_albescent_glimpsed, is_albescent_revealed
from services.character import stamp_albescent_glimpse

pytestmark = pytest.mark.asyncio

FLOOR = CURRENT_ERA.albescent_glimpse_level


async def test_below_the_floor_nothing_is_stamped(
    db_session, account: Account, character: Character
):
    assert await stamp_albescent_glimpse(character, FLOOR - 1, db_session) is False
    await db_session.refresh(account)
    assert account.albescent_glimpsed is False
    assert is_albescent_glimpsed(account) is False


async def test_reaching_the_floor_stamps_the_account_once(
    db_session, account: Account, character: Character
):
    assert await stamp_albescent_glimpse(character, FLOOR, db_session) is True
    await db_session.flush()
    await db_session.refresh(account)
    assert account.albescent_glimpsed is True
    assert is_albescent_glimpsed(account) is True

    assert await stamp_albescent_glimpse(character, FLOOR, db_session) is False


async def test_the_stamp_survives_a_life_falling_back_to_level_zero(
    db_session, account: Account, character: Character
):
    """An era reset returns every life to level 0; the glimpse must survive it."""
    await stamp_albescent_glimpse(character, FLOOR, db_session)
    await db_session.flush()

    assert await stamp_albescent_glimpse(character, 0, db_session) is False
    await db_session.refresh(account)
    assert account.albescent_glimpsed is True


async def test_the_floor_comes_from_the_era_not_a_literal(
    db_session, account: Account, character: Character
):
    strict = replace(CURRENT_ERA, albescent_glimpse_level=FLOOR + 3)
    assert await stamp_albescent_glimpse(character, FLOOR, db_session, strict) is False
    assert (
        await stamp_albescent_glimpse(character, FLOOR + 3, db_session, strict) is True
    )


async def test_reveal_implies_glimpse_without_a_second_write(account: Account):
    """Reveal implies glimpse at read time (admin bypass #2400 too); neither writes."""
    account.albescent_glimpsed = False
    account.albescent_revealed = True
    assert is_albescent_glimpsed(account) is True
    assert account.albescent_glimpsed is False

    account.albescent_revealed = False
    assert is_albescent_glimpsed(account) is False
    assert is_albescent_glimpsed(account, is_admin=True) is True


async def test_anonymous_callers_fail_closed():
    assert is_albescent_glimpsed(None) is False
    assert is_albescent_glimpsed(None, is_admin=True) is False
    assert is_albescent_revealed(None) is False


async def test_auth_me_carries_both_flags(
    client, db_session, account: Account, character: Character, auth_headers: dict
):
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["albescent_glimpsed"] is False

    account.albescent_glimpsed = True
    await db_session.flush()

    response = await client.get("/auth/me", headers=auth_headers)
    assert response.json()["albescent_glimpsed"] is True
    assert response.json()["albescent_revealed"] is False
