"""Guards on the committed OpenAPI artifact (#1400).

``backend/openapi.json`` is the contract ``frontend/src/api/generated/`` is
generated from, and CI enforces it by regenerating and diffing. Two properties
have to hold for that gate to mean anything, and neither is free:

**The dump is byte-reproducible.** ``json.dumps(sort_keys=True)`` orders keys
but not *values*, so any list the schema builds from a ``set`` would reshuffle
between interpreters under hash randomisation. That failure is invisible
locally — one process, one seed, one answer — and shows up as a gate that goes
red on commits touching nothing. The first test runs two real subprocesses under
different ``PYTHONHASHSEED`` values, because in-process repetition cannot catch
it.

**The committed file matches the code.** This is the same check the CI job
makes, deliberately duplicated here so a backend change that forgets the regen
fails in ``pytest`` too, rather than only in a job a backend-only developer may
not think to read. It is not a second recipe: both call the same ``render`` on
the same ``build_schema``.

Both tests regenerate into ``tmp_path``. A test that "proved" the artifact was
current by overwriting it would prove nothing.
"""

import os
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DUMP_SCRIPT = BACKEND_ROOT / "scripts" / "dump_openapi.py"
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"


def _dump_in_subprocess(destination: Path, hash_seed: str) -> bytes:
    """Run the real dump script in a fresh interpreter and read back the bytes."""
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
