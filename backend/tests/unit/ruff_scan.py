"""Runs ruff over the shipped backend and tallies what it finds (#2427).

This is the measuring instrument behind the shrink-only allowlist in
``ruff_allowlist.py``. It is deliberately thin: ruff is the scanner, this module
only decides *how it is invoked* and *what a finding is keyed on*.

HOW IT IS INVOKED
-----------------
``sys.executable -m ruff`` rather than a bare ``ruff`` on ``PATH``. The two are
not the same thing on a machine with several environments, and the version that
matters is the one pinned in ``requirements.txt`` and installed next to pytest —
a different ruff on ``PATH`` would report a different number and the ratchet
would swing for reasons that have nothing to do with the code.

``--no-cache`` so the run leaves no ``.ruff_cache/`` behind for a ``.gitignore``
to have to know about, and ``cwd=BACKEND_ROOT`` so ruff finds
``backend/pyproject.toml`` no matter where pytest was invoked from.

WHAT A FINDING IS KEYED ON
--------------------------
``<path relative to backend/>::<rule code>``, e.g. ``services/praxis.py::F401``.

Two deliberate choices there, both copied from the uncoded-error ratchet:

* **Line numbers are not part of the key.** They churn on every edit above the
  finding, which would make the allowlist a merge-conflict generator rather
  than a ratchet.
* **The rule code is.** Grandfathering a whole *file* would mean a file with one
  long line is also exempt from unused imports and unsorted imports forever.
  Per file *and* per code, with a count, is the tightest thing that still lets
  the tree be green on day one.

A NOTE ON FAILING LOUDLY
------------------------
``python -m ruff`` on an environment without ruff exits 1 with an empty stdout,
which is indistinguishable from "ruff ran and found nothing" if you only look
at the exit code. That would turn a missing linter into a green test forever.
So the module checks ruff is importable *first*, and then insists stdout parses
as a JSON list.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

#: ``backend/``. Resolved from this file, not the cwd.
BACKEND_ROOT = Path(__file__).resolve().parents[2]

#: What ruff reports for a file it could not parse. ``code`` is ``null`` in the
#: JSON for those, and a syntax error is not something to grandfather — giving
#: it a key at least makes the failure say what happened.
SYNTAX_ERROR_CODE = "syntax-error"


def ruff_is_installed() -> bool:
    return importlib.util.find_spec("ruff") is not None


def run_ruff() -> list[dict]:
    """Return ruff's raw JSON findings for ``backend/``.

    Raises ``RuntimeError`` if ruff could not be run or did not produce JSON,
    because both of those look like "clean" to an exit-code check.
    """
    if not ruff_is_installed():
        raise RuntimeError(
            "ruff is not installed in this environment, so the lint ratchet"
            " cannot run. It is pinned in backend/requirements.txt:"
            " `pip install -r requirements.txt`."
        )

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "--no-cache",
            "--output-format",
            "json",
            ".",
        ],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )

    # 0 = clean, 1 = findings. Anything else is ruff itself complaining.
    if completed.returncode not in (0, 1):
        raise RuntimeError(
            f"ruff exited {completed.returncode}:\n{completed.stderr.strip()}"
        )

    try:
        findings = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "ruff produced no parseable JSON — treating that as 'clean' is how"
            f" a broken linter stays green.\nstdout: {completed.stdout[:400]!r}"
            f"\nstderr: {completed.stderr[:400]!r}"
        ) from exc

    if not isinstance(findings, list):
        raise RuntimeError(f"ruff JSON was not a list: {type(findings).__name__}")

    return findings


def key_for(finding: dict) -> str:
    """``services/praxis.py::F401`` — the allowlist's unit."""
    path = Path(finding["filename"]).resolve().relative_to(BACKEND_ROOT).as_posix()
    return f"{path}::{finding.get('code') or SYNTAX_ERROR_CODE}"


def tally(findings: list[dict]) -> Counter[str]:
    return Counter(key_for(finding) for finding in findings)


def scan_backend() -> Counter[str]:
    return tally(run_ruff())
