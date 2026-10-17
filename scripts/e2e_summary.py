#!/usr/bin/env python3
"""One pass/fail/skip line per spec file for an E2E workflow run.

    python scripts/e2e_summary.py RUN_ID

Downloads the run's `playwright-json` artifact (the Playwright JSON report) with
`gh run download` and tallies each test by its final status. The reviewer cites
the run id; this is how to read it without opening a 237k-line log.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path


def _walk(suite: dict, counts: dict[str, dict[str, int]]) -> None:
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            # expected/flaky passed (flaky only after a retry); unexpected failed.
            bucket = {"expected": "pass", "flaky": "pass", "skipped": "skip"}.get(
                test.get("status"), "fail"
            )
            counts[spec.get("file") or suite.get("file", "?")][bucket] += 1
    for child in suite.get("suites", []):
        _walk(child, counts)


def summarize(report: dict) -> list[str]:
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for suite in report.get("suites", []):
        _walk(suite, counts)
    return [
        f"{'FAIL' if c['fail'] else 'ok  '}  {f}  "
        f"pass={c['pass']} fail={c['fail']} skip={c['skip']}"
        for f, c in sorted(counts.items())
    ]


def main(run_id: str) -> int:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["gh", "run", "download", run_id, "-n", "playwright-json", "-D", tmp],
            check=True,
        )
        report = json.loads((Path(tmp) / "results.json").read_text())
    lines = summarize(report)
    print("\n".join(lines) or "no tests in report")
    return 1 if any(line.startswith("FAIL") for line in lines) else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: e2e_summary.py RUN_ID")
    sys.exit(main(sys.argv[1]))
