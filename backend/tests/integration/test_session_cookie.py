"""The Starlette session cookie that carries OAuth ``state`` (#1755).

Integration, not unit: it imports the assembled app (no DB). Asserts the
installed middleware kwargs, since ``https_only`` is baked in at import.
"""

import pytest
from starlette.middleware.sessions import SessionMiddleware

from config import settings
from main import app

#: The only real expiry on OAuth ``state``: authlib never checks its own ``exp``.
#: Server-enforced via ``TimestampSigner.unsign()``.
_EXPECTED_MAX_AGE = 600


def _session_middleware_kwargs() -> dict:
    for middleware in app.user_middleware:
        if middleware.cls is SessionMiddleware:
            return middleware.kwargs
    raise AssertionError(
        "SessionMiddleware is not installed — authlib stores OAuth state in "
        "request.session, so both sign-in legs are broken without it."
    )


def test_the_oauth_state_cookie_expires_in_ten_minutes() -> None:
    """Safe: only authlib reads ``request.session``, for one round trip."""
    assert _session_middleware_kwargs()["max_age"] == _EXPECTED_MAX_AGE


def test_the_oauth_state_cookie_stays_lax_not_strict() -> None:
    """LOAD-BEARING: the callback is a cross-site 302, so ``Strict`` (OWASP's
    general advice) silently breaks sign-in."""
    assert _session_middleware_kwargs()["same_site"] == "lax"


def test_the_oauth_state_cookie_is_secure_unless_this_is_development() -> None:
    """Not a literal: CI defaults to "development". Direction pinned below."""
    assert _session_middleware_kwargs()["https_only"] == (not settings.is_development)


@pytest.mark.parametrize(
    "environment,is_development",
    [
        pytest.param("development", True, id="the-one-value-that-counts"),
        pytest.param("production", False, id="production"),
        pytest.param("prod", False, id="abbreviated"),
        pytest.param("Development", False, id="capitalised"),
        pytest.param("development ", False, id="trailing-space"),
        pytest.param("", False, id="env-var-dropped"),
    ],
)
def test_only_the_exact_string_development_is_development(
    monkeypatch: pytest.MonkeyPatch, environment: str, is_development: bool
) -> None:
    """Fail closed: an allow-list of one string, so a missing ``ENVIRONMENT``
    hardens the cookie (#1755)."""
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    assert settings.is_development is is_development
