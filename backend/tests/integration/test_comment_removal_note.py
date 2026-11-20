"""A removed comment's reason reaches its author and the mod log, nobody else (#3742)."""
import pytest

from tests.integration.factories import make_admin

NOTE = "Off-topic for this praxis."


@pytest.mark.asyncio
async def test_removal_note_reaches_only_the_author_and_the_mod_log(
    client, account, character2, praxis_solo, auth_headers, auth_headers2, db_session
):
    await make_admin(db_session, account)
    url = f"/praxes/{praxis_solo.id}/comments"
    made = await client.post(url, json={"body_text": "hi"}, headers=auth_headers2)
    assert made.status_code == 201, made.text
    cid = made.json()["id"]

    removed = await client.patch(
        f"/admin/comments/{cid}/moderate",
        json={"status": "hidden", "admin_note": NOTE},
        headers=auth_headers,
    )
    assert removed.status_code == 200, removed.text

    mine = (await client.get(url, headers=auth_headers2)).json()
    assert [(c["id"], c["admin_note"]) for c in mine] == [(cid, NOTE)]

    for headers in (auth_headers, {}):
        seen = await client.get(url, headers=headers)
        assert seen.json() == []
        assert NOTE not in seen.text

    log = (await client.get("/admin/mod-log", headers=auth_headers)).json()
    assert [
        (a["action"], a["target_id"], a["detail"]) for a in log["items"]
    ] == [("comment_hidden", cid, NOTE)]
