from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi import Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from game_config import CURRENT_ERA
from models.account import Account, AuthProvider
from schemas.auth import CurrentUser, DevLoginOut, LogoutOut
from schemas.character import CharacterCreate
from services.auth import create_jwt, create_or_get_account, get_current_account
from services.character import create_character, resolve_active_character
from services.current_user import build_current_user
from services.era import get_current_era_row, get_or_create_stats

router = APIRouter()

#: The ONE value that unlocks the dev seams below. `ENVIRONMENT` is a free-form
#: `str` defaulting to "development" (`config.py`), and the guards here used to
#: be deny-lists against the literal "production" — so every value that was not
#: exactly that ("prod", "Production", a trailing space, an env var dropped when
#: a Render service is re-created, unset) simultaneously enabled an
#: unauthenticated JWT mint AND stripped `Secure` from the session cookie. Both
#: now fail closed: anything unrecognised is treated as production.
#:
#: Safe to invert — `.github/workflows/e2e.yml:42` sets `ENVIRONMENT: development`
#: explicitly ("dev-login must be enabled"), the config default is "development",
#: and `render.yaml:34` is "production".
_ENV_DEVELOPMENT = "development"


def _is_development() -> bool:
    return settings.ENVIRONMENT == _ENV_DEVELOPMENT


_OAUTH = OAuth()
_OAUTH.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


# The two OAuth legs answer with a redirect, not JSON, so they carry
# `response_class=RedirectResponse` and a 302 instead of a `response_model`
# (#1400). A model here would be a lie the generated client believes: without
# it FastAPI documents a 200 with an empty JSON schema, which is exactly the
# untyped success shape the contract gate exists to remove. Declaring the
# redirect is the honest version — there is no body to type.
#
# The decorator's `status_code` does not touch runtime behaviour: both handlers
# return a Response object, which FastAPI passes through untouched.


@router.get("/google", response_class=RedirectResponse, status_code=302)
async def auth_google(request: Request):
    """Redirect the browser to Google's OAuth consent screen."""
    return await _OAUTH.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback", response_class=RedirectResponse, status_code=302)
async def auth_google_callback(
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """Exchange the OAuth code for a token, create/get the Account, set JWT cookie.

    Redirects to ``settings.FRONTEND_URL`` carrying the session cookie.
    """
    token = await _OAUTH.google.authorize_access_token(request)
    user_info = token.get("userinfo") or await _OAUTH.google.userinfo(token=token)

    # Google's access token is used here and then discarded (#1374): it proves
    # this sign-in, and nothing afterwards calls a Google API as the player. The
    # session that follows is World Zero's own JWT.
    #
    # `email_verified` is forwarded, not enforced here (#1771): it only matters
    # on the branch that resolves an account *by email*, and the service owns
    # that branch. Gating here would also have rejected a returning player whose
    # provider says "unverified" while an address change is in flight — someone
    # their `sub` already identifies. The claim is normalised to a real bool at
    # the edge because a provider may answer with anything at all.
    account = await create_or_get_account(
        provider=AuthProvider.GOOGLE,
        provider_user_id=user_info["sub"],
        email=user_info["email"],
        email_verified=user_info.get("email_verified") is True,
        session=session,
    )

    jwt_token = create_jwt(account.id)
    response = Response(status_code=302, headers={"location": settings.FRONTEND_URL})
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        # Fail closed: Secure unless we KNOW this is local development.
        secure=not _is_development(),
        max_age=_COOKIE_MAX_AGE,
        # `or None`: an unset COOKIE_DOMAIN arrives as "" from a .env line with
        # no value, and "" is not None — Starlette would emit a bare `Domain=`.
        domain=settings.COOKIE_DOMAIN or None,
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


@router.post("/logout", response_model=LogoutOut)
async def auth_logout(response: Response) -> LogoutOut:
    """Clear the JWT cookie."""
    response.delete_cookie(
        "access_token",
        httponly=True,
        samesite="lax",
        # Fail closed, and must match the flags the cookie was set with.
        secure=not _is_development(),
        # `or None`: an unset COOKIE_DOMAIN arrives as "" from a .env line with
        # no value, and "" is not None — Starlette would emit a bare `Domain=`.
        domain=settings.COOKIE_DOMAIN or None,
    )
    return LogoutOut(message="Logged out")


@router.post("/dev-login", response_model=DevLoginOut)
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
    if not _is_development():
        raise HTTPException(status_code=404, detail="Not found.")

    provider_user_id = "dev-user-1" if key == "1" else f"dev-{key}"
    email = "dev@localhost" if key == "1" else f"dev-{key}@localhost"

    account = await create_or_get_account(
        provider=AuthProvider.DEV,
        provider_user_id=provider_user_id,
        email=email,
        # This seam mints its own `@localhost` addresses and is 404 outside
        # development, so there is no provider to ask — the fact is asserted.
        email_verified=True,
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
    return DevLoginOut(
        message="Dev login successful",
        account_id=account.id,
        character_id=character.id if character else None,
        character_name=character.display_name if character else None,
        faction_slug=character.faction_slug if character else None,
    )
