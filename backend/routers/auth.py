from datetime import date
from typing import Optional

# `MismatchingStateError` is not re-exported by `starlette_client`, which
# publishes only `OAuthError` — hence the one level down for it.
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
from services.character import create_character, resolve_active_character
from services.current_user import build_current_user
from services.era import get_current_era_row, get_or_create_stats

router = APIRouter()

_OAUTH = OAuth()
_OAUTH.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
# Discord's endpoints are named explicitly rather than discovered. It does serve
# `/.well-known/openid-configuration`, with a live RS256 JWKS — but `openid`,
# `oidc` and `id_token` appear nowhere in its published OAuth2 or User docs and
# `openid` is not in its scopes table. That is a surface it has made no
# commitment to keep, and building the sign-in on it means the day it goes away
# is the day nobody can log in.
#
# THE TRAILING SLASH ON `api_base_url` IS LOAD-BEARING. authlib resolves a
# relative request path with `urljoin`, which discards the last segment of a
# base that does not end in one: without it, `users/@me` resolves against
# `https://discord.com/api/` — Discord's unversioned default, which is the
# deprecated v6 — instead of v10. Nothing catches this. The stub in
# `tests/integration/test_account_linking.py` sees the relative path and never
# performs the join, and production would answer 200 from the wrong API version.
#
# `name` stays a bare string, as `"google"` above does (#1771): it is authlib's
# registry key, read back as the attribute `_OAUTH.discord`, not a value written
# to a column. `AuthProvider.DISCORD` would work here — `StrEnum` puts `str`
# ahead of `Enum` in its MRO, so `str.__hash__` wins and the registry lookup
# matches — but it would make two adjacent registrations of the same kind read
# differently for no gain. The value that IS a column value is passed to
# `create_or_get_account` below, from the enum.
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
    """Put the JWT on `response`. The one place the session cookie's flags live.

    Extracted when the second provider arrived (#1772) so the cookie flags are
    stated once, and split from the redirect in #2162 when a second *shape* of
    successful sign-in appeared — the returning player's confirm answers with a
    JSON body, not a 302, and must not become a second copy of this block. Every
    kwarg below is a security decision with a reason recorded against it, and
    any handler that copies them is another place for one to be quietly dropped
    — the failure mode being a session cookie that ships without `Secure`, which
    nothing in the test suite would notice. Not shared with `dev_login`: that
    seam deliberately sets different flags.
    """
    response.set_cookie(
        key="access_token",
        value=create_jwt(account_id),
        httponly=True,
        samesite="lax",
        # Fail closed: Secure unless we KNOW this is local development.
        secure=not settings.is_development,
        max_age=_COOKIE_MAX_AGE,
        # `or None`: an unset COOKIE_DOMAIN arrives as "" from a .env line with
        # no value, and "" is not None — Starlette would emit a bare `Domain=`.
        domain=settings.COOKIE_DOMAIN or None,
    )


def _signed_in_redirect(account_id: int) -> Response:
    """Turn a resolved Account into a session: JWT cookie, then home."""
    response = Response(status_code=302, headers={"location": settings.FRONTEND_URL})
    _set_session_cookie(response, account_id)
    return response


#: Where a refused sign-in puts its :class:`ErrorCode` — the query param
#: ``frontend/src/pages/Home.tsx`` already inspects for ``?login=required``
#: (``auth/ProtectedRoute.tsx`` is what sends that one). One param, both
#: meanings: ``required`` is prose the page owns, anything else is a code the
#: ``errors.json`` catalog owns. They cannot collide — code values are
#: SCREAMING_SNAKE.
_LOGIN_PARAM = "login"

#: What a callback carries home when the PROVIDER ended the sign-in rather than
#: one of our own gates — a declined consent screen, or a ``state`` authlib no
#: longer recognises. Built with the blessed constructor rather than reached for
#: as a bare ``ErrorCode`` value so this code has a construction site like every
#: other member, which is what ``tests/unit/test_errors.py`` checks: a code
#: nothing builds is a name a client waits forever for. Never raised — a
#: callback cannot answer with a body at all (see below) — so it is built once,
#: here, and only ever read for its code.
_PROVIDER_ENDED_IT = coded_error(
    403, ErrorCode.oauth_failed, "That sign-in did not complete."
)

#: What a callback carries home when the sign-in went STALE rather than being
#: refused (#1756) — the player started it, wandered off, and came back after
#: the session cookie holding the OAuth `state` had expired. Ten minutes since
#: #1755, which is what turns this from a fourteen-day theoretical into the
#: ordinary outcome of getting distracted. Built, never raised, exactly as
#: `_PROVIDER_ENDED_IT` above is.
_STATE_WENT_STALE = coded_error(
    403, ErrorCode.oauth_state_expired, "That sign-in expired before it finished."
)


def _sign_in_failed_redirect(exc: Exception) -> Response:
    """The failure counterpart to :func:`_signed_in_redirect` (#1773).

    An OAuth callback is a top-level browser NAVIGATION, not an XHR. Raising
    from one therefore never reaches `frontend/src/api/client.ts` — FastAPI
    renders the coded detail as JSON and the player is left staring at
    ``{"detail":{"code":"OAUTH_EMAIL_UNVERIFIED",…}}`` at a URL with no way
    back. So both legs answer a terminal failure the way they answer success:
    a 302 to the frontend. No cookie — the sign-in did not happen.

    Three cases reach here, and none is a bug:

    * :class:`HTTPException` — our own gates. The Discord leg's missing-email
      refusal below, and, on **both** legs, ``create_or_get_account``'s
      unverified-email gate (ADR-0075, #1771). Its code rides along in the
      coded detail, so the catalog can say something specific.
    * :class:`MismatchingStateError` — the sign-in went stale: the ``state``
      came back after the session cookie carrying it had expired. Split from
      the case below in #1756 because it is the only one the player did not
      CHOOSE, and the only one where "try again" is real advice.
    * :class:`OAuthError` — the provider ended it, in practice a declined
      consent screen. Carries no detail of ours, so it borrows
      :data:`_PROVIDER_ENDED_IT`'s.

    Anything else still 500s, which is right: an unhandled error is a defect,
    not a rejection, and dressing it as "try another provider" would hide it.

    The dispatch below is ORDERED, and the order is the whole point:
    ``MismatchingStateError`` SUBCLASSES ``OAuthError`` (its MRO is
    ``MismatchingStateError -> OAuthError -> AuthlibBaseError``), so testing the
    general case first would swallow the specific one and every expired sign-in
    would read "something went wrong". Stated once here rather than as a pair of
    ``except`` arms in each callback, so there is one place to get it right
    instead of one per provider — the same argument :func:`_signed_in_redirect`
    makes about its cookie flags.
    """
    if isinstance(exc, HTTPException):
        detail = exc.detail
    elif isinstance(exc, MismatchingStateError):
        detail = _STATE_WENT_STALE.detail
    else:
        detail = _PROVIDER_ENDED_IT.detail
    # The `or` is belt-and-braces: every HTTPException that reaches here today
    # went through `raise_coded`, but an uncoded one must not redirect to
    # `?login=None`.
    code = detail_code(detail) or ErrorCode.oauth_failed.value
    return Response(
        status_code=302,
        headers={"location": f"{settings.FRONTEND_URL}?{_LOGIN_PARAM}={code}"},
    )


#: The frontend route that renders the consent gate (#2162) — a path over
#: there, not a route in here. Under `/start` because it *is* the onboarding
#: arc, entered by someone who has walked it before: confirming leads straight
#: into the rest of it.
_RETURNING_PLAYER_PATH = "/start/again"

#: Where an interrupted sign-in waits for its answer, in `request.session`.
#:
#: THE STARLETTE SESSION, and not a cookie of our own. It already exists (Authlib
#: needs it for the OAuth `state`), it is already signed with `SECRET_KEY`, it
#: already carries the flags `main.py` argues for one by one, and its
#: server-enforced `max_age=600` is exactly the window a consent gate wants —
#: ten minutes, then the question lapses and the player starts again. A
#: purpose-built token would have been a second set of cookie flags to get
#: right and a second expiry to keep honest.
#:
#: `main.py` used to justify that ten minutes with "nothing in `backend/` reads
#: `request.session` except authlib". This is the second reader, and it wants
#: the same number for its own reasons — see the note there.
_PENDING_SIGNUP_KEY = "pending_returning_signup"


def _returning_player_redirect(
    request: Request, pending: ReturningPlayerConsentRequired
) -> Response:
    """Park the interrupted sign-in and send the browser to the gate (#2162).

    **No session cookie.** That is the whole shape of this: the player is asked
    before they are signed in, because the question is whether they want to be.
    The identity rides in the signed session rather than the URL — a deletion
    date and a provider id in a query string would be written to browser
    history, and to any referrer the gate page happens to emit.
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
    """The interrupted sign-in this request is answering for, or a 404.

    Both gate routes start here, and both refuse the same way: a gate with
    nothing behind it is not a failed sign-in, it is *no* sign-in — reached by
    typing the URL, or by coming back to the tab after the ten minutes lapsed.
    The frontend's move either way is to send them to `/start` to begin one.
    """
    pending = request.session.get(_PENDING_SIGNUP_KEY)
    if not isinstance(pending, dict):
        raise_coded(
            404,
            ErrorCode.returning_player_consent_expired,
            "That sign-in is no longer waiting on an answer.",
        )
    return pending


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

    Redirects to ``settings.FRONTEND_URL`` carrying the session cookie — or,
    for any terminal failure, to the same place carrying an error code instead
    of a session. See :func:`_sign_in_failed_redirect` for why a raise here
    cannot be left to FastAPI.
    """
    try:
        token = await _OAUTH.google.authorize_access_token(request)
        user_info = token.get("userinfo") or await _OAUTH.google.userinfo(token=token)

        # Google's access token is used here and then discarded (#1374): it
        # proves this sign-in, and nothing afterwards calls a Google API as the
        # player. The session that follows is World Zero's own JWT.
        #
        # `email_verified` is forwarded, not enforced here (#1771): it only
        # matters on the branch that resolves an account *by email*, and the
        # service owns that branch. Gating here would also have rejected a
        # returning player whose provider says "unverified" while an address
        # change is in flight — someone their `sub` already identifies. The
        # claim is normalised to a real bool at the edge because a provider may
        # answer with anything at all.
        account = await create_or_get_account(
            provider=AuthProvider.GOOGLE,
            provider_user_id=user_info["sub"],
            email=user_info["email"],
            email_verified=user_info.get("email_verified") is True,
            session=session,
        )
    except ReturningPlayerConsentRequired as pending:
        # NOT a failure, so not the arm below: the sign-in is paused for one
        # question rather than refused (#2162).
        return _returning_player_redirect(request, pending)
    except (HTTPException, OAuthError) as exc:
        return _sign_in_failed_redirect(exc)

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
    session: AsyncSession = Depends(get_db),
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

        # Google's profile rides along on the token; Discord's cannot. Discord
        # returns no `id_token` on its documented path, so authlib's
        # `if "id_token" in token` gate never fires and `token["userinfo"]`
        # stays None — the profile has to be fetched. The path is relative on
        # purpose; see the trailing-slash argument at the registration above.
        resp = await _OAUTH.discord.get("users/@me", token=token)
        user_info = resp.json()

        # The token is used here and discarded (#1374, same posture as Google).
        # Discord also issues a refresh token and a multi-day access token, and
        # nothing downstream wants either: World Zero authenticates every
        # request with its own JWT and never calls Discord as the player.
        # Storing a live third-party credential no code path reads is pure
        # liability.
        email = user_info.get("email")
        if not email:
            # `email` is BOTH optional and nullable on Discord's user object,
            # and its `email` scope returns an address only "if the user has
            # one" — so an absent key and an explicit null are both real
            # answers, and `not` covers them together. This check is the
            # callback's rather than the service's because
            # `create_or_get_account` takes `email: str`, and widening that to
            # Optional to move the check would weaken the contract for every
            # caller. Unlike the verified flag it is also NOT placed behind the
            # returning-identity early return: a `verified: false` window is a
            # documented, transient Discord state (changing your email re-sends
            # the mail), whereas an email vanishing from an account is not a
            # transition Discord describes at all.
            #
            # Still a `raise` rather than a direct redirect: the code and its
            # prose belong at the refusal, and the `except` below is the single
            # place that knows a callback cannot answer with a body.
            raise_coded(
                403,
                ErrorCode.oauth_email_unverified,
                "Discord did not return an email address for that account.",
            )

        account = await create_or_get_account(
            provider=AuthProvider.DISCORD,
            # Discord's `id` — a snowflake, always serialised as a JSON string
            # so clients cannot overflow it at 64 bits. `username` and `email`
            # are both mutable and `id` is not in the `PATCH /users/@me`
            # surface, so this is the only field worth keying on.
            provider_user_id=user_info["id"],
            email=email,
            # Forwarded, not enforced here: `verified` is the provider's claim
            # about the ADDRESS (account-trust lives in the separate `flags`
            # bitfield), and it only decides anything on the branch that
            # resolves an Account by email — which the service owns (#1771,
            # ADR-0075). The field is optional, so normalise to a real bool at
            # the edge.
            email_verified=user_info.get("verified") is True,
            session=session,
        )
    except ReturningPlayerConsentRequired as pending:
        # NOT a failure, so not the arm below: the sign-in is paused for one
        # question rather than refused (#2162).
        return _returning_player_redirect(request, pending)
    except (HTTPException, OAuthError) as exc:
        return _sign_in_failed_redirect(exc)

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
    session: AsyncSession = Depends(get_db),
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

    # Consent given, so the digest has done the only job it was kept for. Not
    # left to expire on its own: it is a thing we store about a person, and the
    # ninety days are a ceiling, not a target.
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
        secure=not settings.is_development,
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
    if not settings.is_development:
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
