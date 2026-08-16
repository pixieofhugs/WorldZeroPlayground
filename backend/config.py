from pydantic_settings import BaseSettings

#: The ONE value that unlocks a development seam. ``ENVIRONMENT`` is a free-form
#: ``str`` defaulting to "development", and the guards that read it used to be
#: deny-lists against the literal "production" — so every value that was not
#: exactly that ("prod", "Production", a trailing space, an env var dropped when
#: a Render service is re-created, unset) simultaneously enabled an
#: unauthenticated JWT mint AND stripped ``Secure`` from a cookie. Everything
#: now fails closed: anything unrecognised is treated as production.
#:
#: Safe to invert — ``.github/workflows/e2e.yml:42`` sets ``ENVIRONMENT:
#: development`` explicitly ("dev-login must be enabled"), the field default is
#: "development", and ``render.yaml:34`` is "production".
_ENV_DEVELOPMENT = "development"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    DISCORD_CLIENT_ID: str
    DISCORD_CLIENT_SECRET: str
    DISCORD_REDIRECT_URI: str
    MEDIA_BASE_URL: str
    ENVIRONMENT: str = "development"
    MEDIA_ROOT: str = "/media"
    FRONTEND_URL: str = "http://localhost:3000"
    COOKIE_DOMAIN: str | None = None
    ADMIN_CLI_SECRET: str = ""
    # Comma-separated browser origins allowed to talk to this API. Read by
    # exactly two consumers, and it has to stay exactly two: ``CORSMiddleware``
    # (every REST route) and the praxis room's hand-rolled ``Origin`` check
    # (``services/praxis_room.py``). CORS middleware does not apply to
    # WebSockets, so the room re-checks the *same* list rather than growing a
    # second copy that can drift (ADR-0073).
    #
    # A plain ``str`` rather than ``list[str]``: pydantic-settings parses a
    # list-typed field as JSON, which this value is not.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    # Accept a room handshake that carries no ``Origin`` header at all.
    # Production says no: browsers always send one, so "a valid known Origin,
    # or nothing" costs nothing real and closes cross-site WebSocket hijacking
    # (ADR-0073). Non-browser clients — the pytest room clients — send none, so
    # they set this.
    ROOM_ALLOW_MISSING_ORIGIN: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins(self) -> list[str]:
        """``CORS_ORIGINS`` as a list, blanks dropped."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        """Is this the local development environment, exactly and knowably?

        The single answer to that question (#1755). It was a private
        ``_is_development()`` inside ``routers/auth.py`` while ``db.py`` had
        already open-coded the same comparison a third time — and the next
        caller was ``main.py``'s session-cookie ``https_only``, which would have
        made a fourth. Every security guard that fails closed on this now reads
        one property: the OAuth and dev-login seams in ``routers/auth.py``, the
        SQLAlchemy ``echo`` in ``db.py``, and the session cookie in ``main.py``.
        """
        return self.ENVIRONMENT == _ENV_DEVELOPMENT


settings = Settings()
