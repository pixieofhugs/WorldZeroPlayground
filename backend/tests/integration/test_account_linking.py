"""Characterization tests for the OAuth account-linking seam (#1768).

The seam under test is ``services.auth.create_or_get_account`` — where an OAuth
identity becomes a World Zero Account. It is called by both OAuth legs
(``routers/auth.py``: the Google callback and the dev-login bypass), and it owns
three rules that nothing else enforces:

1. a known ``(provider, provider_user_id)`` pair resolves to its Account
   **without consulting email at all**;
2. an unknown pair whose email matches an existing Account *links* to that
   Account rather than minting a second one;
3. an unknown pair with an unknown email mints both rows;
4. neither of those last two happens on an unverified email claim (#1771).

Rule 1 is the load-bearing one: the email a provider asserts is only an
authentication decision on the *linking* path, so rule 4's gate sits behind
rule 1's early return and a returning player never meets it (ADR-0075).

Tested at the service, not through authlib: the rules live in the service, and
mocked OAuth transport would only put ceremony between the test and the
assertions. The two route-level cases at the bottom stub the Google client to
prove the callback forwards the claim rather than deciding on it — one that the
gate still rejects an unverified newcomer end to end, one that it admits a
returning identity the provider currently calls unverified.
"""
from urllib.parse import parse_qs, urlparse

import pytest
# `MismatchingStateError` is NOT re-exported from `starlette_client`, which only
# publishes `OAuthError` — the same reason `routers/auth.py` reaches one level
# down for it.
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

#: The provider names the OAuth legs write (``routers/auth.py``). Values of
#: the :class:`AuthProvider` enum since #1771; the column stays a plain string.
_GOOGLE = AuthProvider.GOOGLE
_DEV = AuthProvider.DEV
_DISCORD = AuthProvider.DISCORD


async def _account_count(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(Account))
    return result.scalar_one()


def _login_error_code(resp) -> str | None:
    """The ``?login=`` code a refused callback sent the browser home with.

    An OAuth callback is a top-level navigation, so a refusal cannot answer
    with a JSON body anybody reads — it redirects and carries the
    :class:`ErrorCode` in the one query param ``pages/Home.tsx`` already
    inspects (#1773). This is the whole wire contract, read back.
    """
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


# ---------------------------------------------------------------------------
# Case 1 — returning user: the provider pair wins, email is never consulted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_returning_identity_ignores_the_email_claim(
    db_session: AsyncSession, account: Account, account2: Account
):
    """A known provider pair resolves to its own Account, whatever email says.

    The email passed here belongs to a *different* Account, so any lookup that
    reached the email branch would return ``account2`` — or, with a stricter
    email rule bolted on later, refuse the sign-in outright. Neither may happen:
    the provider pair already identifies this player.
    """
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
    # No account minted, and no second link row for the same pair.
    assert await _account_count(db_session) == accounts_before
    assert len(await _provider_rows(db_session, _GOOGLE, "google-sub-1")) == 1


# ---------------------------------------------------------------------------
# Case 2 — new identity, known email: link, do not mint
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Case 3 — new identity, unknown email: mint both rows
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Case 4 — two providers, one Account
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_two_providers_sharing_an_email_resolve_to_one_account(
    db_session: AsyncSession, account: Account
):
    """Both links attach to the existing Account, and both keep resolving to it.

    This is the property the second-provider work (#1772) inherits: linking by
    email is how a player's second provider finds their existing account, and
    re-presenting either identity afterwards takes the case-1 path.
    """
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

    # Re-presenting either identity resolves to the same Account.
    for provider, provider_user_id in linked:
        again = await create_or_get_account(
            provider=provider,
            provider_user_id=provider_user_id,
            email=account.email,
            email_verified=True,
            session=db_session,
        )
        assert again.id == account.id


# ---------------------------------------------------------------------------
# Case 5 — the email branch refuses an unverified claim, both halves of it
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "email_verified",
    [
        pytest.param(False, id="explicitly-false"),
        # A provider may answer with anything; only the boolean True is a yes.
        pytest.param("true", id="stringy-true"),
    ],
)
async def test_unverified_email_cannot_link_to_an_existing_account(
    db_session: AsyncSession, account: Account, email_verified
):
    """The takeover the gate exists to stop: linking into someone else's Account."""
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
    """Minting is gated too — it is the same takeover, one sign-in later.

    An Account created under an address its holder never proved control of is
    exactly what case 2 then links the real owner into.
    """
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


# ---------------------------------------------------------------------------
# Case 6 — the callback forwards the claim, and the gate still bites end to end
# ---------------------------------------------------------------------------


class _StubGoogleClient:
    """Stands in for ``_OAUTH.google`` — the callback only calls these two.

    Cheaper than mocking authlib's transport: the handler reads
    ``token["userinfo"]`` when present and never reaches ``userinfo()``.
    """

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
        # Google has emitted the claim as a string; `is not True` must reject it.
        pytest.param("true", id="stringy-true"),
    ],
)
async def test_callback_rejects_an_unverified_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    email_verified,
):
    """An unverified email is refused *before* anything is linked or minted."""
    from routers import auth as auth_router

    user_info = {"sub": "google-sub-unverified", "email": "victim@example.com"}
    if email_verified is not None:
        user_info["email_verified"] = email_verified
    monkeypatch.setattr(auth_router._OAUTH, "google", _StubGoogleClient(user_info))

    accounts_before = await _account_count(db_session)

    resp = await client.get("/auth/google/callback")

    # A refusal here is a redirect, not a 403 body: see `_login_error_code`.
    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_email_unverified.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before
    assert await _provider_rows(db_session, _GOOGLE, "google-sub-unverified") == []


# ---------------------------------------------------------------------------
# Case 7 — the gate does not apply to a returning identity (#1771)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_callback_admits_a_returning_identity_with_an_unverified_email(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    account: Account,
):
    """A known provider pair signs in even while the provider says unverified.

    The case-5 gate defends the *email-matching* branch; this player never
    reaches it. Their ``provider_user_id`` already names their Account, so a
    transient ``verified: false`` window at the provider (changing a Discord
    email re-sends a verification mail) must not lock them out.
    """
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


# ---------------------------------------------------------------------------
# Case 8 - the pair every sign-in looks up cannot be duplicated (#1771)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_provider_pair_is_unique_in_the_database(
    db_session: AsyncSession, account: Account, account2: Account
):
    """A second row for one pair is refused at insert, not discovered at login.

    Without the constraint this insert succeeds and every case-1 lookup for that
    identity raises ``MultipleResultsFound`` from then on - a permanently
    unloggable account. Asserted against the database rather than the service
    because the service is not what enforces it.
    """
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


# ---------------------------------------------------------------------------
# Case 9 — Discord is the second provider the rules above were written for
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_discord_identity_links_onto_an_existing_google_account(
    db_session: AsyncSession, account: Account
):
    """The payoff of ADR-0075, with the two providers it was written about.

    Case 4 proved the property with ``dev``; this is the real pair. A player who
    signed up with Google and later presses "Continue with Discord" reaches the
    Account they already have, rather than minting a second one beside it.
    """
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
        # A snowflake, always a JSON string — see the callback's comment.
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


# ---------------------------------------------------------------------------
# Case 10 — the Discord callback reads the profile, and what it does with it
# ---------------------------------------------------------------------------


class _StubDiscordResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def json(self) -> dict:
        return self._payload


class _StubDiscordClient:
    """Stands in for ``_OAUTH.discord``. Unlike Google's stub, it serves a GET.

    Discord returns no ``id_token`` on its documented OAuth2 path, so authlib
    never populates ``token["userinfo"]`` and the callback has to fetch
    ``users/@me`` itself. Recording the path is the point: it is what proves the
    callback asks the API rather than reading a claim off a token that has none.

    The relative path is also where the trailing slash on ``api_base_url``
    matters in production — authlib joins them with ``urljoin``. A stub cannot
    observe that join, which is exactly why it is argued in a comment at the
    registration instead of asserted here.
    """

    def __init__(self, user_info: dict) -> None:
        self._user_info = user_info
        self.requested_paths: list[str] = []

    async def authorize_access_token(self, request) -> dict:
        # Shaped like Discord's real answer: a bearer token and an expiry, and
        # no id_token. The callback keeps none of it.
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
    """The happy path, and the two facts about it that are easy to get wrong.

    The link row must key on Discord's ``id`` — ``username`` and ``email`` are
    both mutable — and the profile must come from ``users/@me`` rather than the
    token.
    """
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


# ---------------------------------------------------------------------------
# Case 11 — no usable email: the two shapes of "absent", and "not verified"
# ---------------------------------------------------------------------------


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
    """Discord's ``email`` field is *both* optional and nullable.

    Its own docs on the ``email`` scope say the object comes back with an email
    "if the user has one", so an email-less account is a real answer and both
    JSON shapes have to be handled. ``create_or_get_account`` takes ``email:
    str`` and would otherwise be handed ``None`` — which the email branch would
    then look up, matching any Account whose email is NULL.
    """
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
        # `verified` is optional; a provider may answer with anything at all.
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
    """The takeover ADR-0075 names, arriving through the second provider.

    The email here is an existing Account's, so an admitted sign-in would hand
    over that player's characters and score. The callback does not decide this —
    it normalises the claim and forwards it, and the service's gate refuses
    (#1771). Asserted through the route anyway, because "the fact reaches the
    gate" is the part a second provider can get wrong.
    """
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


# ---------------------------------------------------------------------------
# Case 12 — the provider itself ends the sign-in (#1773)
# ---------------------------------------------------------------------------


class _DecliningClient:
    """A provider that answers the code exchange with an OAuth error.

    The player pressed Cancel on the consent screen. It surfaces as a bare
    ``OAuthError`` out of ``authorize_access_token``, and an uncaught one is a
    500 whose body the player reads — because a callback is a navigation, not
    an XHR.

    An expired ``state`` is deliberately NOT this case; see case 13.
    """

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
    """No code of its own, so it carries the generic one — and nothing is minted."""
    from routers import auth as auth_router

    monkeypatch.setattr(auth_router._OAUTH, provider, _DecliningClient())
    accounts_before = await _account_count(db_session)

    resp = await client.get(f"/auth/{provider}/callback")

    assert resp.status_code == 302
    assert _login_error_code(resp) == ErrorCode.oauth_failed.value
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before


# ---------------------------------------------------------------------------
# Case 13 — the sign-in went stale rather than being refused (#1756)
# ---------------------------------------------------------------------------


class _StaleStateClient:
    """A provider callback arriving with a ``state`` authlib no longer holds.

    Exactly what authlib does when the session cookie carrying the state is
    gone: ``StarletteOAuth2App.authorize_access_token`` looks the state up,
    gets ``None`` back, and ``_format_state_params`` raises. Reproduced by
    raising the real exception rather than by expiring a cookie, because the
    cookie's ten-minute lifetime (#1755) is enforced by
    ``TimestampSigner.unsign()`` against the wall clock — a test that waited it
    out would take ten minutes.
    """

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
    """A stale sign-in is retryable, and the copy has to be able to say that.

    This is the one requirement of #1756 that #1862 did not deliver: it caught
    the whole ``OAuthError`` family under one generic code, on the reasoning
    that the player's next move is the same for all of them. That holds for a
    declined consent screen — declining is a choice — but not for a state that
    went stale while the player was distracted, which is not a choice they made
    and which succeeds on a second attempt.

    The assertion that matters is the INEQUALITY as much as the equality:
    ``MismatchingStateError`` subclasses ``OAuthError``, so a dispatch that
    tested the general case first would swallow this one and every stale
    sign-in would read "something went wrong".
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
