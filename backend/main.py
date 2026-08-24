import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from starlette.middleware.sessions import SessionMiddleware

from config import settings
from db import engine
from routers import activity_feed, admin, auth, characters, duel, factions, game_config, leaderboard, praxes, relationships, tasks, votes
from routers import comments, contact, me, terms
from schemas.system import HealthOut
from services.praxis_room import (
    PRAXIS_ROOM_APP,
    PRAXIS_ROOM_SERVER,
    acquire_single_instance_lock,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure media directory exists and log diagnostic info
    media_path = settings.MEDIA_ROOT
    os.makedirs(media_path, exist_ok=True)
    file_count = sum(len(files) for _, _, files in os.walk(media_path))
    logger.info(
        "Media storage: MEDIA_ROOT=%s exists=%s file_count=%d",
        media_path,
        os.path.isdir(media_path),
        file_count,
    )

    # Praxis rooms hold their CRDT documents in this process, so exactly one
    # instance may run (ADR-0073). Claim that right before serving anything;
    # a second instance raises here and the deploy fails loudly.
    single_instance_lock = await acquire_single_instance_lock(engine)
    try:
        # The room server's task group has to outlive every socket it serves,
        # which means it belongs to the app's lifespan, not to a request.
        async with PRAXIS_ROOM_SERVER:
            yield
    finally:
        await single_instance_lock.close()


app = FastAPI(title="World Zero", version="1.0.0", lifespan=lifespan)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Turn a constraint violation into something a player can read.

    The ``else`` branch used to be ``detail = msg`` — the lower-cased driver
    exception, shipped verbatim to the browser. A "drop task" that tripped the
    praxis-delete bug answered with the asyncpg exception class, the statement,
    and the failing row's column values. That is unreadable *and* a disclosure:
    the message names tables, columns and stored data.

    Only the two recognised shapes get bespoke copy; everything else is a bug in
    us, not a mistake by the player, so it reads like one and the real exception
    goes to the log where it belongs.
    """
    msg = str(exc.orig).lower()
    if "username" in msg:
        detail = "That username is already taken. Please choose a different one."
    elif "unique" in msg or "duplicate" in msg:
        detail = "That value is already in use. Please try a different one."
    else:
        logger.exception(
            "Unhandled integrity error on %s %s", request.method, request.url.path
        )
        detail = "That didn't go through — something on our end refused it. Please try again."
    return JSONResponse(status_code=409, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again in a moment."},
    )


# Session middleware is required by Authlib for OAuth state management. This
# cookie holds nothing but the OAuth `state` for one round trip — and that makes
# it a live CSRF control, not a convenience (#1755). Every kwarg below is load-
# bearing; `tests/integration/test_session_cookie.py` pins all three.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    # Fail closed, exactly as the JWT cookie does (`routers/auth.py`). Without
    # `Secure` a network attacker can PLANT a session cookie over plain HTTP
    # that the browser then sends to the HTTPS site (RFC 6265bis §5.7 step 16,
    # §8.6) — the login-CSRF that binding `state` to the user agent exists to
    # prevent, and there is no HSTS here to make it theoretical. Gated rather
    # than unconditional because Safari refuses `Secure` on `http://localhost`
    # (WebKit bug 232088, still open): it drops the `Set-Cookie` at storage
    # time, so the callback carries no session and authlib raises "CSRF
    # Warning! State not equal in request and response" — an error that reads
    # as a bug in `state` handling rather than a cookie flag.
    https_only=not settings.is_development,
    # The only expiry OAuth state actually has. authlib stamps `exp = now +
    # 3600` into the stored value and never reads it back, so its hour is
    # decorative; the default this replaces is FOURTEEN DAYS of replayability
    # for an abandoned sign-in. Starlette feeds this to `TimestampSigner.
    # unsign()`, so it is server-enforced rather than a browser hint.
    #
    # `routers/auth.py` is the second reader since #2162 — it parks a returning
    # deleted player's interrupted sign-in here while the consent gate asks its
    # one question — and it wants this same number for its own reason: an
    # unanswered gate should lapse, not linger. So the ten minutes now has two
    # arguments behind it rather than one, and shortening it further would
    # start refusing people who read the sentence before clicking.
    max_age=600,
    # LOAD-BEARING — never "strict". The callback arrives via a cross-site 302
    # from the provider, so `Lax`'s carve-out for top-level safe-method
    # navigations is the only reason `state` comes back at all. OWASP's Session
    # Management Cheat Sheet recommends `Strict` for session cookies; following
    # it here breaks sign-in SILENTLY. Stated explicitly rather than left to
    # Starlette's default so the next hardening pass has to read this comment
    # before "correcting" it.
    same_site="lax",
)

# CORS — allow frontend origin; configured via env in production.
# The same list also guards the praxis room's WebSocket handshake, which this
# middleware does not cover (see ``Settings.CORS_ORIGINS``).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_content_type_options(request: Request, call_next):
    """Send ``X-Content-Type-Options: nosniff`` on everything.

    The mount below serves player-uploaded bytes from the API's own origin, and
    Starlette derives their ``Content-Type`` from the stored filename. Uploads
    now get a server-chosen extension off an allow-list
    (``services.media._with_safe_extension``), which is the actual fix; this is
    the second lock. Without it a browser is still free to disregard a declared
    ``image/jpeg`` and sniff HTML out of the bytes — and a script that runs here
    runs same-origin with the session cookie, which `.worldzero.org` scoping
    sends to every host under the domain.

    Applied app-wide rather than to the mount alone: nothing this API serves
    should ever be content-sniffed, and a header that covers one path is a
    header someone has to remember to extend.
    """
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response


# Player-uploaded media, served straight off the disk. The settled posture
# (#1593), recorded here so it is not re-opened by accident:
#
# * **Unauthenticated, and staying that way.** Avatars and praxis images are
#   published content on a public site; putting Python in front of every one of
#   them would tax every page load to constrain a handful of files.
# * **Unguessable, not secret.** Every upload gets a uuid directory segment
#   (#1336 for praxis media, #1565 for avatars), so a URL cannot be derived from
#   ids. It can still be *shared* — a leaked URL is permanently fetchable and
#   nothing here expires it. That is close to what publishing means, and it is
#   accepted for anything the site is currently showing.
# * **A hidden praxis is the exception.** ``models.praxis`` says ``hidden`` is
#   "off the site entirely", which was untrue of its pictures. Hiding now moves
#   the files to a sibling directory this mount cannot see, so the URL 404s
#   while the bytes survive for moderators; un-hiding moves them back. See
#   ``services.media.QUARANTINE_SUFFIX``. ``failed`` is NOT in that case — it
#   keeps its banner and its place in the feed, so it keeps its media too.
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT, check_dir=False), name="media")

# Praxis rooms — one WebSocket per open composer, at /rooms/praxis/{praxis_id}
# (ADR-0073). Not a FastAPI router: it is a raw ASGI app that speaks the Y
# protocol, so it carries no OpenAPI schema and no HTTP surface.
app.mount("/rooms", PRAXIS_ROOM_APP, name="praxis-rooms")

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(characters.router, prefix="/characters", tags=["characters"])
app.include_router(me.router, prefix="/me", tags=["me"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(praxes.router, prefix="/praxes", tags=["praxes"])
app.include_router(duel.router, prefix="/duels", tags=["duels"])
app.include_router(votes.router, tags=["votes"])  # prefix embedded in routes (/praxes/{id}/vote)
app.include_router(comments.router, tags=["comments"])  # prefix embedded (/praxes|tasks/{id}/comments)
app.include_router(relationships.router, prefix="/relationships", tags=["relationships"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(factions.router, prefix="/factions", tags=["factions"])
app.include_router(game_config.router, prefix="/game-config", tags=["game-config"])
app.include_router(contact.router, prefix="/contact", tags=["contact"])
app.include_router(activity_feed.router, prefix="/activity-feed", tags=["activity-feed"])
app.include_router(terms.router, prefix="/terms", tags=["terms"])


@app.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    return HealthOut(status="ok")
