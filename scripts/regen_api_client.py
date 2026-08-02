"""
Regenerate the API contract artifacts. The single command, for humans and CI.

    python scripts/regen_api_client.py

Two files come out, and both are committed:

    backend/openapi.json                  the schema FastAPI actually serves
    frontend/src/api/generated/schema.d.ts  TypeScript types generated from it

WHY ONE SCRIPT AND NOT TWO STEPS
--------------------------------
CI enforces these artifacts by regenerating them and running
``git diff --exit-code``. If CI regenerated via its own inlined commands and
developers regenerated via theirs, the gate would be testing whether two
transcriptions of the same recipe still agree — and the day they stop agreeing,
the failure lands on whoever's PR happened to be open. There is one recipe, it
lives here, and the workflow calls it. Changing how generation works means
changing this file and nothing else.

The determinism the gate depends on is argued in
``backend/scripts/dump_openapi.py`` and guarded by
``backend/tests/test_openapi_dump.py``.

Requires: backend Python dependencies importable, and ``npm ci`` already run in
``frontend/`` (openapi-typescript is a devDependency, pinned by the lockfile —
the generator version is part of the artifact's identity, so an unpinned one
would move the output from under the gate).
"""

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
FRONTEND = REPO_ROOT / "frontend"

SCHEMA_JSON = BACKEND / "openapi.json"
GENERATED_TYPES = FRONTEND / "src" / "api" / "generated" / "schema.d.ts"


def dump_schema() -> None:
    """Write backend/openapi.json from the live FastAPI app."""
    # ASCII only: this script is run by hand on Windows, where the default
    # console codepage (cp1252) raises UnicodeEncodeError on box/arrow glyphs.
    print("[1/2] backend/openapi.json")
    subprocess.run(
        [sys.executable, str(BACKEND / "scripts" / "dump_openapi.py")],
        cwd=BACKEND,
        check=True,
    )


def generate_types() -> None:
    """Write the TypeScript types from the schema just dumped."""
    print("[2/2] frontend/src/api/generated/schema.d.ts")
    npx = shutil.which("npx")
    if npx is None:
        sys.exit("npx not found on PATH — install Node.js, then run `npm ci` in frontend/.")

    GENERATED_TYPES.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [npx, "openapi-typescript", str(SCHEMA_JSON), "-o", str(GENERATED_TYPES)],
        cwd=FRONTEND,
        check=True,
    )


def main() -> None:
    dump_schema()
    generate_types()
    print("\nDone. Commit both files if they changed.")


if __name__ == "__main__":
    main()
