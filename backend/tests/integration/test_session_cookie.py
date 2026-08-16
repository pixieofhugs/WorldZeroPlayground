"""The Starlette session cookie that carries OAuth ``state`` (#1755).

Lives here rather than in ``tests/unit`` because it reads the *assembled*
application object, and ``tests/unit/conftest.py`` exists precisely so unit
tests import neither the app nor anything needing env vars. Nothing here
touches the database.

**Why the kwargs and not a response.** ``https_only`` is consumed by
``SessionMiddleware.__init__``, which runs once at import when ``main`` builds
the app. By the time a test could monkeypatch ``settings.ENVIRONMENT`` the flag
is already baked into a string. So the seam is the installed middleware's own
kwargs — the arguments the app was actually constructed with — plus a direct
test of the property those kwargs are derived from. Between them they pin both
halves: that the flag tracks the environment, and which way it fails.
"""

import pytest
from starlette.middleware.sessions import SessionMiddleware

from config import settings
from main import app

#: How long an OAuth ``state`` stays replayable. This is the only expiry it
#: actually has: authlib stamps an ``exp`` into the stored value and never reads
#: it back (``StarletteIntegration.get_state_data`` returns ``value["data"]``
#: with no clock comparison), so its hour is decorative. Starlette hands this to
#: ``TimestampSigner.unsign()``, making it server-enforced rather than a browser
#: hint — and the default it replaces is fourteen days.
_EXPECTED_MAX_AGE = 600


def _session_middleware_kwargs() -> dict:
    """The kwargs ``main`` actually installed ``SessionMiddleware`` with."""
    for middleware in app.user_middleware:
        if middleware.cls is SessionMiddleware:
            return middleware.kwargs
    raise AssertionError(
        "SessionMiddleware is not installed — authlib stores OAuth state in "
        "request.session, so both sign-in legs are broken without it."
    )


def test_the_oauth_state_cookie_expires_in_ten_minutes() -> None:
    """Not Starlette's fourteen-day default (#1755).

    Safe to shorten this far because the cookie has no other job: nothing in
    ``backend/`` reads ``request.session`` except authlib, so it only has to
    survive one round trip to the provider.
    """
    assert _session_middleware_kwargs()["max_age"] == _EXPECTED_MAX_AGE


def test_the_oauth_state_cookie_stays_lax_not_strict() -> None:
    """LOAD-BEARING, and the reason it is asserted rather than left to default.

    The callback arrives via a cross-site 302 from the provider. ``Lax``'s
    carve-out for top-level safe-method navigations is the only reason the
    session comes back at all, so ``Strict`` — which OWASP's Session Management
    Cheat Sheet recommends for session cookies generally — breaks sign-in
    silently. This test is what a future hardening pass trips over.
    """
    assert _session_middleware_kwargs()["same_site"] == "lax"


def test_the_oauth_state_cookie_is_secure_unless_this_is_development() -> None:
    """The flag is derived from the environment, not hardcoded either way.

    Deliberately not asserted as a literal: CI sets no ``ENVIRONMENT`` and the
    field defaults to "development", so a literal ``False`` here would pass in
    CI while saying nothing about production, and a literal ``True`` would fail
    for every developer. What matters is the coupling; which way it falls is
    pinned by the fail-closed test below.
    """
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
    """Fail closed: anything unrecognised is production (#1755).

    This is the half the middleware kwargs cannot show. The property is what
    decides whether the session cookie ships ``Secure``, and it is an allow-list
    of exactly one string rather than a deny-list against "production" — so an
    ``ENVIRONMENT`` dropped when a Render service is re-created hardens the
    cookie instead of stripping it.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    assert settings.is_development is is_development
