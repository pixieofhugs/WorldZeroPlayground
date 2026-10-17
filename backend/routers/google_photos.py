"""Google Photos as a proof source (#559). Logic lives in ``services/google_photos``."""

import hmac
import json
import secrets
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from models.account import Account
from schemas.google_photos import PickerPollOut, PickerSessionStartOut
from services import google_photos
from services.auth import get_current_account

router = APIRouter()

_STATE_KEY = "google_photos_state"
#: The `postMessage` payload `source`, so the page can ignore other messages.
MESSAGE_SOURCE = "wz-google-photos"


def _handback_page(succeeded: bool) -> HTMLResponse:
    """The popup's last page: tell the opener, close, or fall back to the site."""
    frontend = urlsplit(settings.FRONTEND_URL)
    origin = f"{frontend.scheme}://{frontend.netloc}"
    message = {"source": MESSAGE_SOURCE, "status": "ok" if succeeded else "failed"}
    script = (
        f"var m={json.dumps(message)},o={json.dumps(origin)};"
        "if(window.opener){window.opener.postMessage(m,o);window.close()}"
        f"else{{location.replace({json.dumps(settings.FRONTEND_URL)})}}"
    ).replace("<", "\\u003c")
    return HTMLResponse(
        f"<!doctype html><title>Google Photos</title><script>{script}</script>"
    )


@router.get("/authorize", response_class=RedirectResponse, status_code=302)
async def authorize(
    request: Request,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Popup entry: bind a `state` to this session, then on to Google's consent."""
    google_user_id = await google_photos.require_google_account(account.id, session)
    state = secrets.token_urlsafe(32)
    request.session[_STATE_KEY] = {"state": state, "account_id": account.id}
    return RedirectResponse(google_photos.authorize_url(state, google_user_id), 302)


@router.get("/callback", response_class=HTMLResponse)
async def callback(
    request: Request,
    code: str = "",
    state: str = "",
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Google returns here. Answers a page that hands control back to the opener."""
    pending = request.session.pop(_STATE_KEY, None)
    if (
        not isinstance(pending, dict)
        or not code
        or pending.get("account_id") != account.id
        or not hmac.compare_digest(
            str(pending.get("state", "")).encode(), state.encode()
        )
    ):
        return _handback_page(False)
    google_user_id = await google_photos.require_google_account(account.id, session)
    try:
        await google_photos.complete_authorization(account.id, google_user_id, code)
    except Exception:  # noqa: BLE001 - a navigation can't show JSON; any refusal fails the popup
        return _handback_page(False)
    return _handback_page(True)


@router.post("/sessions", response_model=PickerSessionStartOut)
async def start_session(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    await google_photos.require_google_account(account.id, session)
    return await google_photos.start_picker_session(account.id)


@router.get("/sessions/{session_id}", response_model=PickerPollOut)
async def poll_session(
    session_id: str,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    await google_photos.require_google_account(account.id, session)
    return await google_photos.poll_picker_session(account.id, session_id)


@router.delete("/sessions/{session_id}", status_code=204)
async def abandon_session(
    session_id: str,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Response:
    await google_photos.require_google_account(account.id, session)
    await google_photos.abandon_picker_session(account.id, session_id)
    return Response(status_code=204)
