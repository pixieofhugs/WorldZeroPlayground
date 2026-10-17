"""Run one `/builder-bot` lookup on the local model, and keep the receipt.

An experiment: can the free local model (`scout` — Qwen on Strata, read-only)
take a job the orchestrator does today, and how good is it? Every call is
appended to `.claude/scout-log.jsonl` with what was asked, what came back and
how long it took, so the answer is measured rather than remembered — and so
the log can be used to tune the local model later.

    local_scout.py run footprint <issue> "<what the issue changes>"
    local_scout.py run unknown   <issue> "<one mechanical question>"
    local_scout.py verdict <id> ok|wrong ["what was off"]
    local_scout.py score [#issue ...]

`run` prints the answer and the call's id. A `footprint` call is asked for one
path per line, which is what `score` reads.

`score` needs no judge. A footprint is a prediction of which files a change
will touch, and once the issue's PR merges the real answer is on GitHub — so
it compares each logged footprint with the files that PR actually changed.

Exit 2 from `run` means the local model is not running. Do the lookup
yourself; never start Strata from here — it takes the GPU.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parent.parent)
LOG = ROOT / ".claude" / "scout-log.jsonl"
KINDS = ("footprint", "unknown")
SHAPE = "\n\nAnswer with one repo-relative file path per line and nothing else."
UNAVAILABLE = 2
A_PATH = re.compile(r"[\w.\-/\[\]]+/[\w.\-\[\]]+\.\w+|[\w.\-]+\.(?:py|tsx?|css|md|json|ya?ml)")


def parse_paths(answer: str) -> set[str]:
    """The file paths in a scout answer, tolerant of bullets, ticks and `:line`."""
    found = set()
    for line in answer.splitlines():
        match = A_PATH.search(line.replace("`", ""))
        if match:
            found.add(match.group().removeprefix("./"))
    return found


def overlap(predicted: set[str], actual: set[str]) -> tuple[int, int, int]:
    """`(hit, missed, extra)`: files it found, files it missed, files it invented."""
    return len(predicted & actual), len(actual - predicted), len(predicted - actual)


def _append(record: dict) -> None:
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as log:
        log.write(json.dumps(record) + "\n")


def _records() -> list[dict]:
    if not LOG.is_file():
        return []
    return [json.loads(line) for line in LOG.read_text(encoding="utf-8").splitlines() if line]


def run(kind: str, issue: str, task: str) -> int:
    if not shutil.which("scout"):
        print("local_scout: `scout` is not on PATH on this machine.", file=sys.stderr)
        return UNAVAILABLE
    started = time.monotonic()
    try:
        done = subprocess.run(
            ["scout", task + (SHAPE if kind == "footprint" else "")],
            capture_output=True,
            text=True,
            timeout=900,
        )
    except subprocess.TimeoutExpired:
        print("local_scout: scout timed out after 900s.", file=sys.stderr)
        return UNAVAILABLE
    if done.returncode != 0:
        print(done.stderr.strip() or "local_scout: scout failed.", file=sys.stderr)
        return UNAVAILABLE if done.returncode == UNAVAILABLE else 1
    call_id = time.strftime("%Y%m%d-%H%M%S")
    _append(
        {
            "id": call_id,
            "kind": kind,
            "issue": issue.lstrip("#"),
            "task": task,
            "answer": done.stdout.strip(),
            "seconds": round(time.monotonic() - started),
            "tools": done.stderr.strip(),
        }
    )
    print(done.stdout.strip())
    print(f"[local_scout id: {call_id}]")
    return 0


def verdict(call_id: str, ruling: str, note: str) -> int:
    if ruling not in ("ok", "wrong") or call_id not in {r.get("id") for r in _records()}:
        print("local_scout: verdict <id> ok|wrong — and the id must be in the log.", file=sys.stderr)
        return 1
    _append({"verdict_for": call_id, "ruling": ruling, "note": note})
    return 0


def _gh_json(*arguments: str):
    done = subprocess.run(["gh", *arguments], capture_output=True, text=True, timeout=30)
    return json.loads(done.stdout) if done.returncode == 0 and done.stdout.strip() else None


def _actual_files(issue: str) -> set[str] | None:
    """Files changed by the merged PR(s) that closed this issue; None if none merged."""
    closed_by = _gh_json("issue", "view", issue, "--json", "closedByPullRequestsReferences")
    files: set[str] = set()
    for reference in (closed_by or {}).get("closedByPullRequestsReferences", []):
        pull = _gh_json("pr", "view", str(reference["number"]), "--json", "state,files")
        if pull and pull["state"] == "MERGED":
            files |= {entry["path"] for entry in pull["files"]}
    return files or None


def score(issues: tuple[str, ...] = ()) -> int:
    records = _records()
    wanted = {i.lstrip("#") for i in issues}
    calls = [r for r in records if "id" in r and (not wanted or r["issue"] in wanted)]
    rulings = {r["verdict_for"]: r["ruling"] for r in records if "verdict_for" in r}
    hit = missed = extra = scored = 0
    for call in calls:
        if call["kind"] != "footprint":
            continue
        actual = _actual_files(call["issue"])
        if actual is None:
            print(f"#{call['issue']}: no merged PR yet")
            continue
        h, m, e = overlap(parse_paths(call["answer"]), actual)
        hit, missed, extra, scored = hit + h, missed + m, extra + e, scored + 1
        print(f"#{call['issue']}: found {h} of {h + m} files, {e} not touched, {call['seconds']}s")
    seconds = sum(c["seconds"] for c in calls)
    ok = sum(1 for r in rulings.values() if r == "ok")
    print(
        f"\n{len(calls)} calls, {seconds}s on the local model. "
        f"Footprints scored: {scored} — found {hit} of {hit + missed} files, {extra} not touched. "
        f"Spot-checks: {ok} ok, {len(rulings) - ok} wrong, {len(calls) - len(rulings)} unruled."
    )
    return 0


def main(argv: list[str]) -> int:
    if len(argv) == 5 and argv[1] == "run" and argv[2] in KINDS:
        return run(argv[2], argv[3], argv[4])
    if len(argv) in (4, 5) and argv[1] == "verdict":
        return verdict(argv[2], argv[3], argv[4] if len(argv) == 5 else "")
    if argv[1:2] == ["score"]:
        return score(tuple(argv[2:]))
    print(__doc__.split("\n\n")[2], file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
