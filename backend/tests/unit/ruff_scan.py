"""Runs ruff over the backend and tallies findings for ``ruff_allowlist.py`` (#2427).

``sys.executable -m ruff`` so the pinned version runs, not whatever is on PATH.
Keyed ``<path>::<code>``: no line numbers (they churn), but per rule code.
Fails loudly: ``-m ruff`` without ruff exits 1 with empty stdout, which looks
clean, so check importability first and require a JSON list.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]

#: What ruff reports for a file it could not parse. ``code`` is ``null`` in the
#: JSON for those.
SYNTAX_ERROR_CODE = "syntax-error"


def ruff_is_installed() -> bool:
    return importlib.util.find_spec("ruff") is not None


def run_ruff() -> list[dict]:
    """Raises ``RuntimeError`` if ruff didn't run or emit JSON (both look clean)."""
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
    """``services/praxis.py::F401``"""
    path = Path(finding["filename"]).resolve().relative_to(BACKEND_ROOT).as_posix()
    return f"{path}::{finding.get('code') or SYNTAX_ERROR_CODE}"


def tally(findings: list[dict]) -> Counter[str]:
    return Counter(key_for(finding) for finding in findings)


def scan_backend() -> Counter[str]:
    return tally(run_ruff())
