"""Land one PR: ready it, update it, wait for green, gate it, merge it.

`/builder-bot` Step 6 is mostly mechanics — `gh pr ready`, `gh pr update-branch`,
watch the checks, merge, re-fetch — and each of those was a separate turn of an
orchestrator carrying its whole context. This is the same loop in a process no
model inhabits, so a PR costs one call instead of five.

The merge here does NOT pass through the `PreToolUse` hook: that hook reads Bash
commands, and this script's `gh pr merge` is a subprocess it never sees. So the
script asks the hook's own :func:`guard_pr_merge.decide` before merging, and
merges only on its silence. Same three gates, same code, no second copy to rot.

Ownership is checked before anything else touches the PR, for Step 6's reason:
a stranger's branch is not readied, not updated, and not merged.

Exit codes:
    0  merged
    1  blocked — a check failed, the PR is not ours, or `gh` could not answer
    3  green, but no review at `.claude/reviews/<N>.md` — write it and re-run

Every step is idempotent, so re-running after a 3 (or a fixed 1) picks up where
it stopped.

Usage:
    /usr/bin/python3 scripts/merge_pr.py <pr-number>
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "hooks"))

import guard_pr_merge as guard  # noqa: E402

POLL_SECONDS = 20
CHECKS_TIMEOUT_SECONDS = 45 * 60
HEAD_MOVE_TIMEOUT_SECONDS = 90

#: Conclusions a re-run will not turn green by waiting.
FAILED = {"FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR"}

MERGED, BLOCKED, NEEDS_REVIEW = 0, 1, 3


def checks_state(checks: dict[str, str], required: list[str]) -> tuple[str, list[str]]:
    """`("green" | "failed" | "pending", the checks that make it so)`.

    Pure. `checks` is head-scoped (see the hook's `_rollup`), so a required
    check that is absent has simply not reported for this commit yet.
    """
    failed = [name for name in required if checks.get(name) in FAILED]
    if failed:
        return "failed", failed
    pending = [name for name in required if checks.get(name) != "SUCCESS"]
    return ("pending", pending) if pending else ("green", [])


def _view(number: str) -> dict:
    return json.loads(
        guard._gh("pr", "view", number, "--json", "state,isDraft,headRefOid,baseRefName")
    )


def _update_branch(number: str, view: dict) -> None:
    """Bring the PR up to date with its base, and wait for the new head."""
    repo = guard._gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner").strip()
    behind = guard._gh(
        "api",
        f"repos/{repo}/compare/{view['baseRefName']}...{view['headRefOid']}",
        "--jq",
        ".behind_by",
    ).strip()
    if behind == "0":
        return
    guard._gh("pr", "update-branch", number)
    # The update is asynchronous; reading checks before the head moves would
    # read the old commit's green run — the stale-`--watch` trap.
    deadline = time.monotonic() + HEAD_MOVE_TIMEOUT_SECONDS
    while _view(number)["headRefOid"] == view["headRefOid"]:
        if time.monotonic() > deadline:
            raise RuntimeError("update-branch was accepted but the head never moved")
        time.sleep(3)


def _wait_for_green(number: str, root: Path) -> str | None:
    """Block until required checks settle. Returns why not, or None when green."""
    deadline = time.monotonic() + CHECKS_TIMEOUT_SECONDS
    while True:
        pull_request, _, required = guard._fetch(number, root)
        if not required:
            return "branch protection reported no required checks"
        state, names = checks_state(pull_request.checks, required)
        if state == "green":
            return None
        if state == "failed":
            return (
                f"required checks failed: {', '.join(names)}. "
                "Read `gh run view <run-id> --log-failed` before reacting."
            )
        if time.monotonic() > deadline:
            return f"timed out waiting for: {', '.join(names)}"
        time.sleep(POLL_SECONDS)


def land(number: str) -> tuple[int, str]:
    # Same root the hook resolves, so both look for the review in one place.
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
    review = root / guard.REVIEW_DIR / f"{number}.md"

    pull_request, owner, _ = guard._fetch(number, root)
    if pull_request.author != owner or pull_request.head_owner != owner:
        return BLOCKED, guard.blocking_reason(number, pull_request, owner, [], review) or ""

    view = _view(number)
    if view["state"] != "OPEN":
        return BLOCKED, f"PR #{number} is {view['state']}, not open."
    if view["isDraft"]:
        guard._gh("pr", "ready", number)
    _update_branch(number, view)

    reason = _wait_for_green(number, root)
    if reason:
        return BLOCKED, f"PR #{number}: {reason}"

    if not review.is_file() or not review.read_text(encoding="utf-8").strip():
        return NEEDS_REVIEW, (
            f"PR #{number} is green on its current head. No review at `{review}` — "
            f"run `/code-review {number}`, write its findings there, and re-run this."
        )

    command = f"gh pr merge {number} --squash --delete-branch"
    reason = guard.decide({"tool_name": "Bash", "tool_input": {"command": command}})
    if reason:
        return BLOCKED, reason

    merged = subprocess.run(command.split(), capture_output=True, text=True, timeout=120)
    if merged.returncode != 0:
        return BLOCKED, f"`{command}` failed: {merged.stderr.strip()}"
    subprocess.run(["git", "fetch", "-q", "origin", pull_request.base_ref], timeout=120)
    return MERGED, f"Merged PR #{number}; origin/{pull_request.base_ref} re-fetched."


def main(argv: list[str]) -> int:
    if len(argv) != 2 or not argv[1].isdigit():
        print(__doc__.rsplit("Usage:", 1)[1].strip(), file=sys.stderr)
        return BLOCKED
    try:
        code, message = land(argv[1])
    except Exception as error:  # noqa: BLE001 - anything unanswered is a refusal
        code, message = BLOCKED, f"PR #{argv[1]}: {error}"
    print(message)
    return code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
