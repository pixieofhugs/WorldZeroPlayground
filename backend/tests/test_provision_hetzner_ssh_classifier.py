"""`classify_ssh_failure()` in `provision-hetzner.sh` tells a stale known_hosts
entry from a rejected key (#3052), via `--self-test`. Asserts on stdout, not just
the exit code, so a self-test that stops checking can't pass.
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


def test_self_test_passes_and_tells_stale_host_key_from_rejected_key():
    """ssh's real 'Offending ED25519 key' text (#3052)."""
    result = run_self_test()
    assert result.returncode == 0, result.stdout + result.stderr
    assert "self-test: all 3 checks passed" in result.stdout
    stale = "ok   - a changed host key reads as stale, not a rejected key"
    assert stale in result.stdout
    assert "ok   - a genuine publickey rejection stays a rejection" in result.stdout
    assert "FAIL" not in result.stdout + result.stderr
