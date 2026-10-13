"""`scripts/merge_pr.py` merges without passing the PreToolUse hook, so it must
ask the hook's own gate itself. These tests hold that line.

Lives in ``backend/tests/`` for the same reason as ``test_pr_merge_guard.py``.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import merge_pr  # noqa: E402
from merge_pr import guard  # noqa: E402

OWNER = "pixieofhugs"
REQUIRED = ["test", "api-schema", "frontend"]
GREEN = dict.fromkeys(REQUIRED, "SUCCESS")


def test_checks_state_reads_absent_as_pending_and_failure_as_failed():
    assert merge_pr.checks_state(GREEN, REQUIRED) == ("green", [])
    assert merge_pr.checks_state({"test": "SUCCESS"}, REQUIRED) == (
        "pending",
        ["api-schema", "frontend"],
    )
    assert merge_pr.checks_state({**GREEN, "frontend": "FAILURE"}, REQUIRED) == (
        "failed",
        ["frontend"],
    )


def _wire(monkeypatch, tmp_path, author=OWNER, decide=None):
    """Stub every `gh` call; return the list of commands that were shelled out."""
    ran: list[str] = []
    pull_request = guard.PullRequest(
        author=author, head_owner=author, base_ref="main", checks=GREEN
    )
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path))
    monkeypatch.setattr(guard, "_fetch", lambda n, root: (pull_request, OWNER, REQUIRED))
    monkeypatch.setattr(guard, "_gh", lambda *a: ran.append(" ".join(a)) or "")
    monkeypatch.setattr(
        merge_pr,
        "_view",
        lambda n: {"state": "OPEN", "isDraft": False, "headRefOid": "abc", "baseRefName": "main"},
    )
    monkeypatch.setattr(merge_pr, "_update_branch", lambda n, view: None)
    if decide is not None:
        monkeypatch.setattr(guard, "decide", decide)

    def run(command, **_):
        ran.append(" ".join(command))
        return type("Done", (), {"returncode": 0, "stderr": ""})()

    monkeypatch.setattr(merge_pr.subprocess, "run", run)
    return ran


def test_a_strangers_pr_is_refused_before_anything_touches_it(monkeypatch, tmp_path):
    ran = _wire(monkeypatch, tmp_path, author="stranger")
    code, message = merge_pr.land("7")
    assert code == merge_pr.BLOCKED and "stranger" in message
    assert ran == []


def test_green_without_a_review_stops_short_of_the_merge(monkeypatch, tmp_path):
    ran = _wire(monkeypatch, tmp_path)
    code, _ = merge_pr.land("7")
    assert code == merge_pr.NEEDS_REVIEW
    assert not any("merge" in command for command in ran)


def test_the_hooks_gate_has_the_last_word(monkeypatch, tmp_path):
    (tmp_path / ".claude" / "reviews").mkdir(parents=True)
    (tmp_path / ".claude" / "reviews" / "7.md").write_text("no findings")

    ran = _wire(monkeypatch, tmp_path, decide=lambda payload: "the hook says no")
    assert merge_pr.land("7") == (merge_pr.BLOCKED, "the hook says no")
    assert not any("merge" in command for command in ran)

    ran = _wire(monkeypatch, tmp_path, decide=lambda payload: None)
    code, _ = merge_pr.land("7")
    assert code == merge_pr.MERGED
    assert "gh pr merge 7 --squash --delete-branch" in ran
