"""Regression check for the stderr classifier in `provision-hetzner.sh` (#3052).

Stage 3 of the wizard used to collapse every SSH failure into "refused your
key" and tell the operator to recreate the server. That is actively harmful
for one specific case: recreating a Hetzner server can hand the same IPv4 a
*different* host key, which makes ssh refuse the connection before
authentication is even attempted -- a stale `~/.ssh/known_hosts` entry, not a
rejected key. Recreating the server again is what CAUSES that stale entry, so
the old advice looped.

The fix lives entirely in one seam: `classify_ssh_failure()`, a pure shell
function that takes ssh's captured stderr and returns which case it was. This
test drives it via `--self-test`, the flag the script exposes specifically so
its own fixture checks can run without a server (see the function's docstring
comment in `scripts/provision-hetzner.sh`).

These tests live in `backend/tests/` for the same reason as
`test_pr_merge_guard.py` and `test_issue_comment_guard.py`: `pytest` is only
run from `backend/` in CI (`.github/workflows/test.yml`), and there is no
shell-test runner in this repo to add one for. Asserting on the self-test's
own stdout (not just its exit code) is what keeps this from being fooled by a
`--self-test` block that stops actually checking anything.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPT = REPO_ROOT / "scripts" / "provision-hetzner.sh"


def run_self_test() -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", str(SCRIPT), "--self-test"],
        capture_output=True,
        text=True,
        timeout=10,
    )


def test_the_script_exists_and_is_executable():
    assert SCRIPT.is_file(), SCRIPT
    if sys.platform != "win32":
        assert SCRIPT.stat().st_mode & 0o111, "provision-hetzner.sh must stay +x"


def test_self_test_exits_zero_and_reports_all_checks_passed():
    result = run_self_test()
    assert result.returncode == 0, result.stdout + result.stderr
    assert "self-test: all 3 checks passed" in result.stdout


def test_a_changed_host_key_is_told_apart_from_a_rejected_key():
    """The real symptom from #3052: ssh's actual 'Offending ED25519 key' text."""
    result = run_self_test()
    assert "ok   - a changed host key reads as stale, not a rejected key" in result.stdout


def test_a_genuine_publickey_rejection_is_still_a_rejection():
    """A real 'Permission denied (publickey)' must not be reclassified as stale."""
    result = run_self_test()
    assert "ok   - a genuine publickey rejection stays a rejection" in result.stdout


def test_no_check_failed():
    result = run_self_test()
    assert "FAIL" not in result.stdout
    assert "FAIL" not in result.stderr
