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
from routers import activity_feed, admin, auth, characters, factions, game_config, leaderboard, messages, praxes, relationships, tasks, taunts, votes
from routers import contact

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
    yield


app = FastAPI(title="World Zero", version="1.0.0", lifespan=lifespan)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    msg = str(exc.orig).lower()
    if "username" in msg:
        detail = "That username is already taken. Please choose a different one."
    elif "unique" in msg or "duplicate" in msg:
        detail = "That value is already in use. Please try a different one."
    else:
        detail = msg
    return JSONResponse(status_code=409, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again in a moment."},
    )


# Session middleware is required by Authlib for OAuth state management
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# CORS — allow frontend origin; configured via env in production
_cors_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Static file serving for local media uploads
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT, check_dir=False), name="media")

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(characters.router, prefix="/characters", tags=["characters"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(praxes.router, prefix="/praxes", tags=["praxes"])
app.include_router(votes.router, tags=["votes"])  # prefix embedded in routes (/praxes/{id}/vote)
app.include_router(relationships.router, prefix="/relationships", tags=["relationships"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(factions.router, prefix="/factions", tags=["factions"])
app.include_router(game_config.router, prefix="/game-config", tags=["game-config"])
app.include_router(contact.router, prefix="/contact", tags=["contact"])
app.include_router(taunts.router, prefix="/taunts", tags=["taunts"])
app.include_router(activity_feed.router, prefix="/activity-feed", tags=["activity-feed"])


@app.get("/health")
async def health():
    return {"status": "ok"}
