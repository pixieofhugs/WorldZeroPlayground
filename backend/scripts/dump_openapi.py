"""Dump the FastAPI OpenAPI schema to ``backend/openapi.json``, byte-reproducibly.

The frontend's types are generated from it (#1400); CI regenerates and diffs, so
key order, formatting and environment are pinned. Placeholders are forced into
``os.environ`` (outranking ``.env``) so the dump depends only on code. Set-built
lists can still reorder; ``tests/test_openapi_dump.py`` guards that.

Locally prefer `scripts/wz regen` (or ``python scripts/regen_api_client.py``).
"""

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = BACKEND_ROOT / "openapi.json"

# Required by `config.settings` at import; fake and forced (see module docstring).
PLACEHOLDER_ENVIRONMENT = {
    "DATABASE_URL": "postgresql+asyncpg://openapi:openapi@localhost/openapi",
    "SECRET_KEY": "openapi-dump-not-a-real-secret",
    "GOOGLE_CLIENT_ID": "openapi-dump-client-id",
    "GOOGLE_CLIENT_SECRET": "openapi-dump-client-secret",
    "GOOGLE_REDIRECT_URI": "http://localhost:8000/auth/google/callback",
    "DISCORD_CLIENT_ID": "openapi-dump-client-id",
    "DISCORD_CLIENT_SECRET": "openapi-dump-client-secret",
    "DISCORD_REDIRECT_URI": "http://localhost:8000/auth/discord/callback",
    "MEDIA_BASE_URL": "http://localhost:8000/media",
    "MEDIA_ROOT": "/tmp/openapi-dump-media",
}


def build_schema() -> dict:
    """Import the app under fixed settings and return its OpenAPI document."""
    os.environ.update(PLACEHOLDER_ENVIRONMENT)
    if str(BACKEND_ROOT) not in sys.path:
        sys.path.insert(0, str(BACKEND_ROOT))

    from main import app

    return app.openapi()


def render(schema: dict) -> str:
    """Serialize the schema to the one canonical text form."""
    return json.dumps(schema, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def main(argv: list[str] | None = None) -> None:
    """Write to ``backend/openapi.json``, or argv[0] (used by the dump test)."""
    argv = sys.argv[1:] if argv is None else argv
    destination = Path(argv[0]) if argv else OUTPUT_PATH
    destination.write_text(render(build_schema()), encoding="utf-8", newline="\n")
    print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
