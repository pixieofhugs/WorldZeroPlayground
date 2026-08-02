from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from game_config import CURRENT_ERA
from models.account import Account
from schemas.auth import CurrentUser
from schemas.character import CharacterCreate
from services.auth import create_jwt, create_or_get_account, get_current_account
from services.character import create_character, resolve_active_character
from services.current_user import build_current_user
from services.era import get_current_era_row, get_or_create_stats

router = APIRouter()

_ENV_PRODUCTION = "production"

_OAUTH = OAuth()
_OAUTH.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


@router.get("/google")
async def auth_google(request: Request):
    """Redirect the browser to Google's OAuth consent screen."""
    return await _OAUTH.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def auth_google_callback(
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """Exchange the OAuth code for a token, create/get the Account, set JWT cookie."""
    token = await _OAUTH.google.authorize_access_token(request)
    user_info = token.get("userinfo") or await _OAUTH.google.userinfo(token=token)

    # Google's access token is used here and then discarded (#1374): it proves
    # this sign-in, and nothing afterwards calls a Google API as the player. The
    # session that follows is World Zero's own JWT.
    account = await create_or_get_account(
        provider="google",
        provider_user_id=user_info["sub"],
        email=user_info["email"],
        session=session,
    )

    jwt_token = create_jwt(account.id)
    response = Response(status_code=302, headers={"location": settings.FRONTEND_URL})
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == _ENV_PRODUCTION,
        max_age=_COOKIE_MAX_AGE,
        domain=settings.COOKIE_DOMAIN,
    )
    return response


@router.get("/me", response_model=CurrentUser)
async def auth_me(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """Return the current account and its carried (active) character.

    Exposes account_id — this is intentional and the single authorized exception to the
    "never leak account_id publicly" rule. Caller is authenticated; they receive only their
    own id. See SPEC-backend-architecture.md §4.
    """
    return await build_current_user(account, session)


@router.post("/logout")
async def auth_logout(response: Response):
    """Clear the JWT cookie."""
    response.delete_cookie(
        "access_token",
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        domain=settings.COOKIE_DOMAIN,
    )
    return {"message": "Logged out"}


@router.post("/dev-login")
async def dev_login(
    response: Response,
    session: AsyncSession = Depends(get_db),
    key: str = "1",
    name: Optional[str] = None,
    level: int = 0,
    faction: Optional[str] = None,
):
    """Dev-only bot login (bypasses Google OAuth). Disabled in production.

    Optional query params turn it into a one-call e2e fixture:
      key     — distinct dev account selector ("1" = the legacy dev account)
      name    — if set, ensure the account carries a character with this display name
      level   — if >0, seed the carried character's current-era level (collab needs >=1)
      faction — if set, place the carried character in that faction directly

    `faction` deliberately bypasses the join gate rather than replaying it.
    Players start unaffiliated and most factions are invite-gated
    (ADR-0030), so there is no real flow that puts a test character in all
    seven — and the contrast sweep (#651) needs exactly that. This is the
    same dev-only seam as `key`/`name`/`level`, behind the same production
    guard; it is not a second enabler.

    Returns account_id + character_id so tests can invite/credit by id.
    """
    if settings.ENVIRONMENT == _ENV_PRODUCTION:
        raise HTTPException(status_code=404, detail="Not found.")

    provider_user_id = "dev-user-1" if key == "1" else f"dev-{key}"
    email = "dev@localhost" if key == "1" else f"dev-{key}@localhost"

    account = await create_or_get_account(
        provider="dev",
        provider_user_id=provider_user_id,
        email=email,
        session=session,
    )

    character = await resolve_active_character(account, session)
    if character is None and name is not None:
        result = await create_character(
            account.id, CharacterCreate(display_name=name), session
        )
        character = result.character

    if faction is not None:
        if faction not in CURRENT_ERA.factions:
            raise HTTPException(
                status_code=400, detail=f"Unknown faction slug: {faction}"
            )
        if character is None:
            raise HTTPException(
                status_code=400,
                detail="faction needs a character — pass name= on the first call.",
            )
        character.faction_slug = faction
        await session.flush()

    if character is not None and level > 0:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character.id, era_row.id)
        thresholds = CURRENT_ERA.level_thresholds
        stats.level = level
        stats.score = thresholds[level] if level < len(thresholds) else thresholds[-1]
        stats.all_time_score = max(stats.all_time_score, stats.score)
        await session.flush()

    jwt_token = create_jwt(account.id)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=_COOKIE_MAX_AGE,
    )
    return {
        "message": "Dev login successful",
        "account_id": account.id,
        "character_id": character.id if character else None,
        "character_name": character.display_name if character else None,
        "faction_slug": character.faction_slug if character else None,
    }
