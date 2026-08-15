"""
Dump the FastAPI OpenAPI schema to ``backend/openapi.json``, byte-for-byte
reproducibly.

WHY THIS EXISTS
---------------
``frontend/src/api/*.ts`` hand-mirrors every backend response shape, so the two
sides drift silently: the compiler cannot see the wire. The committed schema is
the shared artifact that ends that — the frontend's types are generated from it,
so a backend shape change that the frontend has not absorbed becomes a compile
error instead of a runtime surprise (#1400).

WHY THE DUMP MUST BE DETERMINISTIC
----------------------------------
CI enforces the artifact with ``git diff --exit-code`` after regenerating. A
gate that flaps produces a red build on commits that changed nothing, and a gate
that flaps is a gate everyone learns to ignore. ``app.openapi()`` does not give
determinism for free, so this module pins the three things that can move:

1. **Key order.** ``sort_keys=True``. FastAPI builds the schema by walking
   routes and models, so the natural key order tracks import and definition
   order — stable in practice, but not something to rest a merge gate on.
2. **Formatting.** Fixed two-space indent, ``ensure_ascii=False`` and one
   trailing newline, so the file is diffable and does not depend on the json
   module's separator defaults.
3. **The environment.** ``config.Settings`` requires secrets to exist before
   ``main`` can be imported at all, and a developer with a populated ``.env``
   would otherwise import the app under different settings than CI does. The
   placeholders below are forced into ``os.environ`` (env vars outrank
   ``.env`` in pydantic-settings) so the dump is a function of the *code* and
   nothing else. None of these values reach the schema; forcing them is what
   guarantees that stays true.

Sorting keys does not sort *values*, and a list built from a ``set`` would still
reorder between processes under hash randomisation. ``tests/test_openapi_dump.py``
is the guard: it regenerates in a separate interpreter and compares bytes.

Run it through the single regen entry point rather than directly:

    python scripts/regen_api_client.py
"""

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = BACKEND_ROOT / "openapi.json"

# Importing `main` constructs `config.settings`, which has required fields. These
# are deliberately fake and deliberately forced: see the module docstring.
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
    """Write the schema to ``backend/openapi.json``, or to a path given as argv[0].

    The override exists for ``tests/test_openapi_dump.py``, which regenerates
    into a temp directory to compare against the committed file. A test that
    proved the artifact was current by overwriting it would prove nothing.
    """
    argv = sys.argv[1:] if argv is None else argv
    destination = Path(argv[0]) if argv else OUTPUT_PATH
    destination.write_text(render(build_schema()), encoding="utf-8", newline="\n")
    print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
