"""A recalc of one duel side also re-scores the other (#3684)."""
import pytest
from sqlalchemy import select

from models.character_stats import CharacterStats
from models.praxis import Praxis
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.praxis_duel import with_duel_opponents
from tests.integration.factories import (
    cast_vote,
    make_admin,
    make_character,
    make_duel,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio


async def _stored(db_session, character) -> int:
    return await db_session.scalar(
        select(CharacterStats.score).where(CharacterStats.character_id == character.id)
    )


async def _assert_fresh(db_session, *characters) -> None:
    """Stored score equals a full recalc, i.e. the recalc changes nothing."""
    for c in characters:
        before = await _stored(db_session, c)
        await recalculate_character_stats(c.id, db_session)
        assert await _stored(db_session, c) == before


async def _sides(db_session, duel):
    return (
        await db_session.get(Praxis, duel.challenger_praxis_id),
        await db_session.get(Praxis, duel.opponent_praxis_id),
    )


async def test_a_vote_that_flips_the_duel_rescores_the_other_side(
    db_session, era, some_faction
):
    duel, x, y = await make_duel(db_session, era, label="flip")
    px, py = await _sides(db_session, duel)
    b = await make_character(db_session, era, username="flipb", level=5)
    s = await make_character(db_session, era, username="flips", level=5)

    await cast_vote(db_session, py, b, 3)
    await recalculate_members_stats(py, db_session)
    y_won = await _stored(db_session, y)

    await cast_vote(db_session, px, s, 5)
    await recalculate_members_stats(px, db_session)

    assert await _stored(db_session, y) != y_won
    await _assert_fresh(db_session, x, y)


@pytest.mark.parametrize("route", ["suspend", "ban"])
async def test_moderating_a_deciding_voter_rescores_both_sides(
    client, db_session, era, some_faction, account, auth_headers, route
):
    await make_admin(db_session, account, commit=False)
    duel, x, y = await make_duel(db_session, era, label="mod")
    px, py = await _sides(db_session, duel)
    b = await make_character(db_session, era, username="modb", level=5)
    s = await make_character(db_session, era, username="mods", level=5)
    await cast_vote(db_session, px, s, 5)
    await cast_vote(db_session, py, b, 3)
    await recalculate_members_stats(px, db_session)
    await _assert_fresh(db_session, x, y)

    if route == "suspend":
        url, key = f"/admin/accounts/{s.account_id}/suspend", "suspended"
    else:
        url, key = f"/admin/characters/{s.id}/ban", "banned"
    y_lost = await _stored(db_session, y)

    resp = await client.post(url, json={key: True}, headers=auth_headers)
    assert resp.status_code == 200
    assert await _stored(db_session, y) != y_lost
    await _assert_fresh(db_session, x, y)

    resp = await client.post(url, json={key: False}, headers=auth_headers)
    assert resp.status_code == 200
    assert await _stored(db_session, y) == y_lost
    await _assert_fresh(db_session, x, y)


async def test_a_non_duel_praxis_covers_only_itself(db_session, era, character):
    task = await make_task(db_session, character)
    solo = await make_solo_praxis(db_session, task, character)
    assert await with_duel_opponents({solo.id}, db_session) == {solo.id}
