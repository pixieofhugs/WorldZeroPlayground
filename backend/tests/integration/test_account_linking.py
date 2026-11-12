"""OAuth account linking, ``services.auth.create_or_get_account`` (#1768, ADR-0075).

1. a known (provider, provider_user_id) resolves without consulting email;
2. unknown pair + known email links; 3. unknown both mints;
4. 2 and 3 refuse an unverified email (#1771), which rule 1 never reaches.
Route cases stub the provider client to prove the callback forwards the claim.
"""
from urllib.parse import parse_qs, urlparse

import pytest

# Not re-exported from `starlette_client`.
from authlib.integrations.base_client import MismatchingStateError
from authlib.integrations.starlette_client import OAuthError
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, detail_code
from models.account import Account, AuthProvider, OAuthProvider
from services.auth import create_or_get_account

_GOOGLE = AuthProvider.GOOGLE
_DEV = AuthProvider.DEV
_DISCORD = AuthProvider.DISCORD


async def _account_count(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(Account))
    return result.scalar_one()


def _login_error_code(resp) -> str | None:
    """The ``?login=`` code a refused callback redirects with (a navigation, not JSON;
    #1773)."""
    location = resp.headers.get("location", "")
    return parse_qs(urlparse(location).query).get("login", [None])[0]


async def _provider_rows(
    session: AsyncSession, provider: str, provider_user_id: str
) -> list[OAuthProvider]:
    result = await session.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == provider,
            OAuthProvider.provider_user_id == provider_user_id,
        )
    )
    return list(result.scalars())


@pytest.mark.asyncio
async def test_returning_identity_ignores_the_email_claim(
    db_session: AsyncSession, account: Account, account2: Account
):
    """The email belongs to ``account2``, so reaching the email branch is visible."""
    db_session.add(
        OAuthProvider(
            account_id=account.id, provider=_GOOGLE, provider_user_id="google-sub-1"
        )
    )
    await db_session.commit()
    accounts_before = await _account_count(db_session)

    resolved = await create_or_get_account(
        provider=_GOOGLE,
        provider_user_id="google-sub-1",
        email=account2.email,
        email_verified=True,
        session=db_session,
    )

    assert resolved.id == account.id
    assert resolved.email == account.email
    assert await _account_count(db_session) == accounts_before
    assert len(await _provider_rows(db_session, _GOOGLE, "google-sub-1")) == 1


@pytest.mark.asyncio
async def test_new_identity_with_known_email_links_to_that_account(
    db_session: AsyncSession, account: Account
):
    accounts_before = await _account_count(db_session)

    resolved = await create_or_get_account(
        provider=_GOOGLE,
        provider_user_id="google-sub-new",
        email=account.email,
        email_verified=True,
        session=db_session,
    )

    assert resolved.id == account.id
    assert await _account_count(db_session) == accounts_before

    linked = await _provider_rows(db_session, _GOOGLE, "google-sub-new")
    assert len(linked) == 1
    assert linked[0].account_id == account.id


@pytest.mark.asyncio
async def test_unknown_identity_and_email_creates_account_and_link(
    db_session: AsyncSession,
):
    accounts_before = await _account_count(db_session)

    resolved = await create_or_get_account(
        provider=_GOOGLE,
        provider_user_id="google-sub-fresh",
        email="newcomer@example.com",
        email_verified=True,
        session=db_session,
    )

    assert resolved.id is not None
    assert resolved.email == "newcomer@example.com"
    assert await _account_count(db_session) == accounts_before + 1

    linked = await _provider_rows(db_session, _GOOGLE, "google-sub-fresh")
    assert len(linked) == 1
    assert linked[0].account_id == resolved.id


@pytest.mark.asyncio
async def test_two_providers_sharing_an_email_resolve_to_one_account(
    db_session: AsyncSession, account: Account
):
    """How a second provider finds an existing account (#1772)."""
    accounts_before = await _account_count(db_session)

    first = await create_or_get_account(
        provider=_GOOGLE,
        provider_user_id="google-sub-2",
        email=account.email,
        email_verified=True,
        session=db_session,
    )
    second = await create_or_get_account(
        provider=_DEV,
        provider_user_id="dev-sub-2",
        email=account.email,
        email_verified=True,
        session=db_session,
    )

    assert first.id == second.id == account.id
    assert await _account_count(db_session) == accounts_before

    result = await db_session.execute(
        select(OAuthProvider).where(OAuthProvider.account_id == account.id)
    )
    linked = {(row.provider, row.provider_user_id) for row in result.scalars()}
    assert linked == {(_GOOGLE, "google-sub-2"), (_DEV, "dev-sub-2")}

    for provider, provider_user_id in linked:
        again = await create_or_get_account(
            provider=provider,
            provider_user_id=provider_user_id,
            email=account.email,
            email_verified=True,
            session=db_session,
        )
        assert again.id == account.id


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "email_verified",
    [
        pytest.param(False, id="explicitly-false"),
        # Only the boolean True is a yes.
        pytest.param("true", id="stringy-true"),
    ],
)
async def test_unverified_email_cannot_link_to_an_existing_account(
    db_session: AsyncSession, account: Account, email_verified
):
    """The account takeover the gate exists to stop."""
    accounts_before = await _account_count(db_session)

    with pytest.raises(HTTPException) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id="google-sub-attacker",
            email=account.email,
            email_verified=email_verified,
            session=db_session,
        )

    assert excinfo.value.status_code == 403
    assert detail_code(excinfo.value.detail) == ErrorCode.oauth_email_unverified.value
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _GOOGLE, "google-sub-attacker") == []


@pytest.mark.asyncio
async def test_unverified_email_cannot_mint_an_account_either(
    db_session: AsyncSession,
):
    """Same takeover one sign-in later: the real owner would link into the squatted
    account."""
    accounts_before = await _account_count(db_session)

    with pytest.raises(HTTPException) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id="google-sub-squatter",
            email="not-mine@example.com",
            email_verified=False,
            session=db_session,
        )

    assert excinfo.value.status_code == 403
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _GOOGLE, "google-sub-squatter") == []


class _StubGoogleClient:
    """Stands in for ``_OAUTH.google``; the handler reads ``token["userinfo"]``."""

    def __init__(self, userinfo: dict) -> None:
        self._userinfo = userinfo

    async def authorize_access_token(self, request) -> dict:
        return {"userinfo": self._userinfo}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "email_verified",
    [
        pytest.param(False, id="explicitly-false"),
        pytest.param(None, id="claim-absent"),
        # Google has emitted the claim as a string.
        pytest.param("true", id="stringy-true"),
    ],
)
async def test_callback_rejects_an_unverified_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    email_verified,
):
    from routers import auth as auth_router

    user_info = {"sub": "google-sub-unverified", "email": "victim@example.com"}
    if email_verified is not None:
        user_info["email_verified"] = email_verified
    monkeypatch.setattr(auth_router._OAUTH, "google", _StubGoogleClient(user_info))

    accounts_before = await _account_count(db_session)

    resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_email_unverified.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _GOOGLE, "google-sub-unverified") == []


@pytest.mark.asyncio
async def test_callback_admits_a_returning_identity_with_an_unverified_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    account: Account,
):
    """A transient unverified window (e.g. Discord email change) must not lock a known
    pair out."""
    db_session.add(
        OAuthProvider(
            account_id=account.id,
            provider=_GOOGLE,
            provider_user_id="google-sub-returning",
        )
    )
    await db_session.commit()
    accounts_before = await _account_count(db_session)

    from routers import auth as auth_router

    monkeypatch.setattr(
        auth_router._OAUTH,
        "google",
        _StubGoogleClient(
            {
                "sub": "google-sub-returning",
                "email": account.email,
                "email_verified": False,
            }
        ),
    )

    resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    assert resp.cookies.get("access_token")
    assert await _account_count(db_session) == accounts_before
    assert len(await _provider_rows(db_session, _GOOGLE, "google-sub-returning")) == 1


@pytest.mark.asyncio
async def test_the_provider_pair_is_unique_in_the_database(
    db_session: AsyncSession, account: Account, account2: Account
):
    """A duplicate would make every lookup raise ``MultipleResultsFound``; the DB
    enforces it."""
    db_session.add(
        OAuthProvider(
            account_id=account.id,
            provider=_GOOGLE,
            provider_user_id="google-sub-dup",
        )
    )
    await db_session.commit()

    db_session.add(
        OAuthProvider(
            account_id=account2.id,
            provider=_GOOGLE,
            provider_user_id="google-sub-dup",
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_discord_identity_links_onto_an_existing_google_account(
    db_session: AsyncSession, account: Account
):
    """ADR-0075 with the real provider pair."""
    db_session.add(
        OAuthProvider(
            account_id=account.id,
            provider=_GOOGLE,
            provider_user_id="google-sub-also-discord",
        )
    )
    await db_session.commit()
    accounts_before = await _account_count(db_session)

    resolved = await create_or_get_account(
        provider=_DISCORD,
        # A snowflake, always a JSON string.
        provider_user_id="1070000000000000000",
        email=account.email,
        email_verified=True,
        session=db_session,
    )

    assert resolved.id == account.id
    assert await _account_count(db_session) == accounts_before

    linked = await _provider_rows(db_session, _DISCORD, "1070000000000000000")
    assert len(linked) == 1
    assert linked[0].account_id == account.id


class _StubDiscordResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def json(self) -> dict:
        return self._payload


class _StubDiscordClient:
    """Stands in for ``_OAUTH.discord``; records GET paths since Discord has no
    ``id_token``."""

    def __init__(self, user_info: dict) -> None:
        self._user_info = user_info
        self.requested_paths: list[str] = []

    async def authorize_access_token(self, request) -> dict:
        # Discord's real shape: no id_token.
        return {
            "access_token": "discord-access-token",
            "refresh_token": "discord-refresh-token",
            "expires_in": 604800,
        }

    async def get(self, path: str, token=None) -> _StubDiscordResponse:
        self.requested_paths.append(path)
        return _StubDiscordResponse(self._user_info)


@pytest.mark.asyncio
async def test_discord_callback_signs_in_a_newcomer_keyed_on_the_snowflake(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    """Keys on the immutable ``id`` and reads the profile from ``users/@me``."""
    from routers import auth as auth_router

    stub = _StubDiscordClient(
        {
            "id": "1070000000000000001",
            "username": "newcomer",
            "email": "discord-newcomer@example.com",
            "verified": True,
        }
    )
    monkeypatch.setattr(auth_router._OAUTH, "discord", stub)

    accounts_before = await _account_count(db_session)

    resp = await client.get("/auth/discord/callback")

    assert resp.status_code == 302
    assert resp.cookies.get("access_token")
    assert stub.requested_paths == ["users/@me"]
    assert await _account_count(db_session) == accounts_before + 1

    linked = await _provider_rows(db_session, _DISCORD, "1070000000000000001")
    assert len(linked) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "user_info",
    [
        pytest.param(
            {"id": "1070000000000000002", "username": "no-email"}, id="key-absent"
        ),
        pytest.param(
            {"id": "1070000000000000002", "username": "no-email", "email": None},
            id="explicit-null",
        ),
    ],
)
async def test_discord_callback_rejects_a_profile_with_no_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    user_info: dict,
):
    """Discord's ``email`` is optional and nullable; a ``None`` would match NULL-email
    Accounts."""
    from routers import auth as auth_router

    monkeypatch.setattr(
        auth_router._OAUTH, "discord", _StubDiscordClient(user_info)
    )

    accounts_before = await _account_count(db_session)

    resp = await client.get("/auth/discord/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_email_unverified.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _DISCORD, "1070000000000000002") == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "verified",
    [
        pytest.param(False, id="explicitly-false"),
        pytest.param(None, id="claim-absent"),
        pytest.param("true", id="stringy-true"),
    ],
)
async def test_discord_callback_rejects_an_unverified_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    account: Account,
    verified,
):
    """ADR-0075's takeover via Discord; through the route since forwarding is what can
    break."""
    from routers import auth as auth_router

    user_info = {
        "id": "1070000000000000003",
        "username": "impostor",
        "email": account.email,
    }
    if verified is not None:
        user_info["verified"] = verified
    monkeypatch.setattr(
        auth_router._OAUTH, "discord", _StubDiscordClient(user_info)
    )

    accounts_before = await _account_count(db_session)

    resp = await client.get("/auth/discord/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_email_unverified.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _DISCORD, "1070000000000000003") == []


class _DecliningClient:
    """Player pressed Cancel on consent: a bare ``OAuthError`` (expired state is
    separate)."""

    async def authorize_access_token(self, request):
        raise OAuthError(error="access_denied")


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["google", "discord"])
async def test_a_declined_consent_screen_lands_the_player_back_home(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
):
    from routers import auth as auth_router

    monkeypatch.setattr(auth_router._OAUTH, provider, _DecliningClient())
    accounts_before = await _account_count(db_session)

    resp = await client.get(f"/auth/{provider}/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_failed.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before


class _StaleStateClient:
    """Raises what authlib raises when the state cookie is gone (the real expiry is 10
    min, #1755)."""

    async def authorize_access_token(self, request):
        raise MismatchingStateError()


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["google", "discord"])
async def test_an_expired_state_says_so_rather_than_something_went_wrong(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
):
    """A stale sign-in is retryable, so it gets its own code (#1756).

    ``MismatchingStateError`` subclasses ``OAuthError``: checking the general
    case first would swallow it, hence the inequality.
    """
    from routers import auth as auth_router

    monkeypatch.setattr(auth_router._OAUTH, provider, _StaleStateClient())
    accounts_before = await _account_count(db_session)

    resp = await client.get(f"/auth/{provider}/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_state_expired.value
    assert _login_error_code(resp) != ErrorCode.oauth_failed.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before
