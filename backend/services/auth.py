from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from authlib.jose import JoseError, JsonWebToken
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from errors import ErrorCode, raise_coded
from models.account import Account, AccountStatus, AuthProvider, OAuthProvider

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_DAYS = 7

# Explicit allow-list: a token naming any other algorithm (``none`` too) is rejected.
# ponytail: ``authlib.jose`` is deprecated in favour of the standalone
# ``joserfc`` until authlib 2.0; then swap to ``joserfc.jwt`` + add the dep.
_JWT = JsonWebToken([_ALGORITHM])

_BEARER = HTTPBearer(auto_error=False)


class ReturningPlayerConsentRequired(Exception):
    """A departed player signed in again inside the retention window (#2162).

    Not an :class:`HTTPException` on purpose: this is a pause for one question,
    not a refusal, and the ``except (HTTPException, OAuthError)`` arm in each
    callback must not swallow it. Carries what the confirm step needs.

    ``deleted_on`` is a date, not a timestamp: the hour would leak more about a
    deleted account to an unauthenticated viewer than the copy needs.
    """

    def __init__(
        self, provider: str, provider_user_id: str, email: str, deleted_on: date
    ) -> None:
        super().__init__(provider, deleted_on)
        self.provider = provider
        self.provider_user_id = provider_user_id
        self.email = email
        self.deleted_on = deleted_on


def create_jwt(account_id: int) -> str:
    payload = {
        "sub": str(account_id),
        # NumericDate: seconds since the epoch.
        "exp": int(
            (datetime.now(timezone.utc) + timedelta(days=_TOKEN_EXPIRE_DAYS)).timestamp()
        ),
    }
    return _JWT.encode({"alg": _ALGORITHM}, payload, settings.SECRET_KEY).decode()


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        claims = _JWT.decode(token, settings.SECRET_KEY)
        # decode() only verifies the signature; validate() enforces exp.
        claims.validate()
    except JoseError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please log in again.")
    if claims.get("sub") is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is invalid. Please log in again.")
    return dict(claims)


async def get_current_account(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_BEARER),
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Account:
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You need to be logged in to do that.")

    payload = decode_jwt(token)
    account_id = int(payload["sub"])

    result = await session.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if account is None or account.status != AccountStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your account could not be found. Please log in again.")

    return account


async def create_or_get_account(
    provider: AuthProvider,
    provider_user_id: str,
    email: str,
    email_verified: bool,
    session: AsyncSession,
) -> Account:
    """Resolve an OAuth identity to an Account, minting one on first sight.

    ``email_verified`` has no default on purpose (#1771); enforced on the email
    branch only. No ``access_token`` (#1374): we never call provider APIs.
    """
    result = await session.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == provider,
            OAuthProvider.provider_user_id == provider_user_id,
        )
    )
    oauth_row = result.scalar_one_or_none()

    if oauth_row:
        # Known identity: email is irrelevant, so ``email_verified`` is not
        # consulted — a transiently-false flag (Discord email change) must not
        # 403 a returning player (ADR-0075).
        result = await session.execute(
            select(Account).where(Account.id == oauth_row.account_id)
        )
        account = result.scalar_one()
        # Status IS consulted (#2162): otherwise a moderated player gets a JWT
        # and then a 401 on every request with no explanation. Two statuses,
        # two distinct answers.
        if account.status is AccountStatus.suspended:
            raise_coded(
                403,
                ErrorCode.account_suspended,
                "That account is suspended.",
            )
        if account.status is AccountStatus.deleted:
            # Unreachable: `delete_account` destroys this OAuthProvider row
            # (ADR-0081). Kept so a data defect never yields a session on a tombstone.
            raise_coded(
                403,
                ErrorCode.account_deleted,
                "That account was deleted.",
            )
        return account

    # Past here we key off the email claim, so it must be provider-verified:
    # an unseen identity links to any existing account with that email, making
    # the claim an authentication decision (account takeover otherwise). Minting
    # is gated too — an unverified mint is the same takeover reversed.
    #
    # This is also the only place a deleted account's digest is read, so 90-day
    # retention is enforced here by purge-on-access (ADR-0081, #2160); an
    # expired tombstone returns None like a new signup.
    #
    # Local import: services.account_deletion -> services.character -> here.
    from services.account_deletion import resolve_account_tombstone

    tombstone = await resolve_account_tombstone(provider, provider_user_id, session)

    # `is not True`: Google has emitted the *string* "true".
    if email_verified is not True:
        raise_coded(
            403,
            ErrorCode.oauth_email_unverified,
            "Your account's email address is not verified.",
        )

    # A live tombstone: ask before minting a new account (#2162). Not consumed
    # here — the confirm step (``routers.auth.confirm_returning_player``) clears
    # it, so its own call falls through to the mint below. After the email gate
    # so we never pause a sign-in that would be refused anyway.
    if tombstone is not None:
        raise ReturningPlayerConsentRequired(
            provider=provider,
            provider_user_id=provider_user_id,
            email=email,
            deleted_on=tombstone.created_at.date(),
        )

    result = await session.execute(select(Account).where(Account.email == email))
    account = result.scalar_one_or_none()

    if account is None:
        account = Account(email=email)
        session.add(account)
        await session.flush()  # get account.id without committing

    oauth_row = OAuthProvider(
        account_id=account.id,
        provider=provider,
        provider_user_id=provider_user_id,
    )
    session.add(oauth_row)
    await session.flush()
    await session.refresh(account)
    return account
