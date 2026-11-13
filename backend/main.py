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
from db import engine, get_session_factory
from routers import activity_feed, admin, auth, characters, duel, factions, game_config, leaderboard, praxes, relationships, tasks, votes
from routers import comments, contact, copy, google_photos, me, terms
from schemas.system import HealthOut
from services.era import rebind_live_era
from services.praxis_room import (
    PRAXIS_ROOM_APP,
    PRAXIS_ROOM_SERVER,
    acquire_single_instance_lock,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    media_path = settings.MEDIA_ROOT
    os.makedirs(media_path, exist_ok=True)
    file_count = sum(len(files) for _, _, files in os.walk(media_path))
    logger.info(
        "Media storage: MEDIA_ROOT=%s exists=%s file_count=%d",
        media_path,
        os.path.isdir(media_path),
        file_count,
    )

    # Praxis rooms hold CRDT docs in-process: exactly one instance (ADR-0073).
    # A second instance raises here and the deploy fails loudly.
    single_instance_lock = await acquire_single_instance_lock(engine)

    try:
        # Live era is a DB fact (ADR-0091); sound process-wide only because one
        # worker runs. Inside the try so a DB down at boot still releases the lock.
        async with get_session_factory()() as session:
            await rebind_live_era(session)

        # The room server's task group must outlive every socket it serves.
        async with PRAXIS_ROOM_SERVER:
            yield
    finally:
        await single_instance_lock.close()


app = FastAPI(title="World Zero", version="1.0.0", lifespan=lifespan)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Turn a constraint violation into player-readable copy.

    Never echo the driver message: it discloses tables, columns and row data.
    Unrecognised shapes are our bug, so they go to the log.
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


# Holds only the OAuth `state` for one round trip: a live CSRF control (#1755).
# Every kwarg is load-bearing; `tests/integration/test_session_cookie.py` pins them.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    # Without `Secure` an attacker can plant a cookie over HTTP (login-CSRF;
    # RFC 6265bis §8.6, no HSTS here). Gated because Safari drops `Secure` on
    # http://localhost (WebKit 232088), surfacing as authlib "CSRF Warning!".
    https_only=not settings.is_development,
    # The only real expiry OAuth state has (authlib never checks its own exp;
    # default is 14 days). Server-enforced via TimestampSigner. Also bounds the
    # consent gate's parked sign-in (#2162); shorter refuses slow readers.
    max_age=600,
    # Never "strict": the callback is a cross-site 302, and only Lax lets
    # `state` come back. Strict (OWASP's advice) breaks sign-in silently.
    same_site="lax",
)

# The same list guards the praxis room WebSocket handshake (``Settings.CORS_ORIGINS``).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    # Cross-origin, so the `GET /me/export` filename header must be exposed.
    expose_headers=["Content-Disposition"],
)

@app.middleware("http")
async def add_content_type_options(request: Request, call_next):
    """Send ``nosniff`` app-wide.

    Second lock behind ``services.media._with_safe_extension``: uploads are served
    same-origin with the session cookie, so sniffed HTML would run as us.
    """
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response


# Settled posture (#1593): unauthenticated by design; URLs unguessable (uuid
# segment) but not secret. Hidden praxis media moves out of this mount
# (``services.media.QUARANTINE_SUFFIX``); ``failed`` keeps its media.
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT, check_dir=False), name="media")

# Raw ASGI Y-protocol app, one WebSocket per composer (ADR-0073); no OpenAPI.
app.mount("/rooms", PRAXIS_ROOM_APP, name="praxis-rooms")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(
    google_photos.router, prefix="/auth/google/photos", tags=["google-photos"]
)
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
app.include_router(copy.router, tags=["copy"])  # prefix embedded (/copy-overrides)


@app.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    return HealthOut(status="ok")
