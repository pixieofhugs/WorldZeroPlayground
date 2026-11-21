"""A removal note reaches its comment's author and the mod log, nobody else."""
import pytest

from tests.integration.factories import make_admin

NOTE = "Off-topic for this praxis."


@pytest.mark.asyncio
async def test_removal_note_reaches_only_the_author_and_the_mod_log(
    client,
    account,
    character2,
    praxis_solo,
    auth_headers,
    auth_headers2,
    db_session,
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


async def _comment(client, account, praxis_solo, auth_headers2, db_session):
    await make_admin(db_session, account)
    url = f"/praxes/{praxis_solo.id}/comments"
    made = await client.post(url, json={"body_text": "hi"}, headers=auth_headers2)
    return url, made.json()["id"]


def _moderate(client, cid, status, headers, note=None):
    return client.patch(
        f"/admin/comments/{cid}/moderate",
        json={"status": status, "admin_note": note},
        headers=headers,
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("again", ["visible", "hidden", "deleted"])
async def test_deleted_comment_is_terminal(
    client,
    account,
    character2,
    praxis_solo,
    auth_headers,
    auth_headers2,
    db_session,
    again,
):
    url, cid = await _comment(client, account, praxis_solo, auth_headers2, db_session)
    done = await _moderate(client, cid, "deleted", auth_headers, NOTE)
    assert done.status_code == 200, done.text

    refused = await _moderate(client, cid, again, auth_headers, "other")
    assert refused.status_code == 409, refused.text
    assert refused.json()["detail"]["code"] == "COMMENT_ALREADY_DELETED"

    mine = (await client.get(url, headers=auth_headers2)).json()
    assert [(c["id"], c["admin_note"]) for c in mine] == [(cid, NOTE)]
    assert (await client.get(url, headers=auth_headers)).json() == []
    log = (await client.get("/admin/mod-log", headers=auth_headers)).json()
    assert [a["action"] for a in log["items"]] == ["comment_deleted"]


@pytest.mark.asyncio
async def test_hidden_comment_can_still_be_made_visible(
    client,
    account,
    character2,
    praxis_solo,
    auth_headers,
    auth_headers2,
    db_session,
):
    url, cid = await _comment(client, account, praxis_solo, auth_headers2, db_session)
    hid = await _moderate(client, cid, "hidden", auth_headers, NOTE)
    assert hid.status_code == 200, hid.text
    shown = await _moderate(client, cid, "visible", auth_headers)
    assert shown.status_code == 200, shown.text
    seen = (await client.get(url, headers=auth_headers)).json()
    assert [c["id"] for c in seen] == [cid]
