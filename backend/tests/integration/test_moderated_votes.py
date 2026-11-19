"""Moderated voters' votes stop counting, reversibly (#3543, ADR-0081)."""
import pytest
from sqlalchemy import select

from models.character import CharacterStatus
from models.character_stats import CharacterStats
from services.vote_tally import tally_votes
from tests.integration.factories import (
    cast_vote,
    make_admin,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def rigged(
    db_session, account, account2, account3, character, character2, character3
):
    await make_admin(db_session, account, commit=False)
    task = await make_task(db_session, character)
    praxis = await make_solo_praxis(db_session, task, character)
    await cast_vote(db_session, praxis, character2, 5)
    await cast_vote(db_session, praxis, character3, 3)
    return praxis


async def _votes(db_session, praxis):
    tally = (await tally_votes([praxis.id], db_session))[praxis.id]
    return tally.points_from_votes, tally.voter_count


async def _stored_score(db_session, character):
    return await db_session.scalar(
        select(CharacterStats.score).where(CharacterStats.character_id == character.id)
    )


async def test_ban_then_unban_moves_tally_and_stored_score(
    client, db_session, auth_headers, rigged, character, character2
):
    before = await _votes(db_session, rigged)
    assert before[1] == 2
    url = f"/admin/characters/{character2.id}/ban"

    await client.post(url, json={"banned": True}, headers=auth_headers)
    await db_session.refresh(character2)
    assert await _votes(db_session, rigged) == (before[0] - 5, 1)
    banned_score = await _stored_score(db_session, character)

    await client.post(url, json={"banned": False}, headers=auth_headers)
    assert await _votes(db_session, rigged) == before
    assert await _stored_score(db_session, character) > banned_score


async def test_suspend_then_unsuspend(
    client, db_session, auth_headers, rigged, account3, character
):
    before = await _votes(db_session, rigged)
    url = f"/admin/accounts/{account3.id}/suspend"

    await client.post(url, json={"suspended": True}, headers=auth_headers)
    assert await _votes(db_session, rigged) == (before[0] - 3, 1)
    suspended_score = await _stored_score(db_session, character)

    await client.post(url, json={"suspended": False}, headers=auth_headers)
    assert await _votes(db_session, rigged) == before
    assert await _stored_score(db_session, character) > suspended_score


async def test_a_departed_voter_still_counts(db_session, rigged, character2):
    character2.status = CharacterStatus.banned
    character2.departed_at = character2.created_at
    await db_session.flush()
    assert (await _votes(db_session, rigged))[1] == 2
