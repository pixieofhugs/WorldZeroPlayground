"""The ratchet: ruff findings in the backend may only shrink (#2427).

The seam under test is **the linter's verdict on the shipped tree**, not any
one file's style. There is no CI workflow step — ``.github/workflows/**`` is
owner-only and the ``test`` job already runs pytest — so this test *is* the
gate, on the same precedent as ``test_uncoded_error_ratchet.py`` and
``test_model_conventions.py``.

:func:`test_ruff_findings_match_the_allowlist` is the ratchet proper. It runs
ruff over ``backend/`` and compares the inventory to ``ruff_allowlist`` in
**both directions**, because a one-directional check is not a ratchet:

* the code grew a finding the allowlist does not know about — a regression;
* the allowlist claims findings the code no longer has — the pawl slipped, and
  "we burned down N" stops being a fact about the code.

The rest of the file tests the *instrument*, because every cheap way to make
this test pass without fixing anything runs through the instrument rather than
through the allowlist: uninstall ruff, add an ``ignore``, add a
``per-file-ignores``, exclude a directory, or scatter bare ``# noqa``. Each of
those makes the number go down while the code stays exactly as it was.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from tests.unit.ruff_allowlist import RUFF_ALLOWLIST, RUFF_FINDING_TOTAL
from tests.unit.ruff_scan import BACKEND_ROOT, run_ruff, scan_backend, tally

PYPROJECT = BACKEND_ROOT / "pyproject.toml"

#: The narrow set ruff landed with (#2427). Widening it is a one-line change to
#: pyproject.toml *and* to this constant, in the same commit — which is the
#: point: it makes widening a reviewable decision rather than a quiet one.
EXPECTED_SELECT = ["E", "F", "I"]


@pytest.fixture(scope="module")
def actual() -> dict[str, int]:
    """One ruff run for the whole module — it is a subprocess, not a function."""
    return dict(scan_backend())


# ---------------------------------------------------------------------------
# The ratchet
# ---------------------------------------------------------------------------


def test_allowlist_total_matches_its_entries() -> None:
    """The headline number is the sum of the entries, not a separate claim."""
    assert RUFF_FINDING_TOTAL == sum(RUFF_ALLOWLIST.values())


def test_ruff_findings_match_the_allowlist(actual: dict[str, int]) -> None:
    appeared = sorted(
        f"{key}: {count}"
        for key, count in actual.items()
        if key not in RUFF_ALLOWLIST
    )
    assert not appeared, (
        "New ruff findings in files the allowlist does not cover:\n  "
        + "\n  ".join(appeared)
        + "\n\nFix them — `ruff check --fix` handles F401/F541/F811/I001"
        " automatically — instead of adding them to tests/unit/ruff_allowlist.py."
        " The allowlist only shrinks."
    )

    grew = sorted(
        f'    "{key}": {count},  # was {RUFF_ALLOWLIST[key]}'
        for key, count in actual.items()
        if count > RUFF_ALLOWLIST[key]
    )
    assert not grew, (
        "Ruff findings increased in files that already had some:\n"
        + "\n".join(grew)
        + "\n\nFix the new ones. The allowlist only shrinks."
    )

    shrank = sorted(
        (
            f'    "{key}": {actual.get(key, 0)},  # was {allowed}'
            if actual.get(key, 0)
            else f"    (delete) {key}  # was {allowed}"
        )
        for key, allowed in RUFF_ALLOWLIST.items()
        if actual.get(key, 0) < allowed
    )
    assert not shrank, (
        "The allowlist is stale — these findings are fixed (or the file is"
        " gone) now:\n"
        + "\n".join(shrank)
        + "\n\nApply those edits to tests/unit/ruff_allowlist.py and lower"
        " RUFF_FINDING_TOTAL to match. Shrinking it is the point; leaving it"
        " oversized is what makes 'we burned down N' stop meaning anything."
    )


# ---------------------------------------------------------------------------
# The instrument: every cheap way to make the number go down without fixing
# ---------------------------------------------------------------------------


def _ruff_config() -> dict:
    return tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["tool"]["ruff"]


def test_the_selected_rules_are_the_ones_that_landed() -> None:
    """Narrowing ``select`` would shrink the inventory without fixing anything."""
    assert _ruff_config()["lint"]["select"] == EXPECTED_SELECT


def test_no_rule_is_switched_off_wholesale() -> None:
    """`ignore` / `per-file-ignores` are per-*rule* suppression, not a ratchet.

    Grandfathering belongs in ``ruff_allowlist.py``, where it is per file, per
    code, counted, and can only go down. An entry here would exempt code nobody
    has written yet.
    """
    lint = _ruff_config()["lint"]
    assert "ignore" not in lint
    assert "extend-ignore" not in lint
    assert "per-file-ignores" not in lint


def test_no_directory_is_excluded_from_the_scan(actual: dict[str, int]) -> None:
    """An excluded directory is a rule that is off, not a rule that is satisfied.

    Ruff's built-in default excludes cover ``.venv``/``__pycache__`` and friends
    via ``.gitignore``; anything *added* would silently drop findings. The
    reach assertion is the second half: ``tests/`` is 61% of the seeded
    inventory and the most tempting thing to exclude.
    """
    config = _ruff_config()
    assert "exclude" not in config
    assert "extend-exclude" not in config

    scanned = {key.split("/", 1)[0] for key in actual}
    assert {"routers", "services", "tests", "models", "schemas"} <= scanned


def test_a_missing_ruff_fails_loudly_rather_than_reading_as_clean(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`python -m ruff` with no ruff exits 1 with empty stdout — i.e. "clean"."""
    monkeypatch.setattr("tests.unit.ruff_scan.ruff_is_installed", lambda: False)
    with pytest.raises(RuntimeError, match="not installed"):
        run_ruff()


def test_bare_noqa_would_launder_a_finding_and_is_not_used() -> None:
    """`# noqa` with no code suppresses *everything* on the line, invisibly.

    Every ``noqa`` in the backend today names its rule, so the ratchet can see
    what was silenced. A bare one is the one suppression that leaves no trace
    in this file or in pyproject.toml.

    This file is skipped: it is the only one in the backend that *writes about*
    the token rather than using it, and there is nothing lint-suppressible in a
    file made of assertions.
    """
    this_file = Path(__file__).resolve()
    offenders = [
        f"{path.relative_to(BACKEND_ROOT).as_posix()}:{number}"
        for path in BACKEND_ROOT.rglob("*.py")
        if ".venv" not in path.parts
        and "__pycache__" not in path.parts
        and path.resolve() != this_file
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1)
        if "# noqa" in line and "# noqa:" not in line
    ]
    assert not offenders, (
        "Bare `# noqa` suppresses every rule on the line:\n  "
        + "\n  ".join(offenders)
        + "\n\nName the code: `# noqa: F401 - why`."
    )


def test_the_scan_and_the_tally_agree_on_the_run(actual: dict[str, int]) -> None:
    """A sanity check that the key derivation did not swallow findings."""
    assert sum(actual.values()) == len(run_ruff())
    assert tally([]) == {}
