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

# Constructed with an explicit allow-list so a token that names any other
# algorithm (``none`` included) is rejected before the signature is checked.
# ponytail: ``authlib.jose`` is deprecated in favour of the standalone
# ``joserfc`` package and stays available until authlib 2.0. Upgrade path when
# that lands: swap JsonWebToken for ``joserfc.jwt`` and add the dependency.
_JWT = JsonWebToken([_ALGORITHM])

_BEARER = HTTPBearer(auto_error=False)


class ReturningPlayerConsentRequired(Exception):
    """A departed player signed in again inside the retention window (#2162).

    **Not an** :class:`HTTPException`, on purpose. Every other way
    :func:`create_or_get_account` stops is a refusal — the provider's claim was
    no good, the account is suspended — and ``routers.auth`` answers all of them
    the same way, with a code in ``?login=``. This is not a refusal. The sign-in
    is *paused* for one question, the player can answer it, and the answer leads
    somewhere. A distinct type keeps that difference in the type system rather
    than in a code the failure handler has to remember to special-case, and it
    means the ``except (HTTPException, OAuthError)`` arm in each callback cannot
    swallow it by accident.

    Carries everything the confirm step needs to finish the sign-in it
    interrupted — the identity, and the date its sentence is built from — so the
    callback does not have to re-read a row it has already read.

    ``deleted_on`` is a **date, not a timestamp**, and that is the whole of what
    leaves the server. The gate's copy says *"you deleted your account on 3
    March"*; the hour and minute would be a more precise signal about an account
    that no longer exists, disclosed to somebody who has authenticated as
    nobody, in exchange for nothing the sentence needs.

    ``email`` is ``str | None`` since the email-less lanes landed (ADR-0088):
    an atproto/key sign-in that parks here carries no address, and the confirm
    step hands ``None`` straight back to :func:`create_or_get_account`, which
    mints email-less as it did before the pause.
    """

    def __init__(
        self, provider: str, provider_user_id: str, email: str | None, deleted_on: date
    ) -> None:
        super().__init__(provider, deleted_on)
        self.provider = provider
        self.provider_user_id = provider_user_id
        self.email = email
        self.deleted_on = deleted_on


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
    email: str | None,
    email_verified: bool,
    session: AsyncSession,
) -> Account:
    """Resolve an OAuth identity to an Account, minting one on first sight.

    ``email_verified`` is the provider's claim that the bearer controls the
    address, and it has **no default on purpose** (#1771): a boolean a caller
    must supply is harder to forget than a check a new provider handler must
    remember to write. It is enforced on the email branch only — see below.

    ``email`` became ``str | None`` when the email-less lanes landed
    (ADR-0088): an ATProto DID or an Ed25519 key is not a mailbox. A ``None``
    email skips the verified claim, the account lookup and the link below
    wholesale — they are all statements about an address this caller does not
    carry. The ``provider_user_id`` + tombstone work above is email-agnostic
    and runs for every lane unchanged.

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
        account = result.scalar_one()
        # Status IS consulted, unlike email (#2162). Until this check landed the
        # branch returned the row unread, so a moderated player got the full
        # success path — a JWT cookie, a redirect home — and then a 401 from
        # `get_current_account` (which accepts only `active`) on every request
        # after it. Signed in and broken, with nothing anywhere saying why.
        #
        # Two statuses, two answers, deliberately not one bucket. They differ in
        # who did it and whether anything can be done about it, and the gate is
        # the only place a player is ever told either thing.
        if account.status is AccountStatus.suspended:
            raise_coded(
                403,
                ErrorCode.account_suspended,
                "That account is suspended.",
            )
        if account.status is AccountStatus.deleted:
            # Unreachable by construction: `delete_account` destroys this very
            # `OAuthProvider` row in the transaction that sets the status
            # (ADR-0081), which is what routes a returning player to the gate
            # below instead of here. Kept because the pairing existing at all
            # would be a data defect, and the one outcome that must not follow
            # from a data defect is a working session on a tombstone.
            raise_coded(
                403,
                ErrorCode.account_deleted,
                "That account was deleted.",
            )
        return account

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
    # no job runner. A row past its date is deleted by the call itself and
    # returns None, which is why "expired tombstone" and "never had one" need no
    # branch here — both are an ordinary new signup.
    #
    # Imported inside the function: ``services.account_deletion`` imports
    # ``services.character``, which imports this module.
    from services.account_deletion import resolve_account_tombstone

    tombstone = await resolve_account_tombstone(provider, provider_user_id, session)

    # The whole verified-email argument applies to a caller carrying an
    # address. Email-less lanes (ADR-0088) hold nothing a provider could vouch
    # for, so the gate below does not apply to them at all: guard the branch,
    # not the value.
    if email is not None and email_verified is not True:
        raise_coded(
            403,
            ErrorCode.oauth_email_unverified,
            "Your account's email address is not verified.",
        )

    # A live tombstone means this identity used to be somebody here and ended
    # it. Minting silently would be the wrong answer twice over: the player is
    # not told that the account they are signing into is not the one they had,
    # and nobody asked them whether they wanted a new one (#2162, owner ruling
    # 2026-08-17). So the sign-in pauses for one question.
    #
    # The tombstone is deliberately NOT consumed here. Consent has not been
    # given yet, and a player who closes the tab must still be recognised the
    # next time they come back — it is the confirm step
    # (``routers.auth.confirm_returning_player``) that clears it, which is also
    # what makes that step's own call to this function fall through to the
    # ordinary mint below.
    #
    # AFTER the verified-email gate above, so a token is never minted for a
    # sign-in that would be refused at the confirm step anyway.
    if tombstone is not None:
        raise ReturningPlayerConsentRequired(
            provider=provider,
            provider_user_id=provider_user_id,
            email=email,
            deleted_on=tombstone.created_at.date(),
        )

    # No existing OAuth link — find or create the Account by email. None of
    # this branch exists for a None email (ADR-0088): there is no address to
    # look up, nothing to link, and a mint is the only question left.
    account: Account | None = None
    if email is not None:
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
