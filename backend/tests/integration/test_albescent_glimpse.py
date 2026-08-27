"""#2770: Albescent's third state — absent below the floor, redacted from it.

The seam under test is the pair that makes the floor an ACCOUNT fact:

* **Stamp** — ``stamp_albescent_glimpse`` writes ``Account.albescent_glimpsed``
  the first time any life reaches ``era.albescent_glimpse_level``, and never
  unwrites it. Level is per-character, so the stickiness is the whole point: a
  glimpse derived from the *active* character's level would blink the eighth
  tile and race lane in and out with the character switcher, and would be lost
  entirely at an era reset that returns every life to level 0.
* **Read** — ``is_albescent_glimpsed`` resolves reveal-implies-glimpse, so the
  two flags on ``/auth/me`` are consistent before they reach a client.

The floor is read off ``EraConfig`` and never hardcoded here either: the tests
drive a ``replace()``-d era to prove the service honours its argument rather
than the module singleton.
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

    # Monotonic: the second call is a no-op, not a second write.
    assert await stamp_albescent_glimpse(character, FLOOR, db_session) is False


async def test_the_stamp_survives_a_life_falling_back_to_level_zero(
    db_session, account: Account, character: Character
):
    """An era reset returns every life to level 0 and the sight must not go with it.

    Nothing un-stamps: a later recalc at level 0 is simply another no-op, and the
    account keeps the glimpse it earned in the era before.
    """
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
    """A revealed account is never concealed, whatever the column says.

    Derived at the read rather than stamped at reveal time — one fact, one
    record, no drift. The admin bypass (#2400) rides in the same way, and neither
    path writes: ``albescent_glimpsed`` stays the record of "a life got there".
    """
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
    """The wire the frontend dresses off, and the reason the client needs no logic."""
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["albescent_glimpsed"] is False

    account.albescent_glimpsed = True
    await db_session.flush()

    response = await client.get("/auth/me", headers=auth_headers)
    assert response.json()["albescent_glimpsed"] is True
    assert response.json()["albescent_revealed"] is False
