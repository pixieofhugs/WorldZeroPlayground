"""Google Photos as a proof source (#559).

Seam: the HTTP routes, with Google mocked at the HTTP boundary
(``services.google_photos._http_client`` -> ``httpx.MockTransport``). The real
consent -> pick -> ingest path cannot run in CI; the owner checks it on dev.
"""

import base64
import io
import json
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import AuthProvider, OAuthProvider
from models.character import Character
from models.task import Task
from services import google_photos
from services import media as media_service

GOOGLE_SUB = "google-sub-1"
TOKEN = "ya29.secret-access-token"


def _jpeg() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (1, 2, 3)).save(buffer, format="JPEG")
    return buffer.getvalue()


def _id_token(sub: str) -> str:
    claims = {
        "sub": sub,
        "aud": settings.GOOGLE_CLIENT_ID,
        "iss": "https://accounts.google.com",
    }
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"x.{payload}.y"


class FakeGoogle:
    def __init__(self) -> None:
        self.calls: list[httpx.Request] = []
        self.sub = GOOGLE_SUB
        self.picked = True
        self.media_url = "https://lh3.googleusercontent.com/abc"
        self.body = _jpeg()

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request)
        url = str(request.url)
        if url.startswith("https://oauth2.googleapis.com/token"):
            return httpx.Response(
                200,
                json={
                    "access_token": TOKEN,
                    "expires_in": 3599,
                    "id_token": _id_token(self.sub),
                },
            )
        if request.method == "POST" and url.endswith("/v1/sessions"):
            return httpx.Response(
                200,
                json={
                    "id": "sess-1",
                    "pickerUri": "https://photos.google.com/picker/xyz",
                    "pollingConfig": {"pollInterval": "3s", "timeoutIn": "600s"},
                },
            )
        if request.method == "GET" and url.endswith("/v1/sessions/sess-1"):
            return httpx.Response(200, json={"mediaItemsSet": self.picked})
        if request.method == "DELETE":
            return httpx.Response(200, json={})
        if "/v1/mediaItems" in url:
            return httpx.Response(
                200,
                json={
                    "mediaItems": [
                        {
                            "id": "m1",
                            "type": "PHOTO",
                            "mediaFile": {
                                "baseUrl": self.media_url,
                                "mimeType": "image/jpeg",
                                "filename": "holiday.jpg",
                            },
                        }
                    ]
                },
            )
        if url.startswith(self.media_url):
            return httpx.Response(200, content=self.body)
        return httpx.Response(500)


@pytest.fixture
def google(monkeypatch, tmp_path) -> FakeGoogle:
    fake = FakeGoogle()
    monkeypatch.setattr(
        google_photos,
        "_http_client",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(fake)),
    )
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(
        settings, "GOOGLE_REDIRECT_URI", "http://test/auth/google/callback"
    )
    google_photos._GRANTS.clear()
    yield fake
    google_photos._GRANTS.clear()


@pytest.fixture
async def google_character(db_session: AsyncSession, character: Character) -> Character:
    db_session.add(
        OAuthProvider(
            account_id=character.account_id,
            provider=AuthProvider.GOOGLE,
            provider_user_id=GOOGLE_SUB,
        )
    )
    await db_session.commit()
    return character


async def _authorise(client: AsyncClient, headers: dict) -> None:
    start = await client.get("/auth/google/photos/authorize", headers=headers)
    assert start.status_code == 302
    query = parse_qs(urlsplit(start.headers["location"]).query)
    assert query["scope"] == [f"openid {google_photos.PHOTOS_SCOPE}"]
    assert query["login_hint"] == [GOOGLE_SUB]
    assert "access_type" not in query and "prompt" not in query
    back = await client.get(
        "/auth/google/photos/callback",
        params={"code": "c", "state": query["state"][0]},
        headers=headers,
    )
    assert '"status": "ok"' in back.text


async def _praxis_id(client: AsyncClient, task: Task, headers: dict) -> int:
    response = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "G", "body_text": "proof"},
        headers=headers,
    )
    return response.json()["id"]


@pytest.mark.asyncio
async def test_non_google_account_is_refused(client, character, auth_headers, google):
    for method, path in [
        ("get", "/auth/google/photos/authorize"),
        ("post", "/auth/google/photos/sessions"),
    ]:
        response = await getattr(client, method)(path, headers=auth_headers)
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "GOOGLE_PHOTOS_UNAVAILABLE"


@pytest.mark.asyncio
async def test_session_needs_authorisation_first(
    client, google_character, auth_headers, google
):
    response = await client.post("/auth/google/photos/sessions", headers=auth_headers)
    assert response.json()["status"] == "authorization_needed"
    assert response.json()["session_id"] is None


@pytest.mark.asyncio
async def test_callback_refuses_a_forged_state(
    client, google_character, auth_headers, google
):
    await client.get("/auth/google/photos/authorize", headers=auth_headers)
    back = await client.get(
        "/auth/google/photos/callback",
        params={"code": "c", "state": "forged"},
        headers=auth_headers,
    )
    assert '"status": "failed"' in back.text
    assert not google_photos._GRANTS
    assert not google.calls


@pytest.mark.asyncio
async def test_callback_refuses_someone_elses_google(
    client, google_character, auth_headers, google
):
    google.sub = "someone-else"
    start = await client.get("/auth/google/photos/authorize", headers=auth_headers)
    state = parse_qs(urlsplit(start.headers["location"]).query)["state"][0]
    back = await client.get(
        "/auth/google/photos/callback",
        params={"code": "c", "state": state},
        headers=auth_headers,
    )
    assert '"status": "failed"' in back.text
    assert not google_photos._GRANTS


@pytest.mark.asyncio
async def test_pick_poll_ingest_then_token_is_gone(
    client, google_character, active_task, auth_headers, google
):
    await _authorise(client, auth_headers)
    started = (
        await client.post("/auth/google/photos/sessions", headers=auth_headers)
    ).json()
    assert started == {
        "status": "ready",
        "session_id": "sess-1",
        "picker_uri": "https://photos.google.com/picker/xyz/autoclose",
        "poll_interval_seconds": 3.0,
    }
    polled = await client.get(
        "/auth/google/photos/sessions/sess-1", headers=auth_headers
    )
    assert polled.json() == {"state": "picked"}

    praxis_id = await _praxis_id(client, active_task, auth_headers)
    response = await client.post(
        f"/praxes/{praxis_id}/media/google-photos",
        json={"session_id": "sess-1"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    [entry] = response.json()
    assert entry["filename"] == "holiday.jpg"
    assert entry["media_item"]["praxis_id"] == praxis_id
    assert TOKEN not in response.text

    # The Google session was deleted and the token dropped.
    assert any(call.method == "DELETE" for call in google.calls)
    assert not google_photos._GRANTS
    again = await client.post("/auth/google/photos/sessions", headers=auth_headers)
    assert again.json()["status"] == "authorization_needed"


@pytest.mark.asyncio
async def test_unknown_session_is_refused(
    client, google_character, active_task, auth_headers, google
):
    await _authorise(client, auth_headers)
    praxis_id = await _praxis_id(client, active_task, auth_headers)
    response = await client.post(
        f"/praxes/{praxis_id}/media/google-photos",
        json={"session_id": "not-mine"},
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "GOOGLE_PHOTOS_SESSION_INVALID"


@pytest.mark.asyncio
async def test_foreign_host_is_never_fetched_and_never_gets_the_token(
    client, google_character, active_task, auth_headers, google
):
    google.media_url = "https://evil.example.com/steal"
    await _authorise(client, auth_headers)
    await client.post("/auth/google/photos/sessions", headers=auth_headers)
    praxis_id = await _praxis_id(client, active_task, auth_headers)
    response = await client.post(
        f"/praxes/{praxis_id}/media/google-photos",
        json={"session_id": "sess-1"},
        headers=auth_headers,
    )
    [entry] = response.json()
    assert entry["media_item"] is None and entry["error"]
    assert not any(call.url.host == "evil.example.com" for call in google.calls)


@pytest.mark.asyncio
async def test_oversize_body_is_cut_off_before_it_is_buffered(
    client, google_character, active_task, auth_headers, google, monkeypatch
):
    monkeypatch.setattr(google_photos, "MEDIA_MAX_BYTES", 10)
    await _authorise(client, auth_headers)
    await client.post("/auth/google/photos/sessions", headers=auth_headers)
    praxis_id = await _praxis_id(client, active_task, auth_headers)
    response = await client.post(
        f"/praxes/{praxis_id}/media/google-photos",
        json={"session_id": "sess-1"},
        headers=auth_headers,
    )
    [entry] = response.json()
    assert entry["media_item"] is None and "large" in entry["error"]


@pytest.mark.asyncio
async def test_abandon_deletes_session_and_token(
    client, google_character, auth_headers, google
):
    await _authorise(client, auth_headers)
    await client.post("/auth/google/photos/sessions", headers=auth_headers)
    response = await client.delete(
        "/auth/google/photos/sessions/sess-1", headers=auth_headers
    )
    assert response.status_code == 204
    assert not google_photos._GRANTS
    assert any(call.method == "DELETE" for call in google.calls)
