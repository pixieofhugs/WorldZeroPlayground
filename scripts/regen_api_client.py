"""
Regenerate the API contract artifacts. The single command, for humans and CI.

    python scripts/regen_api_client.py

Writes (both committed) backend/openapi.json and
frontend/src/api/generated/schema.d.ts. CI calls this same script and then
``git diff --exit-code``, so there is one recipe, not two to drift apart.
Determinism: ``backend/scripts/dump_openapi.py``.

Requires backend deps importable and ``npm ci`` in ``frontend/`` (the pinned
openapi-typescript version is part of the output's identity).
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
    # ASCII only: cp1252 Windows consoles raise on box/arrow glyphs.
    print("[1/2] backend/openapi.json")
    subprocess.run(
        [sys.executable, str(BACKEND / "scripts" / "dump_openapi.py")],
        cwd=BACKEND,
        check=True,
    )


def generate_types() -> None:
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
