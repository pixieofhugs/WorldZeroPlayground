"""`scripts/e2e_summary.py` turns a Playwright JSON report into one line per spec."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "scripts"))

from e2e_summary import summarize  # noqa: E402


def _spec(file, *statuses):
    return {"file": file, "tests": [{"status": s} for s in statuses]}


def test_summarize_tallies_nested_suites_per_file():
    report = {
        "suites": [
            {
                "file": "a.spec.ts",
                "specs": [_spec("a.spec.ts", "expected", "flaky")],
                "suites": [{"specs": [_spec("a.spec.ts", "skipped")]}],
            },
            {
                "file": "b.spec.ts",
                "specs": [_spec("b.spec.ts", "unexpected", "expected")],
            },
        ]
    }
    assert summarize(report) == [
        "ok    a.spec.ts  pass=2 fail=0 skip=1",
        "FAIL  b.spec.ts  pass=1 fail=1 skip=0",
    ]


def test_summarize_empty_report():
    assert summarize({}) == []
