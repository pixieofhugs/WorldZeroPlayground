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
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, detail_code
from models.account import Account, AuthProvider, OAuthProvider
from services.auth import create_or_get_account

#: The two provider names the OAuth legs write (``routers/auth.py``). Values of
#: the :class:`AuthProvider` enum since #1771; the column stays a plain string.
_GOOGLE = AuthProvider.GOOGLE
_DEV = AuthProvider.DEV


async def _account_count(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(Account))
    return result.scalar_one()


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

    assert resp.status_code == 403
    assert detail_code(resp.json()["detail"]) == ErrorCode.oauth_email_unverified.value
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
