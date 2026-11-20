"""Admin ring view (#3546): concentration, reciprocity, admin-only."""
import pytest

from models.account import Account
from models.character import CharacterStatus

from tests.integration.factories import (
    cast_vote,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio


def _ring_url(character) -> str:
    return f"/admin/accounts/{character.account_id}/vote-ring"


async def test_ring_is_concentrated_and_reciprocal_honest_voter_is_not(
    client, db_session, era, account, auth_headers, auth_headers2, character
):
    await make_admin(db_session, account)
    ring = [
        await make_character(db_session, era, username=f"ring{i}") for i in range(4)
    ]
    honest = await make_character(db_session, era, username="honest")
    others = [
        await make_character(db_session, era, username=f"other{i}") for i in range(5)
    ]
    task = await make_task(db_session, character)
    ring_posts = [await make_solo_praxis(db_session, task, c) for c in ring]
    other_posts = [await make_solo_praxis(db_session, task, c) for c in others]
    for voter in ring:
        for post, author in zip(ring_posts, ring):
            if author is not voter:
                await cast_vote(db_session, post, voter, 5)
    for post in other_posts:
        await cast_vote(db_session, post, honest, 4)
    await db_session.commit()

    body = (await client.get(_ring_url(ring[0]), headers=auth_headers)).json()
    assert body["total_votes"] == 3
    assert all(r["votes_back"] == 1 and r["votes_back_of"] == 3 for r in body["recipients"])
    assert all(r["share"] == pytest.approx(1 / 3) for r in body["recipients"])
    assert {r["average_stars"] for r in body["recipients"]} == {5.0}

    body = (await client.get(_ring_url(honest), headers=auth_headers)).json()
    assert body["total_votes"] == 5
    assert not any(r["votes_back"] for r in body["recipients"])

    forbidden = await client.get(_ring_url(ring[0]), headers=auth_headers2)
    assert forbidden.status_code == 403


async def test_eligible_excludes_own_account_and_banned(
    client, db_session, era, account, auth_headers, character
):
    await make_admin(db_session, account)
    voter = await make_character(db_session, era, username="voter")
    await make_character(db_session, era, username="voter_alt", account=await db_session.get(Account, voter.account_id))
    await make_character(db_session, era, username="banned", status=CharacterStatus.banned)
    await make_character(db_session, era, username="fine")

    body = (await client.get(_ring_url(voter), headers=auth_headers)).json()
    # The admin's character and "fine": not the voter or their alt, not the banned one.
    assert body["eligible"] == 2
