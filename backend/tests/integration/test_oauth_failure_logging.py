"""A refused sign-in leaves one WARNING; a successful one leaves none (#3055).

Seam under test: ``routers/auth.py::_sign_in_failed_redirect`` — the single
helper both provider callbacks funnel every terminal failure through (#1773).
Logging there rather than per-callback means a third provider gets it free,
and it is the one place that already resolves the ``ErrorCode`` the redirect
carries, so the log line and the URL can never disagree.

Reuses the stub-client shapes from ``test_account_linking.py`` rather than
importing them — these stubs are one line each and importing private test
doubles across files is its own coupling.
"""
import logging

import pytest
from authlib.integrations.base_client import MismatchingStateError
from authlib.integrations.starlette_client import OAuthError
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode

_LOGGER_NAME = "routers.auth"


class _StubGoogleClient:
    """Stands in for ``_OAUTH.google``; the callback only calls this."""

    def __init__(self, userinfo: dict) -> None:
        self._userinfo = userinfo

    async def authorize_access_token(self, request) -> dict:
        return {"userinfo": self._userinfo}


class _DecliningClient:
    """A provider that answers the code exchange with a bare OAuth error —
    in practice, a declined consent screen."""

    async def authorize_access_token(self, request):
        raise OAuthError(error="access_denied")


class _StaleStateClient:
    """A provider callback arriving with a `state` authlib no longer holds."""

    async def authorize_access_token(self, request):
        raise MismatchingStateError()


def _warning_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [
        r
        for r in caplog.records
        if r.name == _LOGGER_NAME and r.levelno == logging.WARNING
    ]


@pytest.mark.asyncio
async def test_a_coded_refusal_logs_exactly_one_warning_naming_its_code(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """The Discord no-email gate — a coded `HTTPException` (#1771)."""
    from routers import auth as auth_router

    class _StubDiscordNoEmail:
        async def authorize_access_token(self, request):
            return {"access_token": "t", "expires_in": 604800}

        async def get(self, path, token=None):
            class _Resp:
                def json(self_inner):
                    return {"id": "provider-user-999", "username": "no-email"}

            return _Resp()

    monkeypatch.setattr(auth_router._OAUTH, "discord", _StubDiscordNoEmail())

    with caplog.at_level(logging.WARNING, logger=_LOGGER_NAME):
        resp = await client.get("/auth/discord/callback")

    assert resp.status_code == 302
    warnings = _warning_records(caplog)
    assert len(warnings) == 1
    assert ErrorCode.oauth_email_unverified.value in warnings[0].getMessage()


@pytest.mark.asyncio
async def test_a_stale_state_logs_exactly_one_warning_naming_its_code(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from routers import auth as auth_router

    monkeypatch.setattr(auth_router._OAUTH, "google", _StaleStateClient())

    with caplog.at_level(logging.WARNING, logger=_LOGGER_NAME):
        resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    warnings = _warning_records(caplog)
    assert len(warnings) == 1
    assert ErrorCode.oauth_state_expired.value in warnings[0].getMessage()


@pytest.mark.asyncio
async def test_a_generic_oauth_error_logs_exactly_one_warning_naming_its_code(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from routers import auth as auth_router

    monkeypatch.setattr(auth_router._OAUTH, "google", _DecliningClient())

    with caplog.at_level(logging.WARNING, logger=_LOGGER_NAME):
        resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    warnings = _warning_records(caplog)
    assert len(warnings) == 1
    assert ErrorCode.oauth_failed.value in warnings[0].getMessage()


@pytest.mark.asyncio
async def test_a_successful_sign_in_logs_no_warning(
    client: AsyncClient,
    db_session: AsyncSession,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from routers import auth as auth_router

    monkeypatch.setattr(
        auth_router._OAUTH,
        "google",
        _StubGoogleClient(
            {
                "sub": "google-sub-quiet-success",
                "email": "quiet-success@example.com",
                "email_verified": True,
            }
        ),
    )

    with caplog.at_level(logging.WARNING, logger=_LOGGER_NAME):
        resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    assert resp.cookies.get("access_token")
    assert _warning_records(caplog) == []


@pytest.mark.asyncio
async def test_the_refusal_record_names_neither_the_email_nor_the_provider_user_id(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """The security-sensitive half: only the enum value may appear."""
    from routers import auth as auth_router

    provider_user_id = "google-sub-should-not-appear"
    email = "should-not-appear@example.com"

    class _StubGoogleUnverified:
        async def authorize_access_token(self, request):
            return {
                "userinfo": {
                    "sub": provider_user_id,
                    "email": email,
                    "email_verified": False,
                }
            }

    monkeypatch.setattr(auth_router._OAUTH, "google", _StubGoogleUnverified())

    with caplog.at_level(logging.WARNING, logger=_LOGGER_NAME):
        resp = await client.get("/auth/google/callback")

    assert resp.status_code == 302
    warnings = _warning_records(caplog)
    assert len(warnings) == 1
    message = warnings[0].getMessage()
    assert email not in message
    assert provider_user_id not in message
    assert message == f"sign-in refused: {ErrorCode.oauth_email_unverified.value}"
