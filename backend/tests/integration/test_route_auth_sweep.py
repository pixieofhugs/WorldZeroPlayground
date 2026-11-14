"""Every route is walked, so a route added tomorrow is covered today (#3356).

No token -> 401 on every non-GET route; a plain player's token -> 403 on every
``/admin/*`` route. A route that is meant to be open must be named below.
"""
import re

import pytest
from httpx import AsyncClient

from main import app

PUBLIC_NON_GET = {
    ("POST", "/auth/dev-login"),
    ("POST", "/auth/logout"),
    # Identity is the signed OAuth session cookie, not a bearer token.
    ("POST", "/auth/returning-player"),
    ("POST", "/contact"),
    # Gated by the X-Admin-Cli-Secret header, not a bearer token.
    ("POST", "/admin/cli-token"),
}

# GET is outside the no-token walk; listed so a rename fails the staleness check.
PUBLIC_GET = {
    ("GET", "/auth/google"),
    ("GET", "/auth/google/callback"),
    ("GET", "/auth/discord"),
    ("GET", "/auth/discord/callback"),
}

# Unguarded routes found by the walk: (method, path) -> "#<bug issue>".
XFAIL_NO_TOKEN: dict[tuple[str, str], str] = {}
XFAIL_ADMIN: dict[tuple[str, str], str] = {}


def _routes() -> list[tuple[str, str]]:
    # FastAPI >=0.121 nests included routers in opaque objects, so app.routes
    # has no flat APIRoute list; the schema is the stable walk.
    return sorted(
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
    )


def _url(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "1", path)


def _params(items, xfails):
    return [
        pytest.param(
            *i,
            id=f"{i[0]} {i[1]}",
            marks=(
                [pytest.mark.xfail(strict=True, reason=xfails[i])]
                if i in xfails
                else []
            ),
        )
        for i in items
    ]


NON_GET = [r for r in _routes() if r[0] != "GET" and r not in PUBLIC_NON_GET]
ADMIN = [r for r in _routes() if r[1].startswith("/admin/") and r not in PUBLIC_NON_GET]


def test_allow_list_names_only_routes_that_exist() -> None:
    stale = (PUBLIC_NON_GET | PUBLIC_GET) - set(_routes())
    assert not stale, f"allow-list names routes that no longer exist: {sorted(stale)}"


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", _params(NON_GET, XFAIL_NO_TOKEN))
async def test_non_get_route_without_a_token_is_401(
    client: AsyncClient, method: str, path: str
) -> None:
    resp = await client.request(method, _url(path), json={})
    assert resp.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", _params(ADMIN, XFAIL_ADMIN))
async def test_admin_route_refuses_a_plain_player(
    client: AsyncClient, auth_headers: dict, method: str, path: str
) -> None:
    resp = await client.request(method, _url(path), json={}, headers=auth_headers)
    assert resp.status_code == 403
