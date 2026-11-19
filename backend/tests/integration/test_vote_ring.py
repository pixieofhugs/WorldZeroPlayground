"""Admin ring view (#3546): concentration, reciprocity, admin-only."""
import pytest

from tests.integration.factories import (
    cast_vote,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio


async def test_ring_is_concentrated_and_reciprocal_honest_voter_is_not(
    client, db_session, era, account, auth_headers, auth_headers2, character
):
    await make_admin(db_session, account)
    ring = [await make_character(db_session, era, username=f"ring{i}") for i in range(4)]
    honest = await make_character(db_session, era, username="honest")
    others = [await make_character(db_session, era, username=f"other{i}") for i in range(5)]
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

    body = (await client.get(f"/admin/accounts/{ring[0].account_id}/vote-ring", headers=auth_headers)).json()
    assert body["total_votes"] == 3 and body["top3_share"] == 1.0
    assert all(r["reciprocal"] and r["share"] == pytest.approx(1 / 3) for r in body["recipients"])
    assert {r["average_stars"] for r in body["recipients"]} == {5.0}

    body = (await client.get(f"/admin/accounts/{honest.account_id}/vote-ring", headers=auth_headers)).json()
    assert body["total_votes"] == 5
    assert body["top3_share"] == pytest.approx(3 / 5)
    assert not any(r["reciprocal"] for r in body["recipients"])

    assert (await client.get(f"/admin/accounts/{ring[0].account_id}/vote-ring", headers=auth_headers2)).status_code == 403
