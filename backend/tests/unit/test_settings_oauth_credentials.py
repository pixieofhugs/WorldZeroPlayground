"""Where OAuth credentials are required — and where they are not (#1814).

The seam is ``Settings`` construction itself, not the OAuth round trip. A stale
dev checkout whose ``.env`` predates a provider must still boot; production must
refuse to boot half-configured, and say which variables are blank.
"""

import pytest
from pydantic import ValidationError

from config import _OAUTH_CREDENTIAL_FIELDS, Settings

#: The settings that stay mandatory in every environment (they are needed
#: everywhere, so a default would hide a real misconfiguration).
_REQUIRED_EVERYWHERE = {
    "DATABASE_URL": "postgresql+asyncpg://unit:unit@localhost/unit",
    "SECRET_KEY": "unit-test-secret",
    "MEDIA_BASE_URL": "http://localhost:8000/media",
}


@pytest.fixture
def no_oauth_env(monkeypatch):
    """A process environment with no OAuth credentials at all.

    CI exports all six (``.github/workflows/test.yml``), and real env vars beat
    ``.env``, so both sources have to go for "absent" to mean absent.
    """
    for name in _OAUTH_CREDENTIAL_FIELDS:
        monkeypatch.delenv(name, raising=False)


def _build(**overrides) -> Settings:
    # ``_env_file=None``: the developer's own backend/.env must not decide
    # whether this test passes.
    return Settings(_env_file=None, **_REQUIRED_EVERYWHERE, **overrides)


def test_development_boots_with_no_oauth_credentials(no_oauth_env):
    """The case that fails today: a checkout that never heard of a provider."""
    settings = _build(ENVIRONMENT="development")

    assert [getattr(settings, name) for name in _OAUTH_CREDENTIAL_FIELDS] == [""] * len(
        _OAUTH_CREDENTIAL_FIELDS
    )


def test_production_refuses_blank_oauth_credentials_and_names_them(no_oauth_env):
    """Production fails closed, and the message is at least as legible as the
    pydantic ``Field required`` error it replaces — every blank name, at once."""
    filled = {name: f"set-{name.lower()}" for name in _OAUTH_CREDENTIAL_FIELDS}

    with pytest.raises(ValidationError) as exc_info:
        _build(ENVIRONMENT="production", **{**filled, "DISCORD_CLIENT_SECRET": ""})
    assert "DISCORD_CLIENT_SECRET" in str(exc_info.value)

    # Every blank is named, not just the first one found.
    with pytest.raises(ValidationError) as exc_info:
        _build(ENVIRONMENT="production")
    message = str(exc_info.value)
    for name in _OAUTH_CREDENTIAL_FIELDS:
        assert name in message

    # And a fully configured production still constructs — otherwise the two
    # assertions above would also pass for a guard that always raises.
    assert _build(ENVIRONMENT="production", **filled).ENVIRONMENT == "production"
