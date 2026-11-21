"""A ban or suspension ends the locked-out player's duels (#3766, #3688).

Seam: the admin ban/suspend routes in; the duel respond and praxis submit
routes, the public praxis read and the activity feed out.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, detail_code
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisStatus
from services.auth import create_jwt
from services.character_stats import recalculate_character_stats
from tests.integration.factories import make_admin, make_duel
from tests.integration.test_ban_and_departure import _duel_win_multiplier


def _headers(character: Character) -> dict:
    return {"Authorization": f"Bearer {create_jwt(character.account_id)}"}


def _lock_request(character: Character, how: str, lock: bool) -> tuple[str, dict]:
    if how == "ban":
        return f"/admin/characters/{character.id}/ban", {"banned": lock}
    return f"/admin/accounts/{character.account_id}/suspend", {"suspended": lock}


async def _lock(client, admin_headers, character: Character, how: str, lock=True):
    path, body = _lock_request(character, how, lock)
    resp = await client.post(path, json=body, headers=admin_headers)
    assert resp.status_code == 200, resp.text


async def _live_duel(db_session, era, label, *, status, locked_side):
    """A ``status`` duel with both sides unsubmitted; returns (duel, locked, honest)."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label=label, status=status
    )
    if status == DuelStatus.pending:
        duel.opponent_praxis_id = None
    else:
        duel.accepted_at = duel.created_at
    for praxis_id in (duel.challenger_praxis_id, duel.opponent_praxis_id):
        if praxis_id is not None:
            (await db_session.get(Praxis, praxis_id)).status = PraxisStatus.in_progress
    await db_session.commit()
    if locked_side == "challenger":
        return duel, challenger, opponent
    return duel, opponent, challenger


@pytest.mark.asyncio
@pytest.mark.parametrize("how", ["ban", "suspend"])
@pytest.mark.parametrize("side", ["challenger", "opponent"])
async def test_lockout_declines_a_pending_challenge(
    client: AsyncClient, db_session: AsyncSession, account: Account,
    auth_headers: dict, era: Era, some_faction: Faction, how: str, side: str,
):
    await make_admin(db_session, account)
    duel, locked, honest = await _live_duel(
        db_session, era, f"pend{how[:2]}{side[:2]}",
        status=DuelStatus.pending, locked_side=side,
    )

    await _lock(client, auth_headers, locked, how)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.declined
    assert duel.forfeited_by_character_id == locked.id

    if side == "challenger":
        resp = await client.post(
            f"/duels/{duel.id}/respond", json={"accept": True}, headers=_headers(honest)
        )
        assert resp.status_code == 400, resp.text
        assert (
            detail_code(resp.json()["detail"])
            == ErrorCode.duel_challenge_already_resolved.value
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("how", ["ban", "suspend"])
@pytest.mark.parametrize("side", ["challenger", "opponent"])
async def test_lockout_forfeits_an_active_duel_and_honest_submit_settles_it(
    client: AsyncClient, db_session: AsyncSession, account: Account,
    auth_headers: dict, era: Era, some_faction: Faction, how: str, side: str,
):
    await make_admin(db_session, account)
    duel, locked, honest = await _live_duel(
        db_session, era, f"act{how[:2]}{side[:2]}",
        status=DuelStatus.active, locked_side=side,
    )
    honest_praxis_id = (
        duel.opponent_praxis_id if side == "challenger" else duel.challenger_praxis_id
    )

    await _lock(client, auth_headers, locked, how)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.active
    assert duel.forfeited_by_character_id == locked.id

    resp = await client.post(
        f"/praxes/{honest_praxis_id}/submit", headers=_headers(honest)
    )
    assert resp.status_code == 200, resp.text

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled
    assert (await client.get(f"/praxes/{honest_praxis_id}")).status_code == 200
    win = CURRENT_ERA.factions[honest.faction_slug].duel_win_modifier
    assert await _duel_win_multiplier(honest_praxis_id, honest, db_session) == win

    await _lock(client, auth_headers, locked, how, lock=False)
    await db_session.refresh(duel)
    assert duel.forfeited_by_character_id == locked.id

    feed = await client.get("/activity-feed", headers=_headers(honest))
    lines = [i for i in feed.json()["items"] if i["type"] == "duel_forfeited"]
    assert [i["payload"]["praxis_id"] for i in lines] == [honest_praxis_id]
    assert lines[0]["actor_display_name"] == locked.display_name


@pytest.mark.asyncio
async def test_active_duel_settles_at_lockout_if_honest_side_already_submitted(
    client: AsyncClient, db_session: AsyncSession, account: Account,
    auth_headers: dict, era: Era, some_faction: Faction,
):
    await make_admin(db_session, account)
    duel, locked, _ = await _live_duel(
        db_session, era, "alreadysub", status=DuelStatus.active, locked_side="opponent",
    )
    honest_praxis = await db_session.get(Praxis, duel.challenger_praxis_id)
    honest_praxis.status = PraxisStatus.submitted
    await db_session.commit()

    await _lock(client, auth_headers, locked, "ban")

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled


async def _saved_equals_fresh(db_session, character: Character, era: Era) -> int:
    stats = (await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id, CharacterStats.era_id == era.id
        )
    )).scalar_one()
    await db_session.refresh(stats)
    saved = (stats.score, stats.level, stats.votes_spent_this_era)
    await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.refresh(stats)
    assert saved == (stats.score, stats.level, stats.votes_spent_this_era)
    return stats.score


@pytest.mark.asyncio
async def test_ban_rescores_the_forfeiting_winner(
    client: AsyncClient, db_session: AsyncSession, account: Account,
    auth_headers: dict, era: Era, some_faction: Faction,
):
    """#3688: X beat Y; banning X puts the loss modifier into X's saved stats."""
    await make_admin(db_session, account)
    duel, x, y = await make_duel(
        db_session, era, label="rescore", challenger_votes=5, opponent_votes=1
    )
    await db_session.commit()
    for character in (x, y):
        await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.commit()
    before = await _saved_equals_fresh(db_session, x, era)

    await _lock(client, auth_headers, x, "ban")
    after = await _saved_equals_fresh(db_session, x, era)
    assert after < before

    await _lock(client, auth_headers, x, "ban", lock=False)
    assert await _saved_equals_fresh(db_session, x, era) == after
    await db_session.refresh(duel)
    assert duel.forfeited_by_character_id == x.id
