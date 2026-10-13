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
    3  green, but not reviewed at this head — get the review and re-run

**The review file is the whole merge decision here**, where for a hand-typed
`gh pr merge` it is only a backstop behind the model that read the review. So
this script asks more of it than the hook does: its first line must name the
commit that was reviewed, nothing but `update-branch` merges may have landed
since, and no line may carry the word `BLOCKING`. A review that blocks, or one
written for a head that has since been fixed, does not merge.

Every step is idempotent, so re-running after a 3 (or a fixed 1) picks up where
it stopped.

Usage:
    /usr/bin/python3 scripts/merge_pr.py <pr-number>
"""

from __future__ import annotations

import json
import os
import re
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
FAILED = {
    "FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR",
    "SKIPPED", "NEUTRAL", "STALE",
}  # fmt: skip

#: Consecutive `gh` failures tolerated while polling; one blip in a 45-minute
#: wait is a network, not a verdict.
POLL_RETRIES = 3

REVIEWED_SHA = re.compile(r"\b[0-9a-f]{40}\b")

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
    blips = 0
    while True:
        try:
            pull_request, _, required = guard._fetch(number, root)
            blips = 0
        except Exception:  # noqa: BLE001 - retried, then re-raised
            blips += 1
            if blips > POLL_RETRIES:
                raise
            time.sleep(POLL_SECONDS)
            continue
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


def _unreviewed(reviewed: str, head: str, base: str) -> list[str]:
    """Commits on the PR since `reviewed` that are neither merges nor the base's own."""
    subprocess.run(["git", "fetch", "-q", "origin", head, base], check=True, timeout=120)
    listed = subprocess.run(
        ["git", "rev-list", "--no-merges", f"{reviewed}..{head}", f"^origin/{base}"],
        capture_output=True, text=True, check=True, timeout=60,
    )  # fmt: skip
    return listed.stdout.split()


def review_refusal(number: str, text: str, unreviewed_since) -> tuple[int, str] | None:
    """Why this review does not clear the merge, or None when it does.

    `unreviewed_since(sha)` lists the PR's own commits after `sha`; it is an
    argument so the decision is testable without a repository.
    """
    again = f"dispatch the `reviewer` agent for #{number}, then re-run this."
    if not text.strip():
        return NEEDS_REVIEW, f"PR #{number} is green on its current head. No review yet — {again}"
    lines = text.strip().splitlines()
    named = REVIEWED_SHA.search(lines[0])
    if not named:
        return NEEDS_REVIEW, (
            f"The review for PR #{number} does not name the commit it read on its first "
            f"line (`PR #{number} @ <sha>`), so it cannot be matched to this head — {again}"
        )
    # A plain substring, so `- BLOCKING`, `**BLOCKING**` and `__BLOCKING__` all block.
    if any("BLOCKING" in line for line in lines):
        return BLOCKED, (
            f"The review for PR #{number} has BLOCKING findings. Fix them and have it "
            "reviewed again; a finding you believe is wrong goes to the user, not past this."
        )
    # shortcut: a hand-made merge commit that smuggles its own edits reads as reviewed;
    # upgrade to comparing trees if writers ever start merging by hand.
    unreviewed = unreviewed_since(named.group())
    if unreviewed:
        return NEEDS_REVIEW, (
            f"PR #{number} has {len(unreviewed)} commit(s) the review never saw "
            f"({unreviewed[0][:9]}…) — {again}"
        )
    return None


def land(number: str) -> tuple[int, str]:
    # Same root the hook resolves, so both look for the review in one place.
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
    review = root / guard.REVIEW_DIR / f"{number}.md"

    pull_request, owner, _ = guard._fetch(number, root)
    if pull_request.author != owner or pull_request.head_owner != owner:
        return BLOCKED, guard.blocking_reason(number, pull_request, owner, [], review) or ""

    view = _view(number)
    if view["state"] == "MERGED":
        return MERGED, f"PR #{number} is already merged."
    if view["state"] != "OPEN":
        return BLOCKED, f"PR #{number} is {view['state']}, not open."
    if view["isDraft"]:
        guard._gh("pr", "ready", number)
    _update_branch(number, view)

    reason = _wait_for_green(number, root)
    if reason:
        return BLOCKED, f"PR #{number}: {reason}"

    head = _view(number)["headRefOid"]
    refusal = review_refusal(
        number,
        review.read_text(encoding="utf-8") if review.is_file() else "",
        lambda reviewed: _unreviewed(reviewed, head, pull_request.base_ref),
    )
    if refusal:
        return refusal

    command = f"gh pr merge {number} --squash --delete-branch"
    reason = guard.decide({"tool_name": "Bash", "tool_input": {"command": command}})
    if reason:
        return BLOCKED, reason

    # Pinned to the head the review and the gate just cleared.
    merged = subprocess.run(
        [*command.split(), "--match-head-commit", head],
        capture_output=True, text=True, timeout=120,
    )  # fmt: skip
    # `gh` can exit non-zero after the merge landed (a local branch it could not
    # delete), so the PR's own state is the answer, not the exit code.
    if merged.returncode != 0 and _view(number)["state"] != "MERGED":
        return BLOCKED, f"`{command}` failed: {merged.stderr.strip()}"
    fetched = subprocess.run(["git", "fetch", "-q", "origin", pull_request.base_ref], timeout=120)
    tail = "re-fetched" if fetched.returncode == 0 else "NOT re-fetched — fetch it yourself"
    return MERGED, f"Merged PR #{number}; origin/{pull_request.base_ref} {tail}."


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
