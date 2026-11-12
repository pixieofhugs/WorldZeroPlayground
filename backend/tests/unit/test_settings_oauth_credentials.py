"""OAuth credentials: optional in dev, all required in production (#1814)."""

import pytest
from pydantic import ValidationError

from config import _OAUTH_CREDENTIAL_FIELDS, Settings

_REQUIRED_EVERYWHERE = {
    "DATABASE_URL": "postgresql+asyncpg://unit:unit@localhost/unit",
    "SECRET_KEY": "unit-test-secret",
    "MEDIA_BASE_URL": "http://localhost:8000/media",
}


@pytest.fixture
def no_oauth_env(monkeypatch):
    """CI exports all six, and real env vars beat ``.env``."""
    for name in _OAUTH_CREDENTIAL_FIELDS:
        monkeypatch.delenv(name, raising=False)


def _build(**overrides) -> Settings:
    return Settings(_env_file=None, **_REQUIRED_EVERYWHERE, **overrides)


def test_development_boots_with_no_oauth_credentials(no_oauth_env):
    settings = _build(ENVIRONMENT="development")

    assert [getattr(settings, name) for name in _OAUTH_CREDENTIAL_FIELDS] == [""] * len(
        _OAUTH_CREDENTIAL_FIELDS
    )


def test_production_refuses_blank_oauth_credentials_and_names_them(no_oauth_env):
    filled = {name: f"set-{name.lower()}" for name in _OAUTH_CREDENTIAL_FIELDS}

    with pytest.raises(ValidationError) as exc_info:
        _build(ENVIRONMENT="production", **{**filled, "DISCORD_CLIENT_SECRET": ""})
    assert "DISCORD_CLIENT_SECRET" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        _build(ENVIRONMENT="production")
    message = str(exc_info.value)
    for name in _OAUTH_CREDENTIAL_FIELDS:
        assert name in message

    # Else a guard that always raises would pass.
    assert _build(ENVIRONMENT="production", **filled).ENVIRONMENT == "production"
