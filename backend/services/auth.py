from datetime import datetime, timedelta, timezone
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
    provider: AuthProvider,
    provider_user_id: str,
    email: str,
    email_verified: bool,
    session: AsyncSession,
) -> Account:
    """Resolve an OAuth identity to an Account, minting one on first sight.

    ``email_verified`` is the provider's claim that the bearer controls the
    address, and it has **no default on purpose** (#1771): a boolean a caller
    must supply is harder to forget than a check a new provider handler must
    remember to write. It is enforced on the email branch only — see below.

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
        # A returning player is identified by ``provider_user_id``; their email
        # decides nothing here, so ``email_verified`` is deliberately not
        # consulted. Any provider whose verified flag can go transiently false
        # — changing a Discord email re-sends a verification mail — would
        # otherwise 403 a player who has signed in fifty times (ADR-0075).
        result = await session.execute(
            select(Account).where(Account.id == oauth_row.account_id)
        )
        return result.scalar_one()

    # Everything past here keys off the email claim, so the claim has to be one
    # the provider vouches for. An unseen OAuth identity is attached to any
    # EXISTING account holding the same email (below), which makes that claim an
    # authentication decision: any condition under which a provider emits an
    # address the bearer does not control (an unverified Google Workspace
    # identity; a Workspace domain changing hands, letting a new admin mint
    # `victim@thatdomain` with a fresh `sub`) would link a new provider row to
    # the victim's account and mint a full session for it — their characters,
    # their score — with no re-authentication and no notification. Minting is
    # gated too, not just linking: an Account created under an unverified
    # address is the same takeover one sign-in later, with the roles reversed.
    #
    # An identity we do not currently know is also the only moment a *deleted*
    # account's retained digest is ever looked at, so this is where the 90-day
    # retention is enforced (ADR-0081, #2160): purge-on-access, because there is
    # no job runner. The returning tombstone is what #2162's gate will read to
    # offer "start fresh as a new player"; the call is here today for the purge,
    # and deliberately changes nothing about what this function returns — a
    # returning player lands in a NEW account, which is the whole reason the
    # deleted one released its email and dropped its OAuth rows.
    #
    # Imported inside the function: ``services.account_deletion`` imports
    # ``services.character``, which imports this module.
    from services.account_deletion import resolve_account_tombstone

    await resolve_account_tombstone(provider, provider_user_id, session)

    # `is not True` rather than a falsy test: Google has emitted this claim as
    # the *string* "true", and every other non-bool is equally a provider whose
    # answer we did not understand.
    if email_verified is not True:
        raise_coded(
            403,
            ErrorCode.oauth_email_unverified,
            "Your account's email address is not verified.",
        )

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
