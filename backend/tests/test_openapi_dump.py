"""Guards on the committed ``backend/openapi.json`` (#1400).

Byte-reproducible: set-built lists reshuffle under hash randomisation, so two
subprocesses with different ``PYTHONHASHSEED``. Current: duplicates the CI
check so pytest catches a forgotten regen. Both write to ``tmp_path``.
"""

import os
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DUMP_SCRIPT = BACKEND_ROOT / "scripts" / "dump_openapi.py"
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"


def _dump_in_subprocess(destination: Path, hash_seed: str) -> bytes:
    environment = {**os.environ, "PYTHONHASHSEED": hash_seed}
    subprocess.run(
        [sys.executable, str(DUMP_SCRIPT), str(destination)],
        cwd=BACKEND_ROOT,
        env=environment,
        check=True,
        capture_output=True,
    )
    return destination.read_bytes()


def test_dump_is_byte_identical_across_processes(tmp_path: Path) -> None:
    first = _dump_in_subprocess(tmp_path / "first.json", hash_seed="0")
    second = _dump_in_subprocess(tmp_path / "second.json", hash_seed="1")

    assert first == second, (
        "The OpenAPI dump is not reproducible across processes. Something in the "
        "schema is ordered by a set or another hash-dependent structure, so the "
        "CI drift gate will fail on commits that changed nothing. Find the "
        "unordered collection and sort it — do not relax the gate."
    )


def test_committed_schema_matches_the_app(tmp_path: Path) -> None:
    regenerated = _dump_in_subprocess(tmp_path / "current.json", hash_seed="0")

    assert regenerated == COMMITTED_SCHEMA.read_bytes(), (
        "backend/openapi.json is stale — the app serves a different schema than "
        "the committed artifact. Run `python scripts/regen_api_client.py` from "
        "the repo root and commit BOTH regenerated files; the frontend types are "
        "generated from this one."
    )
