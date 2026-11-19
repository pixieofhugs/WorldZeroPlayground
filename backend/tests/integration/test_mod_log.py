"""One row per moderation action, written by the service (#3548)."""
import pytest
from sqlalchemy import select

from models.mod_action import ModAction
from services.admin_service import assign_or_revoke_role
from tests.integration.factories import make_admin, make_task


async def _rows(session):
    result = await session.execute(select(ModAction).order_by(ModAction.id))
    return [
        (row.action, row.target_type, row.target_id, row.actor_account_id)
        for row in result.scalars()
    ]


@pytest.mark.asyncio
async def test_each_action_writes_exactly_one_row(
    client, account, account2, character2, active_task, auth_headers, db_session
):
    await make_admin(db_session, account)
    me = account.id
    calls = [
        (
            client.post(
                f"/admin/characters/{character2.id}/ban",
                json={"banned": True},
                headers=auth_headers,
            ),
            ("ban", "character", character2.id, me),
        ),
        (
            client.post(
                f"/admin/characters/{character2.id}/ban",
                json={"banned": False},
                headers=auth_headers,
            ),
            ("unban", "character", character2.id, me),
        ),
        (
            client.post(
                f"/admin/accounts/{account2.id}/suspend",
                json={"suspended": True},
                headers=auth_headers,
            ),
            ("suspend", "account", account2.id, me),
        ),
        (
            client.post(
                f"/admin/accounts/{account2.id}/suspend",
                json={"suspended": False},
                headers=auth_headers,
            ),
            ("unsuspend", "account", account2.id, me),
        ),
        (
            client.put(
                f"/admin/tasks/{active_task.id}/status",
                json={"status": "retired"},
                headers=auth_headers,
            ),
            ("task_status", "task", active_task.id, me),
        ),
    ]
    for call, expected in calls:
        before = len(await _rows(db_session))
        response = await call
        assert response.status_code == 200, response.text
        assert (await _rows(db_session))[before:] == [expected]


@pytest.mark.asyncio
async def test_praxis_and_bulk_remove_each_log_once(
    client, account, character, character2, auth_headers, auth_headers2, db_session
):
    await make_admin(db_session, account)
    ids = []
    for title in ("one", "two", "three"):
        task = await make_task(db_session, character, title=title, commit=True)
        created = await client.post(
            "/praxes", json={"task_id": task.id, "title": title}, headers=auth_headers
        )
        ids.append(created.json()["id"])
    for praxis_id in ids[:2]:
        await client.post(
                f"/praxes/{praxis_id}/flag",
                json={"reason": "spam"},
                headers=auth_headers2,
            )

    removed = await client.post(
        f"/admin/characters/{character.id}/praxes/remove-flagged", headers=auth_headers
    )
    assert removed.json() == {"removed": 2}
    assert await _rows(db_session) == [
        ("praxis_hidden", "praxis", ids[0], account.id),
        ("praxis_hidden", "praxis", ids[1], account.id),
        ("remove_flagged", "character", character.id, account.id),
    ]

    hidden = await client.patch(
        f"/admin/praxes/{ids[2]}/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert hidden.status_code == 200
    assert (await _rows(db_session))[3:] == [
        ("praxis_hidden", "praxis", ids[2], account.id)
    ]


@pytest.mark.asyncio
async def test_comment_moderation_and_task_delete_each_log_once(
    client, account, character, active_task, auth_headers, db_session
):
    await make_admin(db_session, account)
    comment = await client.post(
        f"/tasks/{active_task.id}/comments",
        json={"body_text": "hello"},
        headers=auth_headers,
    )
    assert comment.status_code == 201, comment.text
    comment_id = comment.json()["id"]

    moderated = await client.patch(
        f"/admin/comments/{comment_id}/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert moderated.status_code == 200, moderated.text
    assert await _rows(db_session) == [
        ("comment_hidden", "comment", comment_id, account.id)
    ]

    spare = await make_task(db_session, character, title="spare", commit=True)
    deleted = await client.delete(f"/admin/tasks/{spare.id}", headers=auth_headers)
    assert deleted.status_code == 204, deleted.text
    assert (await _rows(db_session))[1:] == [
        ("task_delete", "task", spare.id, account.id)
    ]


@pytest.mark.asyncio
async def test_role_grant_and_revoke_log_once_and_noops_do_not(
    account, account2, db_session
):
    await assign_or_revoke_role(account2.id, "admin", "grant", account.id, db_session)
    await assign_or_revoke_role(account2.id, "admin", "grant", account.id, db_session)
    await assign_or_revoke_role(account2.id, "admin", "revoke", account.id, db_session)
    assert [row[0] for row in await _rows(db_session)] == ["role_grant", "role_revoke"]


@pytest.mark.asyncio
async def test_log_is_admin_only_newest_first_and_filterable(
    client, account, account2, auth_headers, auth_headers2, db_session
):
    denied = await client.get("/admin/mod-log", headers=auth_headers2)
    assert denied.status_code == 403
    await make_admin(db_session, account)
    for suspended in (True, False):
        await client.post(
            f"/admin/accounts/{account2.id}/suspend",
            json={"suspended": suspended},
            headers=auth_headers,
        )
    page = (await client.get("/admin/mod-log", headers=auth_headers)).json()
    assert [item["action"] for item in page["items"]] == ["unsuspend", "suspend"]
    assert page["total"] == 2
    other = await client.get(
        "/admin/mod-log?target_type=account&target_id=999999", headers=auth_headers
    )
    assert other.json()["items"] == []
