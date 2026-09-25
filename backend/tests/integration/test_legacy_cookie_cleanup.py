"""The Render-era `.worldzero.org` `access_token` cookie, and its cleanup (#3054).

Anyone who signed in on Render in the 7 days before its 2026-09-24 suspension
holds a cookie scoped to `.worldzero.org`. It shadows the new host-only cookie
because the server reads the LAST of two same-named cookies (see the
characterization test at the bottom) — and RFC 6265 ordering keeps the
domain-wide one sorting last no matter how many times the player signs in
again. Only an explicit `delete_cookie` at the *old* scope fixes it; see
`routers/auth.py::_delete_legacy_cookie` for why a normal set cannot.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account, AuthProvider, OAuthProvider

#: The scope under test — kept as a literal rather than importing
#: `auth_router._LEGACY_COOKIE_DOMAIN` so a typo in the constant itself would
#: not silently make this file agree with a broken value.
_LEGACY_COOKIE_DOMAIN = ".worldzero.org"


def _access_token_cookie_headers(resp) -> list[str]:
    """Every ``access_token`` ``Set-Cookie`` header on ``resp``, in order.

    Filtered to the one cookie name under test: the returning-player confirm
    also clears the Starlette ``session`` cookie (the pending signup it just
    consumed), which is a real ``Set-Cookie`` header but no part of #3054.
    """
    return [
        h for h in resp.headers.get_list("set-cookie") if h.startswith("access_token=")
    ]


def _cookie_for_domain(headers: list[str], domain: str | None) -> str:
    """The one ``access_token`` header carrying (or lacking) the given ``Domain``.

    Raises if there is not exactly one match — both directions of that failure
    are a real bug here, not a fixture problem.
    """
    matches = [
        h
        for h in headers
        if h.startswith("access_token=")
        and ((f"Domain={domain}" in h) if domain else ("Domain=" not in h))
    ]
    assert len(matches) == 1, f"expected exactly one match in {headers!r}"
    return matches[0]


@pytest.fixture
def _non_development_no_legacy_cookie_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    """The deploy shape the legacy delete exists for: not local dev, and
    `COOKIE_DOMAIN` is not itself the legacy scope (else the delete would
    erase the cookie the same response just set).
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "COOKIE_DOMAIN", None)


@pytest.mark.asyncio
async def test_logout_emits_both_the_delete_and_the_legacy_expiry(
    client: AsyncClient, _non_development_no_legacy_cookie_domain: None
) -> None:
    resp = await client.post("/auth/logout")

    headers = _access_token_cookie_headers(resp)
    assert len(headers) == 2

    host_only = _cookie_for_domain(headers, None)
    assert "access_token=" in host_only
    # A delete carries no real value and an expiry in the past.
    assert 'access_token=""' in host_only or "access_token=;" in host_only

    legacy = _cookie_for_domain(headers, _LEGACY_COOKIE_DOMAIN)
    assert 'access_token=""' in legacy or "access_token=;" in legacy
    for flag in ("HttpOnly", "SameSite=lax", "Secure"):
        assert flag in legacy


class _StubGoogleClient:
    """Stands in for ``_OAUTH.google``, same shape as ``test_account_linking.py``."""

    def __init__(self, userinfo: dict) -> None:
        self._userinfo = userinfo

    async def authorize_access_token(self, request) -> dict:
        return {"userinfo": self._userinfo}


@pytest.mark.asyncio
async def test_a_successful_sign_in_also_expires_the_legacy_cookie(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    era,
    _non_development_no_legacy_cookie_domain: None,
) -> None:
    """Both shapes of a successful sign-in share `_set_session_cookie` — proved
    here through the returning-player confirm, the JSON-answering one; the
    OAuth callbacks' 302 shares the same function and is not re-proved.

    Drives a real departed-account -> tombstone -> gate -> confirm round trip
    (the same shape ``test_returning_player_gate.py`` uses), because that is
    the one seam that answers with a JSON body rather than a 302 and still
    goes through ``_set_session_cookie``.
    """
    from routers import auth as auth_router
    from services.account_deletion import delete_account

    sub = "legacy-cookie-sub"
    email = "legacy-cookie@example.com"
    departed = Account(email=email)
    db_session.add(departed)
    await db_session.flush()
    db_session.add(
        OAuthProvider(
            account_id=departed.id, provider=AuthProvider.GOOGLE, provider_user_id=sub
        )
    )
    await db_session.flush()
    await delete_account(departed.id, db_session, era)
    await db_session.commit()

    monkeypatch.setattr(
        auth_router._OAUTH,
        "google",
        _StubGoogleClient({"sub": sub, "email": email, "email_verified": True}),
    )
    paused = await client.get("/auth/google/callback")
    assert paused.status_code == 302

    resp = await client.post("/auth/returning-player")
    assert resp.status_code == 200

    headers = _access_token_cookie_headers(resp)
    assert len(headers) == 2
    host_only = _cookie_for_domain(headers, None)
    assert "access_token=" in host_only
    legacy = _cookie_for_domain(headers, _LEGACY_COOKIE_DOMAIN)
    for flag in ("HttpOnly", "SameSite=lax", "Secure"):
        assert flag in legacy


@pytest.mark.asyncio
async def test_no_legacy_delete_in_local_development(client: AsyncClient) -> None:
    """The default test environment IS development — no `Domain=` noise on localhost."""
    resp = await client.post("/auth/logout")
    headers = _access_token_cookie_headers(resp)
    assert len(headers) == 1
    assert _LEGACY_COOKIE_DOMAIN not in headers[0]


@pytest.mark.asyncio
async def test_no_legacy_delete_when_cookie_domain_is_itself_the_legacy_scope(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A deploy that sets `COOKIE_DOMAIN=.worldzero.org` must not erase its own
    fresh cookie the instant it sets it."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "COOKIE_DOMAIN", _LEGACY_COOKIE_DOMAIN)

    resp = await client.post("/auth/logout")
    headers = _access_token_cookie_headers(resp)
    assert len(headers) == 1


# ---------------------------------------------------------------------------
# Characterization: which of two same-named cookies the server reads.
#
# Pinned so a Starlette change that flips this fails loudly rather than
# silently un-fixing #3054 — this file's own fix relies on the reader picking
# the LAST cookie, exactly as measured against the deployed service.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_of_two_same_named_cookies_the_server_reads_the_last(
    client: AsyncClient, account: Account
) -> None:
    from services.auth import create_jwt

    valid = create_jwt(account.id)
    garbage = "not-a-real-token"

    valid_first = await client.get(
        "/auth/me", headers={"Cookie": f"access_token={valid}; access_token={garbage}"}
    )
    assert valid_first.status_code == 401

    garbage_first = await client.get(
        "/auth/me", headers={"Cookie": f"access_token={garbage}; access_token={valid}"}
    )
    assert garbage_first.status_code == 200

