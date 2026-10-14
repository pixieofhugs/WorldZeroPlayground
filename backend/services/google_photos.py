"""Google Photos as a proof source (#559): online access, nothing durable stored.

The player is present for every pick, so this is Google's *online access* case.
Authorising yields a short-lived access token (no ``access_type=offline``, so no
refresh token). Google's consent screen shows on the first grant only.

WHERE THE TOKEN SITS. In this process's memory (``_GRANTS``), keyed by account
id, for at most :data:`_GRANT_SECONDS`. Not the Starlette session (signed but
readable by the browser), not the database (durable — #1374). It is dropped
when the ingest finishes, when the pick is abandoned (``DELETE`` the session),
or by expiry on the next touch. It never appears in a response or a log line.
ponytail: per-process memory — correct for the single uvicorn worker
``start.sh`` runs; a second worker/replica would need a shared store.
"""

import base64
import io
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlencode, urlsplit

import httpx
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import Headers

from config import settings
from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.account import AuthProvider, OAuthProvider
from models.praxis import Praxis
from schemas.google_photos import (
    PickerPollOut,
    PickerPollState,
    PickerSessionStartOut,
    PickerStartStatus,
)
from schemas.praxis import MediaUploadResultOut
from services.media import MEDIA_MAX_BYTES
from services.praxis import add_media_batch

logger = logging.getLogger(__name__)

PHOTOS_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_PICKER_URL = "https://photospicker.googleapis.com/v1"
_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
#: Bytes are served from here; the bearer token is never sent anywhere else.
_MEDIA_HOST_SUFFIX = ".googleusercontent.com"
#: Upper bound on one pick, asked of Google and enforced again on our side.
MAX_PICKED_ITEMS = 10
_GRANT_SECONDS = 50 * 60  # Google's token lives an hour; keep a margin.
_CHUNK_BYTES = 64 * 1024


@dataclass
class _Grant:
    access_token: str
    expires_at: float
    session_ids: set[str] = field(default_factory=set)


_GRANTS: dict[int, _Grant] = {}


def _http_client() -> httpx.AsyncClient:
    """The one HTTP seam to Google; tests swap it for a ``MockTransport``."""
    return httpx.AsyncClient(timeout=20, follow_redirects=False)


def redirect_uri() -> str:
    """The photos callback, beside the login one (``.../google/callback``)."""
    base = settings.GOOGLE_REDIRECT_URI.removesuffix("/callback")
    return f"{base}/photos/callback"


def _grant_for(account_id: int) -> Optional[_Grant]:
    now = time.monotonic()
    for stale in [key for key, grant in _GRANTS.items() if grant.expires_at <= now]:
        del _GRANTS[stale]
    return _GRANTS.get(account_id)


def forget_grant(account_id: int) -> None:
    _GRANTS.pop(account_id, None)


async def require_google_account(account_id: int, session: AsyncSession) -> str:
    """The Account's Google ``provider_user_id``, or a 403. The real guard."""
    provider_user_id = await session.scalar(
        select(OAuthProvider.provider_user_id).where(
            OAuthProvider.account_id == account_id,
            OAuthProvider.provider == AuthProvider.GOOGLE,
        )
    )
    if provider_user_id is None:
        raise_coded(
            403,
            ErrorCode.google_photos_unavailable,
            "Google Photos needs a Google sign-in.",
        )
    return provider_user_id


def authorize_url(state: str, google_user_id: str) -> str:
    query = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri(),
            "response_type": "code",
            "scope": f"openid {PHOTOS_SCOPE}",
            "state": state,
            "login_hint": google_user_id,
        }
    )
    return f"{_AUTHORIZE_URL}?{query}"


def _failed(message: str = "Google Photos didn't answer.") -> None:
    raise_coded(502, ErrorCode.google_photos_failed, message)


def _id_token_claims(id_token: str) -> dict:
    # Read straight off the token endpoint over TLS, so the signature is not
    # re-checked (OIDC Core 3.1.3.7); iss/aud are.
    try:
        payload = id_token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except (IndexError, ValueError):
        _failed()


async def complete_authorization(
    account_id: int, google_user_id: str, code: str
) -> None:
    """Swap ``code`` for a token, check it is this Account's Google, hold it."""
    async with _http_client() as client:
        response = await client.post(
            _TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri(),
                "grant_type": "authorization_code",
            },
        )
    if response.status_code != 200:
        _failed()
    body = response.json()
    claims = _id_token_claims(body.get("id_token", ""))
    if (
        claims.get("sub") != google_user_id
        or claims.get("aud") != settings.GOOGLE_CLIENT_ID
        or claims.get("iss") not in _ISSUERS
    ):
        # Someone else's Google (or a foreign token): never attach it.
        raise_coded(
            403,
            ErrorCode.google_photos_unavailable,
            "That Google account is not the one you signed in with.",
        )
    lifetime = min(float(body.get("expires_in", _GRANT_SECONDS)), _GRANT_SECONDS)
    _GRANTS[account_id] = _Grant(body["access_token"], time.monotonic() + lifetime)


def _bearer(grant: _Grant) -> dict[str, str]:
    return {"Authorization": f"Bearer {grant.access_token}"}


def _seconds(duration: str, default: float) -> float:
    try:
        return float(duration.rstrip("s"))
    except (AttributeError, ValueError):
        return default


async def start_picker_session(account_id: int) -> PickerSessionStartOut:
    grant = _grant_for(account_id)
    if grant is None:
        return PickerSessionStartOut(status=PickerStartStatus.authorization_needed)
    async with _http_client() as client:
        response = await client.post(
            f"{_PICKER_URL}/sessions",
            headers=_bearer(grant),
            json={"pickingConfig": {"maxItemCount": str(MAX_PICKED_ITEMS)}},
        )
    if response.status_code in (401, 403):
        # Token revoked or expired early: authorise again.
        forget_grant(account_id)
        return PickerSessionStartOut(status=PickerStartStatus.authorization_needed)
    if response.status_code != 200:
        _failed()
    body = response.json()
    grant.session_ids.add(body["id"])
    return PickerSessionStartOut(
        status=PickerStartStatus.ready,
        session_id=body["id"],
        # `/autoclose` makes Google close the picker tab when the pick is done.
        picker_uri=body["pickerUri"].rstrip("/") + "/autoclose",
        poll_interval_seconds=_seconds(
            body.get("pollingConfig", {}).get("pollInterval", ""), 5.0
        ),
    )


def _owned_grant(account_id: int, session_id: str) -> _Grant:
    grant = _grant_for(account_id)
    if grant is None or session_id not in grant.session_ids:
        raise_coded(
            404,
            ErrorCode.google_photos_session_invalid,
            "That Google Photos pick is no longer open.",
        )
    return grant


async def poll_picker_session(account_id: int, session_id: str) -> PickerPollOut:
    grant = _owned_grant(account_id, session_id)
    async with _http_client() as client:
        response = await client.get(
            f"{_PICKER_URL}/sessions/{session_id}", headers=_bearer(grant)
        )
    if response.status_code in (404, 401, 403):
        return PickerPollOut(state=PickerPollState.expired)
    if response.status_code != 200:
        _failed()
    picked = response.json().get("mediaItemsSet") is True
    return PickerPollOut(
        state=PickerPollState.picked if picked else PickerPollState.waiting
    )


async def abandon_picker_session(account_id: int, session_id: str) -> None:
    """Delete the Google session and forget the token. Best effort on Google."""
    grant = _grant_for(account_id)
    if grant is not None and session_id in grant.session_ids:
        try:
            async with _http_client() as client:
                await client.delete(
                    f"{_PICKER_URL}/sessions/{session_id}", headers=_bearer(grant)
                )
        except httpx.HTTPError:
            logger.warning("Google Photos session delete failed")
    forget_grant(account_id)


def _is_google_media_url(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or ""
    return parts.scheme == "https" and host.endswith(_MEDIA_HOST_SUFFIX)


async def _list_items(
    client: httpx.AsyncClient, grant: _Grant, session_id: str
) -> list[dict]:
    response = await client.get(
        f"{_PICKER_URL}/mediaItems",
        params={"sessionId": session_id, "pageSize": MAX_PICKED_ITEMS},
        headers=_bearer(grant),
    )
    if response.status_code != 200:
        _failed()
    return response.json().get("mediaItems", [])[:MAX_PICKED_ITEMS]


async def _download(client: httpx.AsyncClient, grant: _Grant, item: dict) -> bytes:
    """One item's bytes. Raises ``ValueError`` (message = why) for this item only."""
    media_file = item.get("mediaFile") or {}
    base_url = media_file.get("baseUrl", "")
    if not _is_google_media_url(base_url):
        raise ValueError("Google sent an unexpected download address.")
    suffix = "=dv" if item.get("type") == "VIDEO" else "=d"
    async with client.stream(
        "GET", base_url + suffix, headers=_bearer(grant)
    ) as response:
        if response.status_code != 200:
            raise ValueError("Google would not hand over this file.")
        declared = response.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > MEDIA_MAX_BYTES:
            raise ValueError("File too large.")
        # The cap bites while reading, so a missing/lying Content-Length
        # cannot make us buffer more than the media limit.
        buffer = bytearray()
        async for chunk in response.aiter_bytes(_CHUNK_BYTES):
            buffer.extend(chunk)
            if len(buffer) > MEDIA_MAX_BYTES:
                raise ValueError("File too large.")
    return bytes(buffer)


async def ingest_picked_media(
    praxis: Praxis,
    character_id: int,
    account_id: int,
    session_id: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> list[MediaUploadResultOut]:
    """Fetch the session's picked items onto ``praxis`` via the unchanged pipeline.

    Same contract as ``add_media_batch`` (which does the saving, so the size
    limits, type allow-list and pending-publish reset are the multipart route's
    own): one result per picked item, in picked order. The Google session and
    the token are dropped whatever happens.
    """
    grant = _owned_grant(account_id, session_id)
    try:
        async with _http_client() as client:
            items = await _list_items(client, grant, session_id)
            fetched: list[tuple[str, Optional[UploadFile], Optional[str]]] = []
            for item in items:
                media_file = item.get("mediaFile") or {}
                filename = media_file.get("filename") or "google-photo"
                try:
                    data = await _download(client, grant, item)
                except (ValueError, httpx.HTTPError) as problem:
                    fetched.append((filename, None, str(problem)))
                    continue
                upload = UploadFile(
                    file=io.BytesIO(data),
                    size=len(data),
                    filename=filename,
                    headers=Headers({"content-type": media_file.get("mimeType", "")}),
                )
                fetched.append((filename, upload, None))

        saved = iter(
            await add_media_batch(
                praxis=praxis,
                uploads=[upload for _, upload, _ in fetched if upload is not None],
                character_id=character_id,
                session=session,
                era=era,
            )
        )
        return [
            next(saved)
            if upload is not None
            else MediaUploadResultOut(filename=name, error=problem, status_code=502)
            for name, upload, problem in fetched
        ]
    finally:
        await abandon_picker_session(account_id, session_id)
