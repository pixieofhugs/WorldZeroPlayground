"""Copy overrides: public read, admin-only write, delete as revert.

Trust boundary: a PUT ``value`` lands on every visitor's screen.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.copy_override import CopyOverride
from tests.integration.factories import make_admin


@pytest.mark.asyncio
async def test_list_overrides_is_public(
    client: AsyncClient, db_session: AsyncSession, account: Account
):
    db_session.add(
        CopyOverride(
            ns="common",
            key="nav.adminMode.badge",
            value="Backstage",
            updated_by=account.id,
        )
    )
    await db_session.commit()

    resp = await client.get("/copy-overrides")
    assert resp.status_code == 200
    assert resp.json() == [
        {"ns": "common", "key": "nav.adminMode.badge", "value": "Backstage"}
    ]


@pytest.mark.asyncio
async def test_write_requires_admin(client: AsyncClient, auth_headers: dict):
    put = await client.put(
        "/copy-overrides",
        json={"ns": "common", "key": "nav.home", "value": "Hearth"},
        headers=auth_headers,
    )
    assert put.status_code == 403

    delete = await client.delete(
        "/copy-overrides?ns=common&key=nav.home", headers=auth_headers
    )
    assert delete.status_code == 403


@pytest.mark.asyncio
async def test_put_twice_updates_in_place(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
):
    await make_admin(db_session, account)

    first = await client.put(
        "/copy-overrides",
        json={"ns": "common", "key": "nav.home", "value": "Hearth"},
        headers=auth_headers,
    )
    assert first.status_code == 200
    assert first.json() == {"ns": "common", "key": "nav.home", "value": "Hearth"}

    second = await client.put(
        "/copy-overrides",
        json={"ns": "common", "key": "nav.home", "value": "Homestead"},
        headers=auth_headers,
    )
    assert second.status_code == 200
    assert second.json()["value"] == "Homestead"

    rows = (await db_session.execute(select(CopyOverride))).scalars().all()
    assert len(rows) == 1
    assert rows[0].value == "Homestead"
    assert rows[0].updated_by == account.id


@pytest.mark.asyncio
async def test_delete_reverts_then_404s(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
):
    await make_admin(db_session, account)
    await client.put(
        "/copy-overrides",
        json={"ns": "common", "key": "nav.home", "value": "Hearth"},
        headers=auth_headers,
    )

    first = await client.delete(
        "/copy-overrides?ns=common&key=nav.home", headers=auth_headers
    )
    assert first.status_code == 204
    assert (await client.get("/copy-overrides")).json() == []

    second = await client.delete(
        "/copy-overrides?ns=common&key=nav.home", headers=auth_headers
    )
    assert second.status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"ns": "common", "key": "nav home", "value": "Hearth"},          # space
        {"ns": "common", "key": "nav.home[0]", "value": "Hearth"},       # brackets
        {"ns": "common", "key": "", "value": "Hearth"},                  # empty key
        {"ns": "", "key": "nav.home", "value": "Hearth"},                # empty ns
        {"ns": "common", "key": "nav.home", "value": "   "},             # blank value
        {"ns": "common", "key": "nav.home", "value": "x" * 2001},        # oversized
    ],
)
@pytest.mark.asyncio
async def test_bad_payloads_are_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    body: dict,
):
    """Refused outright, never truncated."""
    await make_admin(db_session, account)

    resp = await client.put("/copy-overrides", json=body, headers=auth_headers)
    assert resp.status_code == 422
    assert (await db_session.execute(select(CopyOverride))).first() is None
