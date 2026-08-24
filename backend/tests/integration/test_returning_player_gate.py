"""A returning deleted player consents to starting fresh (#2162, ADR-0081).

**Seam under test:** ``services.auth.create_or_get_account`` — the one function
that turns an OAuth identity into an Account — plus the HTTP round trip the
consent needs, because consent is a second request and a second request is only
observable through the app.

Two behaviours meet here and they are deliberately *different branches* of that
function, not one rule with two spellings:

* **A known identity** (a live ``OAuthProvider`` row) whose Account is not
  ``active``. Before this issue that branch returned the Account without ever
  reading ``status``: a suspended player was handed a valid JWT cookie and then
  401'd by ``get_current_account`` on every call afterwards — signed in and
  broken, with nothing saying why.
* **An unknown identity** that a tombstone recognises. #2160 already resolves
  the tombstone here for its purge side effect; what was missing is reading the
  return value. A hit must not silently mint an account — the player is owed the
  sentence "nothing carries over" and a button, per the owner ruling of
  2026-08-17.

The gate carries **no offer of old data**, so nothing in here asserts that any
of it comes back. There is nothing to come back: ``delete_account`` blanked it.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from errors import ErrorCode, detail_code
from models.account import (
    Account,
    AccountStatus,
    AccountTombstone,
    AuthProvider,
    OAuthProvider,
)
from services.account_deletion import (
    TOMBSTONE_RETENTION_DAYS,
    delete_account,
    hash_provider_user_id,
)
from services.auth import ReturningPlayerConsentRequired, create_or_get_account

_GOOGLE = AuthProvider.GOOGLE

#: The identity the departed player comes back with. One constant so the
#: digest, the stub profile and the confirm step cannot drift apart.
_SUB = "google-sub-came-back"
_RETURNING_EMAIL = "came-back@example.com"


class _StubGoogleClient:
    """Stands in for ``_OAUTH.google``; the callback calls only this.

    Same shape as ``tests/integration/test_account_linking.py``'s stub — the
    handler reads ``token["userinfo"]`` when present and never reaches
    ``userinfo()``.
    """

    def __init__(self, userinfo: dict) -> None:
        self._userinfo = userinfo

    async def authorize_access_token(self, request) -> dict:
        return {"userinfo": self._userinfo}


async def _account_count(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(Account))
    return result.scalar_one()


async def _tombstone(session: AsyncSession) -> AccountTombstone | None:
    return (
        await session.execute(
            select(AccountTombstone).where(
                AccountTombstone.provider == _GOOGLE,
                AccountTombstone.provider_user_hash
                == hash_provider_user_id(_GOOGLE, _SUB),
            )
        )
    ).scalar_one_or_none()


async def _departed_account(session: AsyncSession, era) -> Account:
    """An account that signed in with ``_SUB``, then deleted itself.

    Driven through the real ``delete_account`` rather than by writing an
    ``AccountTombstone`` by hand: the digest, the destroyed OAuth row and the
    released email are all things that function decides, and a hand-built row
    would let this file keep passing after that function changed its mind.
    """
    account = Account(email="before-the-end@example.com")
    session.add(account)
    await session.flush()
    session.add(
        OAuthProvider(account_id=account.id, provider=_GOOGLE, provider_user_id=_SUB)
    )
    await session.flush()
    await delete_account(account.id, session, era)
    await session.flush()
    return account


def _stub_google(monkeypatch: pytest.MonkeyPatch, **overrides) -> None:
    from routers import auth as auth_router

    profile = {"sub": _SUB, "email": _RETURNING_EMAIL, "email_verified": True}
    profile.update(overrides)
    monkeypatch.setattr(auth_router._OAUTH, "google", _StubGoogleClient(profile))


# ---------------------------------------------------------------------------
# The gate — an unknown identity a tombstone recognises
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_live_tombstone_stops_the_sign_in_before_anything_is_minted(
    db_session: AsyncSession, era
) -> None:
    """The defect: today this branch mints an account and says nothing."""
    await _departed_account(db_session, era)
    accounts_before = await _account_count(db_session)

    with pytest.raises(ReturningPlayerConsentRequired) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id=_SUB,
            email=_RETURNING_EMAIL,
            email_verified=True,
            session=db_session,
        )

    # The three things the gate needs to finish the job it interrupted, and the
    # date its sentence is built from.
    assert excinfo.value.provider == _GOOGLE
    assert excinfo.value.provider_user_id == _SUB
    assert excinfo.value.email == _RETURNING_EMAIL
    assert excinfo.value.deleted_on == datetime.now(timezone.utc).date()

    assert await _account_count(db_session) == accounts_before
    # Refused, not consumed: the player has not consented yet, so the tombstone
    # must still recognise them when they come back through the confirm step.
    assert await _tombstone(db_session) is not None


@pytest.mark.asyncio
async def test_an_expired_tombstone_is_an_ordinary_new_signup(
    db_session: AsyncSession, era
) -> None:
    """Past ninety days there is nobody to recognise — and the row goes."""
    await _departed_account(db_session, era)
    tombstone = await _tombstone(db_session)
    assert tombstone is not None
    tombstone.created_at = datetime.now(timezone.utc) - timedelta(
        days=TOMBSTONE_RETENTION_DAYS + 1
    )
    await db_session.flush()

    account = await create_or_get_account(
        provider=_GOOGLE,
        provider_user_id=_SUB,
        email=_RETURNING_EMAIL,
        email_verified=True,
        session=db_session,
    )

    assert account.status is AccountStatus.active
    assert await _tombstone(db_session) is None


@pytest.mark.asyncio
async def test_an_unverified_email_is_still_refused_before_the_gate(
    db_session: AsyncSession, era
) -> None:
    """Consent cannot rescue a claim the provider does not vouch for.

    Ordering, stated as a test because it is invisible in the code: the
    verified-email gate (ADR-0075) runs FIRST, so a token is never minted for a
    sign-in that would be refused at the confirm step anyway.
    """
    await _departed_account(db_session, era)

    with pytest.raises(HTTPException) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id=_SUB,
            email=_RETURNING_EMAIL,
            email_verified=False,
            session=db_session,
        )
    assert detail_code(excinfo.value.detail) == ErrorCode.oauth_email_unverified.value


# ---------------------------------------------------------------------------
# The adjacent bug — a known identity whose Account is not active
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_suspended_account_is_refused_instead_of_signed_in(
    db_session: AsyncSession, account: Account
) -> None:
    """Was: a JWT cookie, then a 401 from every call after it."""
    account.status = AccountStatus.suspended
    db_session.add(
        OAuthProvider(
            account_id=account.id, provider=_GOOGLE, provider_user_id="google-suspended"
        )
    )
    await db_session.flush()

    with pytest.raises(HTTPException) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id="google-suspended",
            email=account.email,
            email_verified=True,
            session=db_session,
        )
    assert excinfo.value.status_code == 403
    assert detail_code(excinfo.value.detail) == ErrorCode.account_suspended.value


@pytest.mark.asyncio
async def test_a_deleted_account_is_refused_in_its_own_words(
    db_session: AsyncSession, account: Account
) -> None:
    """Unreachable by construction, and deliberately not the suspended message.

    ``delete_account`` destroys the OAuth rows in the same transaction that sets
    the status, so this pairing should not exist. If it ever does it is a data
    defect, and the one outcome that must not follow from it is a session.
    """
    account.status = AccountStatus.deleted
    db_session.add(
        OAuthProvider(
            account_id=account.id, provider=_GOOGLE, provider_user_id="google-deleted"
        )
    )
    await db_session.flush()

    with pytest.raises(HTTPException) as excinfo:
        await create_or_get_account(
            provider=_GOOGLE,
            provider_user_id="google-deleted",
            email=account.email,
            email_verified=True,
            session=db_session,
        )
    assert excinfo.value.status_code == 403
    assert detail_code(excinfo.value.detail) == ErrorCode.account_deleted.value


# ---------------------------------------------------------------------------
# The round trip — callback, gate, confirm
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_callback_sends_a_returning_player_to_the_gate_with_no_session(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch, era
) -> None:
    await _departed_account(db_session, era)
    await db_session.commit()
    accounts_before = await _account_count(db_session)
    _stub_google(monkeypatch)

    resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    assert urlparse(resp.headers["location"]).path == "/start/again"
    # The whole point: no session until they say yes.
    assert resp.cookies.get("access_token") is None
    assert await _account_count(db_session) == accounts_before


@pytest.mark.asyncio
async def test_the_gate_reads_its_date_and_the_confirm_lands_in_a_fresh_account(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch, era
) -> None:
    """One button, and what is behind it: a brand-new account, tombstone gone."""
    departed = await _departed_account(db_session, era)
    await db_session.commit()
    accounts_before = await _account_count(db_session)
    _stub_google(monkeypatch)

    await client.get("/auth/google/callback")

    gate = await client.get("/auth/returning-player")
    assert gate.status_code == 200
    assert gate.json()["deleted_on"] == datetime.now(timezone.utc).date().isoformat()

    confirm = await client.post("/auth/returning-player")
    assert confirm.status_code == 200
    assert client.cookies.get("access_token")

    assert await _account_count(db_session) == accounts_before + 1
    # Fresh, not the corpse.
    fresh = (
        await db_session.execute(
            select(Account).where(Account.email == _RETURNING_EMAIL)
        )
    ).scalar_one()
    assert fresh.id != departed.id
    assert fresh.status is AccountStatus.active
    # Cleared, so the gate cannot be shown a second time for this identity.
    assert await _tombstone(db_session) is None


@pytest.mark.asyncio
async def test_the_gate_is_nothing_without_a_sign_in_behind_it(
    client: AsyncClient,
) -> None:
    """Walked into by URL, or come back to after the ten-minute window lapsed."""
    for response in (
        await client.get("/auth/returning-player"),
        await client.post("/auth/returning-player"),
    ):
        assert response.status_code == 404
        assert (
            detail_code(response.json()["detail"])
            == ErrorCode.returning_player_consent_expired.value
        )


@pytest.mark.asyncio
async def test_an_ordinary_new_signup_sees_none_of_this(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The regression guard: a stranger still lands in a session, at home."""
    accounts_before = await _account_count(db_session)
    _stub_google(monkeypatch, sub="google-sub-stranger", email="stranger@example.com")

    resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    assert resp.headers["location"] == settings.FRONTEND_URL
    assert resp.cookies.get("access_token")
    assert await _account_count(db_session) == accounts_before + 1
