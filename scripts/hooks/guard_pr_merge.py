"""PreToolUse hook: gate `gh pr merge` on the three things a merge assumes.

A merge to `main` deploys to dev. `/merge-bot` Step 2's preconditions held only
as long as the model's attention did (a run once claimed "code reviewed" with no
review), so they live here instead of in prose. Checked in order:

1. **Ownership.** PR author *and* head repo owner are the repo owner; a fork is
   a stranger's code. First, because nothing else may run against such a PR.
2. **Required checks green on the current head**, read live from branch
   protection (written lists rotted, #1584). `statusCheckRollup` is head-scoped,
   so an older push's green run is absent (the stale-`--watch` trap).
3. **A review artifact exists**: `.claude/reviews/<N>.md`, non-empty.

Denies whenever it cannot answer (gh failure, timeout, bad payload).

# ponytail: gate 3 is a sentinel, not a proof. If thin files become the dodge,
# have `/code-review` write the file with the head SHA and check that SHA here.

INSTALL
-------
Merge into `.claude/settings.json`:

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python \"$CLAUDE_PROJECT_DIR/scripts/hooks/deny_raw_issue_comments.py\""
          },
          {
            "type": "command",
            "command": "python \"$CLAUDE_PROJECT_DIR/scripts/hooks/guard_pr_merge.py\""
          }
        ]
      }
    ]
  }
}

Verify in a *new* session:

    gh pr merge 1 --squash        # must be denied (no review artifact)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

GH_TIMEOUT_SECONDS = 20

REVIEW_DIR = Path(".claude") / "reviews"

#: Only at command position, so text *about* merging (close-outs, comments) passes.
#: The PR number is required here even though `gh` would infer it.
# ponytail: command position by separator, not a shell parse. `echo "a && gh pr
# merge 1"` still matches. Reach for a real tokenizer only if that shows up.
MERGE_CALL = re.compile(r"(?:^|[;&|]|\n)\s*gh\s+pr\s+merge\b([^|;&]*)")
PR_NUMBER = re.compile(r"(?<![\w/#-])(\d+)(?![\w-])")

#: Refused: every fact here is gathered from the working tree's repo.
CROSS_REPO = re.compile(r"(?:^|\s)(?:-R|--repo)(?:[=\s]|$)")


@dataclass(frozen=True)
class PullRequest:
    author: str
    head_owner: str
    base_ref: str
    #: check name -> conclusion, upper-cased, for the current head commit only
    checks: dict[str, str]


def merge_arguments(tool_name: str, command: str) -> list[str]:
    if tool_name != "Bash":
        return []
    return MERGE_CALL.findall(command)


def target_of(arguments: str) -> str | None:
    found = PR_NUMBER.findall(arguments)
    return found[0] if len(found) == 1 else None


def blocking_reason(
    number: str,
    pull_request: PullRequest,
    repo_owner: str,
    required: list[str],
    review: Path,
) -> str | None:
    """Why this merge must not proceed, or None. Pure, for testability."""
    if pull_request.author != repo_owner or pull_request.head_owner != repo_owner:
        return (
            f"PR #{number} was authored by `{pull_request.author}` from "
            f"`{pull_request.head_owner}`, not `{repo_owner}`. This repo is "
            "public and a merge to `main` ships to dev, so merging it runs a "
            "stranger's branch on dev and puts it on `main` for the next "
            "production tag. Do not merge it, do not check "
            "it out, and do not run its gates — report it as an unexpected PR."
        )

    if not required:
        return (
            f"Branch protection on `{pull_request.base_ref}` reported no "
            "required checks, so there is nothing to verify green against. "
            "Confirm protection is still configured before merging."
        )

    unmet = [
        f"{name} ({pull_request.checks.get(name, 'absent')})"
        for name in required
        if pull_request.checks.get(name) != "SUCCESS"
    ]
    if unmet:
        return (
            f"PR #{number} has required checks that are not green on its "
            f"current head: {', '.join(unmet)}. `absent` means no run for this "
            "head commit — an older green run does not carry over, so push or "
            "`gh pr update-branch` and wait for the new run."
        )

    if not review.is_file() or not review.read_text(encoding="utf-8").strip():
        return (
            f"No review artifact for PR #{number} at `{review}`. CI green is "
            "not review. Dispatch the `reviewer` agent for {n}, or write findings — or "
            "the words `no findings` — to that file before merging.".replace(
                "{n}", number
            )
        )

    return None


def _gh(*arguments: str) -> str:
    result = subprocess.run(
        ["gh", *arguments],
        capture_output=True,
        text=True,
        timeout=GH_TIMEOUT_SECONDS,
    )
    if result.returncode != 0:
        call = " ".join(arguments)
        raise RuntimeError(f"`gh {call}` failed: {result.stderr.strip()}")
    return result.stdout


def _rollup(entries: object) -> dict[str, str]:
    """Flatten `statusCheckRollup` — check runs and legacy statuses alike."""
    checks: dict[str, str] = {}
    if not isinstance(entries, list):
        return checks
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("context")
        verdict = entry.get("conclusion") or entry.get("state")
        if name and verdict:
            checks[str(name)] = str(verdict).upper()
    return checks


def _fetch(number: str, project_root: Path) -> tuple[PullRequest, str, list[str]]:
    repo = json.loads(_gh("repo", "view", "--json", "owner,name"))
    owner = str(repo["owner"]["login"])

    raw = json.loads(
        _gh(
            "pr",
            "view",
            number,
            "--json",
            "author,headRepositoryOwner,baseRefName,statusCheckRollup",
        )
    )
    pull_request = PullRequest(
        author=str((raw.get("author") or {}).get("login", "")),
        head_owner=str((raw.get("headRepositoryOwner") or {}).get("login", "")),
        base_ref=str(raw.get("baseRefName", "")),
        checks=_rollup(raw.get("statusCheckRollup")),
    )

    contexts = json.loads(
        _gh(
            "api",
            f"repos/{owner}/{repo['name']}/branches/"
            f"{pull_request.base_ref}/protection/required_status_checks",
            "--jq",
            ".contexts",
        )
    )
    required = [str(c) for c in contexts] if isinstance(contexts, list) else []

    _ = project_root
    return pull_request, owner, required


def decide(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return "Hook payload was not an object, so it cannot clear this merge."

    tool_name = str(payload.get("tool_name", ""))
    command = str((payload.get("tool_input") or {}).get("command", ""))
    calls = merge_arguments(tool_name, command)
    if not calls:
        return None

    project_root = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()

    for arguments in calls:
        if CROSS_REPO.search(arguments):
            return (
                "`gh pr merge` with `--repo` targets a repository other than "
                "this working tree, so this guard cannot verify ownership, "
                "checks, or review for it. Run the merge from that repo."
            )
        number = target_of(arguments)
        if number is None:
            return (
                "`gh pr merge` did not name exactly one PR number. Name it "
                "explicitly — a merge this guard cannot identify is a merge "
                "it cannot gate, and `main` ships to dev."
            )
        try:
            pull_request, owner, required = _fetch(number, project_root)
        except Exception as error:  # noqa: BLE001 - see docstring: deny on error
            return (
                f"Could not establish whether PR #{number} is safe to merge "
                f"({error}), so this guard cannot clear it."
            )
        reason = blocking_reason(
            number,
            pull_request,
            owner,
            required,
            project_root / REVIEW_DIR / f"{number}.md",
        )
        if reason is not None:
            return reason

    return None


def main() -> int:
    try:
        reason = decide(json.load(sys.stdin))
    except Exception as error:  # noqa: BLE001 - see docstring: deny on error
        reason = (
            f"Hook could not read its own input ({error}), so it cannot clear "
            "this call. See scripts/hooks/guard_pr_merge.py."
        )

    # Silence defers to the normal permission flow; "allow" would skip it.
    if reason is None:
        return 0

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
