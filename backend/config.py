from pydantic import model_validator
from pydantic_settings import BaseSettings

#: The ONE value that unlocks a development seam (dev-login JWT mint, non-Secure
#: cookie). Fails closed: any other ENVIRONMENT value is treated as production.
_ENV_DEVELOPMENT = "development"

#: Blank by default so stale ``.env`` files still boot; required in production by
#: walking this tuple (#1814). A new provider adds its names here only.
_OAUTH_CREDENTIAL_FIELDS = (
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
)

#: The literal, not ``not is_development``: "staging"/"local" must not demand
#: OAuth credentials.
_ENV_PRODUCTION = "production"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = ""
    MEDIA_BASE_URL: str
    ENVIRONMENT: str = "development"
    MEDIA_ROOT: str = "/media"
    FRONTEND_URL: str = "http://localhost:3000"
    COOKIE_DOMAIN: str | None = None
    ADMIN_CLI_SECRET: str = ""
    # Comma-separated. Read by CORSMiddleware AND the praxis room's own Origin
    # check (CORS doesn't cover WebSockets) — keep it one list (ADR-0073).
    # A ``str``: pydantic-settings would parse ``list[str]`` as JSON.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    # False in production: closes cross-site WebSocket hijacking (ADR-0073).
    # Pytest room clients send no Origin, so they set it.
    ROOM_ALLOW_MISSING_ORIGIN: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _require_oauth_credentials_in_production(self) -> "Settings":
        """Production refuses to boot half-configured, naming every blank at once."""
        if self.ENVIRONMENT != _ENV_PRODUCTION:
            return self
        blank = [name for name in _OAUTH_CREDENTIAL_FIELDS if not getattr(self, name).strip()]
        if blank:
            raise ValueError(
                f"{_ENV_PRODUCTION} requires every OAuth credential; these are "
                f"missing or blank: {', '.join(blank)}"
            )
        return self

    @property
    def cors_origins(self) -> list[str]:
        """``CORS_ORIGINS`` as a list, blanks dropped."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        """Is this the local development environment, exactly and knowably?

        The single answer every fail-closed security guard reads (#1755).
        """
        return self.ENVIRONMENT == _ENV_DEVELOPMENT


settings = Settings()
