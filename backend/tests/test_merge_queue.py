"""`merge_pr.py` queue: the same `land` in a loop, stopping at the first failure."""

from __future__ import annotations

import fcntl
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "scripts"))

import merge_pr  # noqa: E402
from merge_pr import guard  # noqa: E402


def test_queue_stops_at_first_failure_and_uses_its_exit_code(tmp_path, capsys):
    seen = []

    def fake_land(number, say):
        seen.append(number)
        say("merging")
        merged = {"1": (merge_pr.MERGED, "ok")}
        return merged.get(number, (merge_pr.NEEDS_REVIEW, "no review"))

    code = merge_pr.run_queue(["1", "2", "3"], land_fn=fake_land, root=tmp_path)

    assert code == merge_pr.NEEDS_REVIEW
    assert seen == ["1", "2"]  # 3 never ran
    assert "#1: merging" in capsys.readouterr().out
    assert (tmp_path / ".claude" / "merge-queue.lock").exists()


def test_queue_prints_failing_ci_lines_then_stops(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(merge_pr, "failed_lines", lambda n: ["FAILED test_x - boom"])

    def land(n, say):
        return merge_pr.BLOCKED, f"PR #{n}: required checks failed: test"

    code = merge_pr.run_queue(["5", "6"], land_fn=land, root=tmp_path)
    assert code == merge_pr.BLOCKED
    out = capsys.readouterr().out
    assert "FAILED test_x - boom" in out
    assert "#6" not in out


def test_failed_lines_keeps_only_failed_and_E_lines(monkeypatch):
    log = (
        "job\tstep\t2026-01-01T00:00:00Z noise\n"
        "job\tstep\t2026-01-01T00:00:01Z E   assert 1 == 2\n"
        "job\tstep\tFAILED a::b"
    )
    monkeypatch.setattr(merge_pr, "_view", lambda n: {"headRefOid": "abc"})
    runs = '[{"databaseId": 9, "conclusion": "FAILURE"}]'
    monkeypatch.setattr(guard, "_gh", lambda *a: runs if a[1] == "list" else log)
    assert len(merge_pr.failed_lines("5")) == 2


def test_read_queue_takes_numbers_and_skips_comments(tmp_path):
    f = tmp_path / "q"
    f.write_text("# wave 2\n12\n#34 later\n\nnotes\n")
    assert merge_pr.read_queue(str(f)) == ["12", "34"]


def test_a_second_queue_waits_while_the_first_holds_the_lock(tmp_path):
    lock_path = tmp_path / ".claude" / "merge-queue.lock"
    lock_path.parent.mkdir(parents=True)
    landed: list[str] = []
    with open(lock_path, "w") as held:
        fcntl.flock(held, fcntl.LOCK_EX)
        queue = threading.Thread(
            target=merge_pr.run_queue,
            args=(["9"],),
            kwargs={"land_fn": lambda n, say: landed.append(n) or (merge_pr.MERGED, "ok"), "root": tmp_path},
        )
        queue.start()
        time.sleep(0.3)
        assert landed == []  # blocked on the lock
    queue.join(timeout=5)
    assert landed == ["9"]


def test_main_routes_argv_to_the_queue_or_to_bare_land(monkeypatch, tmp_path, capsys):
    calls = []
    monkeypatch.setattr(merge_pr, "run_queue", lambda numbers: calls.append(("queue", numbers)) or 0)
    monkeypatch.setattr(merge_pr, "land", lambda n: calls.append(("land", n)) or (merge_pr.MERGED, "ok"))
    file = tmp_path / "q"
    file.write_text("4\n5\n")

    assert merge_pr.main(["x", "--queue", str(file)]) == 0
    assert merge_pr.main(["x", "1", "2"]) == 0
    assert merge_pr.main(["x", "3"]) == 0
    assert calls == [("queue", ["4", "5"]), ("queue", ["1", "2"]), ("land", "3")]

    for argv in (["x", "--queue"], ["x", "--queue", "1", "2"], ["x"], ["x", "abc"]):
        assert merge_pr.main(argv) == merge_pr.BLOCKED
    assert len(calls) == 3
    assert "Usage" not in capsys.readouterr().out  # usage goes to stderr
