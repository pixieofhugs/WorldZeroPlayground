"""`scripts/local_scout.py` scores the local model against merged PRs.

The score is only worth reading if the two pure pieces under it are right:
pulling paths out of a free-text answer, and counting the overlap.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import local_scout  # noqa: E402


def test_paths_are_read_through_bullets_ticks_and_line_numbers():
    answer = """Here is what I found:
- `backend/services/scoring.py:42` — the formula
* frontend/src/pages/Home.tsx
./scripts/wz_helper.py
README.md
nothing on this line
"""
    assert local_scout.parse_paths(answer) == {
        "backend/services/scoring.py",
        "frontend/src/pages/Home.tsx",
        "scripts/wz_helper.py",
        "README.md",
    }


def test_overlap_counts_found_missed_and_invented():
    predicted = {"a.py", "b.py", "invented.py"}
    actual = {"a.py", "b.py", "c.py", "d.py"}
    assert local_scout.overlap(predicted, actual) == (2, 2, 1)


def test_a_verdict_needs_a_logged_call_and_a_known_ruling(monkeypatch, tmp_path):
    monkeypatch.setattr(local_scout, "LOG", tmp_path / "scout-log.jsonl")
    assert local_scout.verdict("nope", "ok", "") == 1
    local_scout._append({"id": "x1", "kind": "footprint", "issue": "7"})
    assert local_scout.verdict("x1", "maybe", "") == 1
    assert local_scout.verdict("x1", "wrong", "missed the test file") == 0
    assert local_scout._records()[-1]["ruling"] == "wrong"


def test_run_reports_unavailable_when_scout_is_not_installed(monkeypatch):
    monkeypatch.setattr(local_scout.shutil, "which", lambda name: None)
    assert local_scout.run("footprint", "7", "anything") == local_scout.UNAVAILABLE


def _fake_scout(monkeypatch, tmp_path, result):
    monkeypatch.setattr(local_scout, "LOG", tmp_path / "scout-log.jsonl")
    monkeypatch.setattr(local_scout.shutil, "which", lambda name: "/bin/scout")

    def fake_run(*args, **kwargs):
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(local_scout.subprocess, "run", fake_run)


def test_run_maps_scout_exit_2_to_unavailable(monkeypatch, tmp_path):
    done = local_scout.subprocess.CompletedProcess([], 2, "", "no strata")
    _fake_scout(monkeypatch, tmp_path, done)
    assert local_scout.run("footprint", "7", "x") == local_scout.UNAVAILABLE


def test_run_logs_a_successful_call(monkeypatch, tmp_path):
    done = local_scout.subprocess.CompletedProcess([], 0, "a/b.py\n", "")
    _fake_scout(monkeypatch, tmp_path, done)
    assert local_scout.run("footprint", "#7", "x") == 0
    assert local_scout._records()[-1]["issue"] == "7"


def test_run_reports_unavailable_on_timeout(monkeypatch, tmp_path):
    timeout = local_scout.subprocess.TimeoutExpired("scout", 900)
    _fake_scout(monkeypatch, tmp_path, timeout)
    assert local_scout.run("footprint", "7", "x") == local_scout.UNAVAILABLE


def test_score_only_counts_the_issues_asked_for(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(local_scout, "LOG", tmp_path / "scout-log.jsonl")
    for issue in ("7", "8"):
        local_scout._append(
            {"id": f"i{issue}", "kind": "unknown", "issue": issue, "answer": "", "seconds": 1}
        )
    assert local_scout.score(("#7",)) == 0
    assert "1 calls" in capsys.readouterr().out
