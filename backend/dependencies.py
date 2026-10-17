"""Shared FastAPI dependencies used across multiple routers."""
from typing import Optional

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from errors import ErrorCode, raise_coded
from models.account import Account, AccountStatus
from models.character import Character
from models.roles import AccountRole, Role
from services.auth import decode_jwt, get_current_account
from services.character import resolve_active_character

_OPTIONAL_BEARER = HTTPBearer(auto_error=False)


async def get_current_character(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Character:
    """Return the account's active (carried) character — the actor for every write path.

    Honours ``account.active_character_id`` (the life the player is currently
    carrying); falls back to the most-recently-created active character.
    Raises 403 if the account has no active character yet.
    """
    character = await resolve_active_character(account, session)
    if character is None:
        raise HTTPException(
            status_code=403,
            detail="No active character found. Create a character first.",
        )
    return character


async def get_current_account_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_OPTIONAL_BEARER),
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Optional[Account]:
    """Resolve the current account when a token is present, else ``None``.

    Mirror of :func:`services.auth.get_current_account` that never raises — used
    by public endpoints (e.g. the faction listing) that stay anonymous-friendly
    but tailor their response for a logged-in caller when a token is supplied.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token
    if not token:
        return None

    try:
        payload = decode_jwt(token)
        account_id = int(payload["sub"])
    except Exception:
        return None

    account_result = await session.execute(
        select(Account).where(Account.id == account_id)
    )
    account = account_result.scalar_one_or_none()
    if account is None or account.status != AccountStatus.active:
        return None
    return account


async def get_current_character_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_OPTIONAL_BEARER),
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Optional[Character]:
    """Mirror of :func:`get_current_character` that never raises.

    Used by public detail endpoints (praxis, task) that compute viewer-relative
    fields when a token is present but still serve anonymous traffic.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif access_token:
        token = access_token
    if not token:
        return None

    try:
        payload = decode_jwt(token)
    except Exception:
        return None

    try:
        account_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None

    account_result = await session.execute(
        select(Account).where(Account.id == account_id)
    )
    account = account_result.scalar_one_or_none()
    if account is None or account.status != AccountStatus.active:
        return None

    return await resolve_active_character(account, session)


async def require_admin(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Account:
    """Raise 403 unless the authenticated account has the 'admin' role."""
    if not await account_has_admin_role(account.id, session):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return account


async def get_viewer_is_admin(
    account: Optional[Account] = Depends(get_current_account_optional),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> bool:
    """Resolve "is the viewer an admin", anonymous-safe.

    For routes that stay reachable by anonymous callers but let an admin see
    more (#2400-style reveals). Never raises — an anonymous caller resolves to
    ``False`` rather than 401. Use :func:`require_admin` instead when admin is
    a hard gate rather than a behaviour modifier.
    """
    if account is None:
        return False
    return await account_has_admin_role(account.id, session)


async def account_has_admin_role(account_id: int, session: AsyncSession) -> bool:
    """Return True if the given account has the 'admin' role.

    Use this when admin status is informational (e.g. a flag on a response or a
    behaviour modifier) rather than a hard access gate — for the gate, use
    :func:`require_admin`.
    """
    result = await session.execute(
        select(AccountRole)
        .join(Role, AccountRole.role_id == Role.id)
        .where(AccountRole.account_id == account_id, Role.name == "admin")
    )
    return result.scalar_one_or_none() is not None


#: The owner is this account, and only while it also holds the admin role
#: (#3258). An id, never a username: a username is released when its account is
#: deleted and can be claimed by a stranger; Postgres never reuses an id, and
#: ``seed.bootstrap_admin`` creates the owner first on an empty database.
OWNER_ACCOUNT_ID = 1


async def account_is_owner(account_id: int, session: AsyncSession) -> bool:
    """True for :data:`OWNER_ACCOUNT_ID` while it still holds admin."""
    return account_id == OWNER_ACCOUNT_ID and await account_has_admin_role(
        account_id, session
    )


async def require_owner(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Account:
    """Raise 403 unless the account is the owner (admin alone is not enough)."""
    if not await account_is_owner(account.id, session):
        raise_coded(403, ErrorCode.admin_owner_required, "Owner access required.")
    return account
