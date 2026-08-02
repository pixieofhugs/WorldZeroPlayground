from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from authlib.jose import JoseError, JsonWebToken
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from models.account import Account, AccountStatus, OAuthProvider

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_DAYS = 7

# Constructed with an explicit allow-list so a token that names any other
# algorithm (``none`` included) is rejected before the signature is checked.
# ponytail: ``authlib.jose`` is deprecated in favour of the standalone
# ``joserfc`` package and stays available until authlib 2.0. Upgrade path when
# that lands: swap JsonWebToken for ``joserfc.jwt`` and add the dependency.
_JWT = JsonWebToken([_ALGORITHM])

_BEARER = HTTPBearer(auto_error=False)


def create_jwt(account_id: int) -> str:
    payload = {
        "sub": str(account_id),
        # JWT ``exp`` is a NumericDate — seconds since the epoch, not a datetime.
        "exp": int(
            (datetime.now(timezone.utc) + timedelta(days=_TOKEN_EXPIRE_DAYS)).timestamp()
        ),
    }
    return _JWT.encode({"alg": _ALGORITHM}, payload, settings.SECRET_KEY).decode()


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        claims = _JWT.decode(token, settings.SECRET_KEY)
        # decode() only verifies the signature; validate() is what enforces exp.
        claims.validate()
    except JoseError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please log in again.")
    if claims.get("sub") is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is invalid. Please log in again.")
    return dict(claims)


async def get_current_account(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_BEARER),
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db),
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
    provider: str,
    provider_user_id: str,
    email: str,
    session: AsyncSession,
) -> Account:
    """Resolve an OAuth identity to an Account, minting one on first sight.

    Deliberately takes no ``access_token`` (#1374): World Zero authenticates
    every request with its own JWT and never calls a provider API on the
    player's behalf, so the provider's token was stored at rest and read by
    nothing. The callback now drops it on the floor instead.
    """
    # Check if this OAuth identity already exists
    result = await session.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == provider,
            OAuthProvider.provider_user_id == provider_user_id,
        )
    )
    oauth_row = result.scalar_one_or_none()

    if oauth_row:
        result = await session.execute(
            select(Account).where(Account.id == oauth_row.account_id)
        )
        return result.scalar_one()

    # No existing OAuth link — find or create the Account by email
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
