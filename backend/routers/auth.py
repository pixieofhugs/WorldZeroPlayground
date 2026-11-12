import logging
from datetime import date
from typing import Literal, Optional

# Not re-exported by `starlette_client`.
from authlib.integrations.base_client import MismatchingStateError
from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi import Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from errors import ErrorCode, coded_error, detail_code, raise_coded
from game_config import CURRENT_ERA
from models.account import Account, AuthProvider
from schemas.auth import (
    CurrentUser,
    DevLoginOut,
    LogoutOut,
    ReturningPlayerOut,
    StartFreshOut,
)
from schemas.character import CharacterCreate
from services.account_deletion import resolve_account_tombstone
from services.auth import (
    ReturningPlayerConsentRequired,
    create_jwt,
    create_or_get_account,
    get_current_account,
)
from services.character import (
    create_character,
    record_level_reached,
    resolve_active_character,
)
from services.current_user import build_current_user
from services.dev_fixture import albescent_floor, apply_dev_fixture
from services.era import get_current_era_row, get_or_create_stats

router = APIRouter()
logger = logging.getLogger(__name__)

_OAUTH = OAuth()
_OAUTH.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
# Endpoints explicit, not discovered: Discord's OIDC discovery is undocumented.
# The TRAILING SLASH on `api_base_url` is load-bearing: urljoin would otherwise
# drop `v10/` and hit deprecated v6, and no test would catch it.
# `name` is authlib's registry key, not a column value, so a bare string.
_OAUTH.register(
    name="discord",
    client_id=settings.DISCORD_CLIENT_ID,
    client_secret=settings.DISCORD_CLIENT_SECRET,
    authorize_url="https://discord.com/oauth2/authorize",
    access_token_url="https://discord.com/api/oauth2/token",
    api_base_url="https://discord.com/api/v10/",
    client_kwargs={"scope": "identify email"},
)

_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_session_cookie(response: Response, account_id: int) -> None:
    """The one place the session cookie's flags live; don't copy them.

    `dev_login` deliberately sets different flags.
    """
    response.set_cookie(
        key="access_token",
        value=create_jwt(account_id),
        httponly=True,
        samesite="lax",
        # Fail closed: Secure unless we KNOW this is local development.
        secure=not settings.is_development,
        max_age=_COOKIE_MAX_AGE,
        # "" from an empty .env line would emit a bare `Domain=`.
        domain=settings.COOKIE_DOMAIN or None,
    )


def _signed_in_redirect(account_id: int) -> Response:
    """Turn a resolved Account into a session: JWT cookie, then home."""
    response = Response(status_code=302, headers={"location": settings.FRONTEND_URL})
    _set_session_cookie(response, account_id)
    return response


#: Query param read by ``frontend/src/pages/Home.tsx``: ``required`` or an
#: :class:`ErrorCode` (SCREAMING_SNAKE, so no collision).
_LOGIN_PARAM = "login"

#: The provider ended the sign-in. Built via ``coded_error`` so
#: ``tests/unit/test_errors.py`` sees a construction site; never raised.
_PROVIDER_ENDED_IT = coded_error(
    403, ErrorCode.oauth_failed, "That sign-in did not complete."
)

#: The OAuth state cookie expired (#1756; 10 min, `main.py`). Never raised.
_STATE_WENT_STALE = coded_error(
    403, ErrorCode.oauth_state_expired, "That sign-in expired before it finished."
)


def _sign_in_failed_redirect(exc: Exception, provider: AuthProvider) -> Response:
    """302 home with an error code (#1773): a callback is a navigation, so a raise would
    show raw JSON.

    Order matters: ``MismatchingStateError`` subclasses ``OAuthError``.
    Anything else should still 500.
    """
    if isinstance(exc, HTTPException):
        detail = exc.detail
    elif isinstance(exc, MismatchingStateError):
        detail = _STATE_WENT_STALE.detail
    else:
        detail = _PROVIDER_ENDED_IT.detail
    # An uncoded HTTPException must not redirect to `?login=None`.
    code = detail_code(detail) or ErrorCode.oauth_failed.value
    # No PII or exception text (#3055). WARNING: uvicorn drops INFO here.
    logger.warning("sign-in refused (%s): %s", provider.value, code)
    return Response(
        status_code=302,
        headers={"location": f"{settings.FRONTEND_URL}?{_LOGIN_PARAM}={code}"},
    )


#: Frontend route of the consent gate (#2162).
_RETURNING_PLAYER_PATH = "/start/again"

#: Parked sign-in key in the signed Starlette session (its 10-min `max_age` in
#: `main.py` is the gate's window).
_PENDING_SIGNUP_KEY = "pending_returning_signup"


def _returning_player_redirect(
    request: Request, pending: ReturningPlayerConsentRequired
) -> Response:
    """Park the sign-in and redirect to the gate (#2162). No session cookie yet.

    Identity rides in the signed session, never the URL (history, referrers).
    """
    request.session[_PENDING_SIGNUP_KEY] = {
        "provider": str(pending.provider),
        "provider_user_id": pending.provider_user_id,
        "email": pending.email,
        "deleted_on": pending.deleted_on.isoformat(),
    }
    return Response(
        status_code=302,
        headers={"location": f"{settings.FRONTEND_URL}{_RETURNING_PLAYER_PATH}"},
    )


def _pending_signup(request: Request) -> dict:
    """The parked sign-in, or a 404 (typed URL or lapsed)."""
    pending = request.session.get(_PENDING_SIGNUP_KEY)
    if not isinstance(pending, dict):
        raise_coded(
            404,
            ErrorCode.returning_player_consent_expired,
            "That sign-in is no longer waiting on an answer.",
        )
    return pending


# Redirect legs declare `RedirectResponse` + 302 so OpenAPI isn't an untyped
# 200 (#1400). Runtime is unaffected: handlers return a Response.


@router.get("/google", response_class=RedirectResponse, status_code=302)
async def auth_google(request: Request):
    """Redirect the browser to Google's OAuth consent screen."""
    return await _OAUTH.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback", response_class=RedirectResponse, status_code=302)
async def auth_google_callback(
    request: Request,
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Exchange the OAuth code for a token, create/get the Account, set JWT cookie.

    Redirects to ``settings.FRONTEND_URL`` carrying the session cookie — or,
    for any terminal failure, to the same place carrying an error code instead
    of a session. See :func:`_sign_in_failed_redirect` for why a raise here
    cannot be left to FastAPI.
    """
    try:
        token = await _OAUTH.google.authorize_access_token(request)
        user_info = token.get("userinfo") or await _OAUTH.google.userinfo(token=token)

        # Token discarded after use (#1374). `email_verified` is forwarded, not
        # enforced: the service gates only the by-email branch (#1771).
        account = await create_or_get_account(
            provider=AuthProvider.GOOGLE,
            provider_user_id=user_info["sub"],
            email=user_info["email"],
            email_verified=user_info.get("email_verified") is True,
            session=session,
        )
    except ReturningPlayerConsentRequired as pending:
        # Paused for consent, not refused (#2162).
        return _returning_player_redirect(request, pending)
    except (HTTPException, OAuthError) as exc:
        return _sign_in_failed_redirect(exc, AuthProvider.GOOGLE)

    return _signed_in_redirect(account.id)


@router.get("/discord", response_class=RedirectResponse, status_code=302)
async def auth_discord(request: Request):
    """Redirect the browser to Discord's OAuth consent screen."""
    return await _OAUTH.discord.authorize_redirect(
        request, settings.DISCORD_REDIRECT_URI
    )


@router.get("/discord/callback", response_class=RedirectResponse, status_code=302)
async def auth_discord_callback(
    request: Request,
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Exchange the OAuth code for a token, create/get the Account, set JWT cookie.

    Redirects to ``settings.FRONTEND_URL`` carrying the session cookie — or,
    for any terminal failure, to the same place carrying an error code instead
    of a session. See :func:`_sign_in_failed_redirect`.

    Deliberately a second handler rather than a shared ``/auth/{provider}``: the
    two callbacks genuinely differ in how they obtain a profile, and an
    abstraction drawn at N=2 gets rebuilt at N=4. Generalise when a third
    provider shows what is actually shared.
    """
    try:
        token = await _OAUTH.discord.authorize_access_token(request)

        # No id_token from Discord, so fetch the profile. Relative path: see
        # the trailing-slash note at registration.
        resp = await _OAUTH.discord.get("users/@me", token=token)
        user_info = resp.json()

        # Tokens discarded (#1374).
        email = user_info.get("email")
        if not email:
            # Discord's email may be absent or null. Checked here so the service
            # keeps `email: str`. Raise; the `except` below does the redirect.
            raise_coded(
                403,
                ErrorCode.oauth_email_unverified,
                "Discord did not return an email address for that account.",
            )

        account = await create_or_get_account(
            provider=AuthProvider.DISCORD,
            # Snowflake string; the only immutable field.
            provider_user_id=user_info["id"],
            email=email,
            # Forwarded, not enforced here (#1771, ADR-0075).
            email_verified=user_info.get("verified") is True,
            session=session,
        )
    except ReturningPlayerConsentRequired as pending:
        # Paused for consent, not refused (#2162).
        return _returning_player_redirect(request, pending)
    except (HTTPException, OAuthError) as exc:
        return _sign_in_failed_redirect(exc, AuthProvider.DISCORD)

    return _signed_in_redirect(account.id)


@router.get("/returning-player", response_model=ReturningPlayerOut)
async def returning_player_gate(request: Request) -> ReturningPlayerOut:
    """What the consent gate says (#2162): a date, and nothing else.

    Read from the parked sign-in rather than the tombstone, so this route makes
    no lookup keyed on anything the caller supplied — there is nothing to
    supply. The identity is in the signed session or the gate does not exist.
    """
    return ReturningPlayerOut(
        deleted_on=date.fromisoformat(_pending_signup(request)["deleted_on"])
    )


@router.post("/returning-player", response_model=StartFreshOut)
async def confirm_returning_player(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db, scope="function"),
) -> StartFreshOut:
    """The one button: yes, start fresh (#2162).

    Explicitly **not** an offer of any old data, and there is none to offer —
    ``delete_account`` blanked it and there is no undo (ADR-0081). All this does
    is finish the sign-in the gate interrupted, as a stranger.

    The tombstone goes FIRST, and that ordering is what does the work: with it
    cleared, ``create_or_get_account`` finds no reason to pause and falls
    through to the ordinary stranger path — the same mint, the same email
    branch, the same rules. There is no second creation path here and no
    "consent given" flag threaded through the service to be got wrong.

    ``email_verified=True`` is a fact this server established, not a claim the
    caller made: the sign-in that parked this session got past
    ``create_or_get_account``'s verified-email gate before it ever reached the
    tombstone (ADR-0075, and ``test_returning_player_gate`` pins the ordering),
    and the parked address rode here inside a cookie signed with ``SECRET_KEY``.
    """
    pending = _pending_signup(request)
    provider = AuthProvider(pending["provider"])
    provider_user_id = pending["provider_user_id"]

    # Must go before create_or_get_account so it takes the stranger path.
    tombstone = await resolve_account_tombstone(provider, provider_user_id, session)
    if tombstone is not None:
        await session.delete(tombstone)
        await session.flush()

    account = await create_or_get_account(
        provider=provider,
        provider_user_id=provider_user_id,
        email=pending["email"],
        email_verified=True,
        session=session,
    )

    # The question has been answered; a second POST is an ordinary 404.
    del request.session[_PENDING_SIGNUP_KEY]
    _set_session_cookie(response, account.id)
    return StartFreshOut(message="Welcome back. This is a new account.")


@router.get("/me", response_model=CurrentUser)
async def auth_me(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
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
        # Must match the flags the cookie was set with.
        secure=not settings.is_development,
        # "" from an empty .env line would emit a bare `Domain=`.
        domain=settings.COOKIE_DOMAIN or None,
    )
    return LogoutOut(message="Logged out")


@router.post("/dev-login", response_model=DevLoginOut)
async def dev_login(
    response: Response,
    session: AsyncSession = Depends(get_db, scope="function"),
    key: str = "1",
    name: Optional[str] = None,
    level: int = 0,
    faction: Optional[str] = None,
    invited: Optional[str] = None,
    albescent: Optional[Literal["glimpsed", "unlocked"]] = None,
):
    """Dev-only bot login (bypasses Google OAuth). Disabled in production.

    Optional query params turn it into a one-call e2e fixture:
      key     — distinct dev account selector ("1" = the legacy dev account)
      name    — if set, ensure the account carries a character with this display name
      level   — if >0, seed the carried character's current-era level (collab needs >=1)
      faction — if set, place the carried character in that faction directly
      invited — comma list of faction slugs to deliver invitation letters for
      albescent — "glimpsed" or "unlocked": stamp that state on the account
                  (raises the level to the era's floor for it if lower)

    `faction` deliberately bypasses the join gate rather than replaying it.
    Players start unaffiliated and most factions are invite-gated
    (ADR-0030), so there is no real flow that puts a test character in all
    seven — and the contrast sweep (#651) needs exactly that. This is the
    same dev-only seam as `key`/`name`/`level`, behind the same production
    guard; it is not a second enabler.

    Returns account_id + character_id so tests can invite/credit by id.
    """
    if not settings.is_development:
        raise HTTPException(status_code=404, detail="Not found.")

    provider_user_id = "dev-user-1" if key == "1" else f"dev-{key}"
    email = "dev@localhost" if key == "1" else f"dev-{key}@localhost"

    account = await create_or_get_account(
        provider=AuthProvider.DEV,
        provider_user_id=provider_user_id,
        email=email,
        # Dev-only seam; no provider to ask.
        email_verified=True,
        session=session,
    )

    character = await resolve_active_character(account, session)
    if character is None and name is not None:
        result = await create_character(
            account.id, CharacterCreate(display_name=name), session
        )
        character = result.character

    invited_slugs = [slug for slug in (invited or "").split(",") if slug]
    if character is None and (faction is not None or invited_slugs or albescent):
        raise HTTPException(
            status_code=400,
            detail="faction, invited and albescent need a character — pass name=.",
        )

    if faction is not None:
        if faction not in CURRENT_ERA.factions:
            raise HTTPException(
                status_code=400, detail=f"Unknown faction slug: {faction}"
            )
        character.faction_slug = faction
        await session.flush()

    for slug in invited_slugs:
        if slug not in CURRENT_ERA.factions:
            raise_coded(
                400, ErrorCode.faction_not_found, f"Unknown faction slug: {slug}"
            )
    level = albescent_floor(albescent, level)

    if character is not None and level > 0:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character.id, era_row.id)
        thresholds = CURRENT_ERA.level_thresholds
        stats.level = level
        record_level_reached(character, level)
        stats.score = thresholds[level] if level < len(thresholds) else thresholds[-1]
        stats.all_time_score = max(stats.all_time_score, stats.score)
        await session.flush()

    if character is not None and (invited_slugs or albescent):
        era_row = await get_current_era_row(session)
        await apply_dev_fixture(
            character, era_row.id, level, session,
            invited=invited_slugs, albescent=albescent,
        )

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
