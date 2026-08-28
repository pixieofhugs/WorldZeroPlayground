"""Guards on the merge boundary: `gh pr merge` is the command that deploys.

`main` auto-deploys, so a merge is a production release. `/builder-bot` Step 6
already states the three preconditions — the PR is ours, its required checks
are green on the current head, and a review actually happened — and a weak
evaluator panel merged anyway while writing "code reviewed" in its close-out.
The prose was correct and the merge still shipped, which is the case for
moving the rule into `scripts/hooks/guard_pr_merge.py`.

The decision under test is :func:`guard_pr_merge.blocking_reason`, which is
pure: every fact it needs is an argument. That is deliberate, so this file can
assert the real gate without a network, a GitHub account, or a live PR. The
protocol tests drive the hook as a subprocess, but only over inputs that are
refused before it would reach out to `gh`.

These tests live in ``backend/tests/`` for the same reason as
``test_issue_comment_guard.py``: pytest is only run from ``backend/`` in CI, and
a guard on a control that no job executes is not a guard.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HOOK_SCRIPT = REPO_ROOT / "scripts" / "hooks" / "guard_pr_merge.py"

sys.path.insert(0, str(REPO_ROOT / "scripts" / "hooks"))

import guard_pr_merge  # noqa: E402

OWNER = "pixieofhugs"
REQUIRED = ["test", "api-schema", "frontend"]
ALL_GREEN = {"test": "SUCCESS", "api-schema": "SUCCESS", "frontend": "SUCCESS"}


def a_pull_request(
    author: str = OWNER,
    head_owner: str = OWNER,
    checks: dict[str, str] | None = None,
) -> guard_pr_merge.PullRequest:
    return guard_pr_merge.PullRequest(
        author=author,
        head_owner=head_owner,
        base_ref="main",
        checks=dict(ALL_GREEN if checks is None else checks),
    )


@pytest.fixture
def review(tmp_path: Path) -> Path:
    """A review artifact that exists and says something."""
    path = tmp_path / "3110.md"
    path.write_text("no findings", encoding="utf-8")
    return path


def reason_for(pull_request, review_path, required=None) -> str | None:
    return guard_pr_merge.blocking_reason(
        "3110", pull_request, OWNER, REQUIRED if required is None else required,
        review_path,
    )


# --------------------------------------------------------------------------
# Gate 1 — ownership. The one that stops a stranger's branch deploying.
# --------------------------------------------------------------------------


def test_a_clean_own_pr_with_review_and_green_checks_is_allowed(review):
    assert reason_for(a_pull_request(), review) is None


@pytest.mark.parametrize(
    ("author", "head_owner"),
    [
        ("driveby-dev", "driveby-dev"),  # outside contributor, their fork
        (OWNER, "driveby-dev"),  # our account, a fork's branch
        ("driveby-dev", OWNER),  # someone else's commit on our branch
    ],
)
def test_a_pr_that_is_not_ours_is_denied(author, head_owner, review):
    reason = reason_for(a_pull_request(author=author, head_owner=head_owner), review)
    assert reason is not None
    assert "production deploy" in reason


def test_ownership_is_checked_before_anything_else(tmp_path):
    """Step 6 says do not even run its gates, so ownership must fail first."""
    reason = reason_for(
        a_pull_request(author="driveby-dev", head_owner="driveby-dev", checks={}),
        tmp_path / "absent.md",
    )
    assert reason is not None
    assert "production deploy" in reason
    assert "review" not in reason.lower().split("report")[0]


# --------------------------------------------------------------------------
# Gate 2 — required checks, green, on *this* head.
# --------------------------------------------------------------------------


def test_a_failing_required_check_is_denied(review):
    checks = dict(ALL_GREEN, frontend="FAILURE")
    reason = reason_for(a_pull_request(checks=checks), review)
    assert reason is not None
    assert "frontend (FAILURE)" in reason


def test_a_check_missing_from_this_head_is_denied_as_absent(review):
    """The stale-`--watch` trap: an older green run is simply not in the rollup."""
    checks = {"test": "SUCCESS", "api-schema": "SUCCESS"}
    reason = reason_for(a_pull_request(checks=checks), review)
    assert reason is not None
    assert "frontend (absent)" in reason
    assert "does not carry over" in reason


def test_a_green_check_that_is_not_required_does_not_substitute(review):
    checks = {"test": "SUCCESS", "api-schema": "SUCCESS", "e2e": "SUCCESS"}
    reason = reason_for(a_pull_request(checks=checks), review)
    assert reason is not None
    assert "frontend (absent)" in reason


def test_unreadable_protection_denies_rather_than_waving_through(review):
    """No required list means nothing to verify against, which is not a pass."""
    reason = reason_for(a_pull_request(), review, required=[])
    assert reason is not None
    assert "no required checks" in reason


# --------------------------------------------------------------------------
# Gate 3 — the review left something behind.
# --------------------------------------------------------------------------


def test_a_missing_review_artifact_is_denied(tmp_path):
    reason = reason_for(a_pull_request(), tmp_path / "3110.md")
    assert reason is not None
    assert "CI green is not review" in reason
    assert "/code-review 3110" in reason


def test_an_empty_review_artifact_does_not_count(tmp_path):
    path = tmp_path / "3110.md"
    path.write_text("   \n\n  ", encoding="utf-8")
    reason = reason_for(a_pull_request(), path)
    assert reason is not None
    assert "CI green is not review" in reason


# --------------------------------------------------------------------------
# Parsing: which calls are merges, and which PR do they name?
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "command",
    [
        "gh pr merge 3110 --squash --delete-branch",
        "git fetch origin main && gh pr merge 3110 --squash",
        "gh  pr   merge 3110",
    ],
)
def test_merge_calls_are_recognised(command):
    assert guard_pr_merge.merge_arguments("Bash", command)


@pytest.mark.parametrize(
    "command",
    [
        "gh pr list --state open",
        "gh pr checks 3110 --watch",
        "gh pr ready 3110",
    ],
)
def test_non_merge_calls_are_left_alone(command):
    assert guard_pr_merge.merge_arguments("Bash", command) == []


@pytest.mark.parametrize(
    "command",
    [
        "echo 'run gh pr merge 3110 next' >> notes.md",
        'gh issue comment 7 --body "then gh pr merge 3110 --squash"',
    ],
)
def test_writing_about_a_merge_is_not_a_merge(command):
    """The close-outs and issue comments these skills write name the command.

    Denying those too is how a guard earns a reputation for crying wolf, and a
    guard someone has switched off protects nothing.
    """
    assert guard_pr_merge.merge_arguments("Bash", command) == []


def test_a_non_bash_tool_is_left_alone():
    assert guard_pr_merge.merge_arguments("Read", "gh pr merge 3110") == []


def test_every_merge_in_a_chained_command_is_seen():
    calls = guard_pr_merge.merge_arguments(
        "Bash", "gh pr merge 3110 --squash && gh pr merge 3112 --squash"
    )
    assert len(calls) == 2
    assert [guard_pr_merge.target_of(c) for c in calls] == ["3110", "3112"]


@pytest.mark.parametrize(
    ("arguments", "expected"),
    [
        (" 3110 --squash --delete-branch", "3110"),
        (" --squash", None),  # bare merge: resolves a PR this guard cannot name
        (" 3110 3112", None),  # ambiguous
    ],
)
def test_the_named_pr_is_extracted_or_refused(arguments, expected):
    assert guard_pr_merge.target_of(arguments) == expected


def test_rollup_flattens_check_runs_and_legacy_statuses():
    flattened = guard_pr_merge._rollup(
        [
            {"__typename": "CheckRun", "name": "test", "conclusion": "success"},
            {"__typename": "StatusContext", "context": "frontend", "state": "failure"},
            {"noise": True},
        ]
    )
    assert flattened == {"test": "SUCCESS", "frontend": "FAILURE"}


# --------------------------------------------------------------------------
# The protocol: stdin JSON in, a permission decision out. No network reached.
# --------------------------------------------------------------------------


def run_hook(payload: str) -> dict | None:
    result = subprocess.run(
        [sys.executable, str(HOOK_SCRIPT)],
        input=payload,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout) if result.stdout.strip() else None


def decision_for(command: str, tool_name: str = "Bash") -> str | None:
    emitted = run_hook(
        json.dumps(
            {
                "hook_event_name": "PreToolUse",
                "tool_name": tool_name,
                "tool_input": {"command": command},
            }
        )
    )
    if emitted is None:
        return None
    output = emitted["hookSpecificOutput"]
    assert output["hookEventName"] == "PreToolUse"
    return output["permissionDecision"]


def test_an_unrelated_command_is_met_with_silence():
    assert decision_for("gh pr list --state open") is None


def test_a_bare_merge_is_denied_without_reaching_the_network():
    assert decision_for("gh pr merge --squash") == "deny"


def test_a_cross_repo_merge_is_denied():
    assert decision_for("gh pr merge 3110 -R other/repo --squash") == "deny"


def test_an_unparseable_payload_denies():
    emitted = run_hook("not json at all")
    assert emitted is not None
    assert emitted["hookSpecificOutput"]["permissionDecision"] == "deny"


def test_the_hook_never_emits_allow():
    """An explicit allow would wave Bash past the user's own permission prompt."""
    assert run_hook(
        json.dumps(
            {
                "hook_event_name": "PreToolUse",
                "tool_name": "Bash",
                "tool_input": {"command": "ls -la"},
            }
        )
    ) is None
