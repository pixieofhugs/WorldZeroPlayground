"""The owner-only admin roster (#3258).

Seam: the wire. ``dependencies.OWNER_ACCOUNT_ID`` is pointed at the ``account``
fixture (test ids are never 1 after a rollback), so "the owner" is that account.
"""
import pytest
from httpx import AsyncClient

import dependencies
from models.account import Account
from tests.integration.factories import make_admin


@pytest.fixture
def hdr(auth_headers: dict) -> dict:
    return auth_headers


@pytest.fixture
def hdr2(auth_headers2: dict) -> dict:
    return auth_headers2


@pytest.fixture
def other(character2):
    return character2


@pytest.fixture
def owner_is_account(monkeypatch, account: Account) -> Account:
    monkeypatch.setattr(dependencies, "OWNER_ACCOUNT_ID", account.id)
    return account


async def test_is_owner_only_for_the_owner_account_with_admin(
    client, db_session, account, account2, character, other,
    hdr, hdr2, owner_is_account,
):
    me = await client.get("/auth/me", headers=hdr)
    assert me.json()["is_owner"] is False  # the owner's id, but no admin role yet
    await make_admin(db_session, account)
    me = await client.get("/auth/me", headers=hdr)
    assert me.json()["is_owner"] is True
    plain = await client.get("/auth/me", headers=hdr2)
    assert plain.json()["is_owner"] is False


async def test_non_owner_admin_gets_403_on_all_three_routes(
    client: AsyncClient, db_session, account2, other, hdr2, owner_is_account,
):
    await make_admin(db_session, account2)
    assert (await client.get("/admin/admins", headers=hdr2)).status_code == 403
    r = await client.post("/admin/admins", json={"username": "x"}, headers=hdr2)
    assert r.status_code == 403
    assert (await client.delete("/admin/admins/x", headers=hdr2)).status_code == 403


async def test_owner_lists_grants_and_revokes(
    client, db_session, account, character, other, hdr, owner_is_account
):
    await make_admin(db_session, account)

    listed = (await client.get("/admin/admins", headers=hdr)).json()
    assert listed == [
        {
            "username": character.username,
            "display_name": character.display_name,
            "is_owner": True,
        }
    ]

    body = {"username": other.username}
    r = await client.post("/admin/admins", json=body, headers=hdr)
    assert r.status_code == 201
    assert r.json()["username"] == other.username and r.json()["is_owner"] is False
    assert {"account_id", "email"}.isdisjoint(r.json())
    assert len((await client.get("/admin/admins", headers=hdr)).json()) == 2

    r = await client.delete(f"/admin/admins/{other.username}", headers=hdr)
    assert r.status_code == 204
    assert len((await client.get("/admin/admins", headers=hdr)).json()) == 1


def code(response) -> str:
    return response.json()["detail"]["code"]


async def test_refusals_carry_their_codes(
    client, db_session, account, character, other, hdr, owner_is_account
):
    await make_admin(db_session, account)

    r = await client.delete(f"/admin/admins/{character.username}", headers=hdr)
    assert (r.status_code, code(r)) == (409, "ADMIN_CANNOT_REVOKE_OWNER")

    post = client.post
    r = await post("/admin/admins", json={"username": "nobody-here"}, headers=hdr)
    assert (r.status_code, code(r)) == (404, "ADMIN_UNKNOWN_USERNAME")
    r = await client.delete("/admin/admins/nobody-here", headers=hdr)
    assert (r.status_code, code(r)) == (404, "ADMIN_UNKNOWN_USERNAME")

    r = await post("/admin/admins", json={"username": character.username}, headers=hdr)
    assert (r.status_code, code(r)) == (409, "ADMIN_ALREADY_ADMIN")

    r = await client.delete(f"/admin/admins/{other.username}", headers=hdr)
    assert (r.status_code, code(r)) == (404, "ADMIN_NOT_AN_ADMIN")
