"""The ratchet: ruff findings in the backend may only shrink (#2427).

No CI step (workflows are owner-only), so this test *is* the gate. Compared in
both directions. The rest guards the instrument: uninstalling ruff, ``ignore``,
``per-file-ignores``, excludes, or bare ``# noqa`` would all fake progress.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from tests.unit.ruff_allowlist import RUFF_ALLOWLIST, RUFF_FINDING_TOTAL
from tests.unit.ruff_scan import BACKEND_ROOT, run_ruff, scan_backend, tally

PYPROJECT = BACKEND_ROOT / "pyproject.toml"

#: The narrow set ruff landed with (#2427). Widening it is a one-line change to
#: pyproject.toml *and* here, so it is reviewable.
EXPECTED_SELECT = ["E", "F", "I"]


@pytest.fixture(scope="module")
def actual() -> dict[str, int]:
    """One ruff run for the whole module: it is a subprocess."""
    return dict(scan_backend())


def test_allowlist_total_matches_its_entries() -> None:
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


# The instrument: cheap ways to make the number go down without fixing


def _ruff_config() -> dict:
    return tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["tool"]["ruff"]


def test_the_selected_rules_are_the_ones_that_landed() -> None:
    assert _ruff_config()["lint"]["select"] == EXPECTED_SELECT


def test_no_rule_is_switched_off_wholesale() -> None:
    """Grandfathering belongs in ``ruff_allowlist.py``, counted and shrinking."""
    lint = _ruff_config()["lint"]
    assert "ignore" not in lint
    assert "extend-ignore" not in lint
    assert "per-file-ignores" not in lint


def test_no_directory_is_excluded_from_the_scan(actual: dict[str, int]) -> None:
    """Ruff's defaults already cover ``.venv`` etc.; anything added drops findings."""
    config = _ruff_config()
    assert "exclude" not in config
    assert "extend-exclude" not in config

    scanned = {key.split("/", 1)[0] for key in actual}
    assert {"routers", "services", "tests", "models", "schemas"} <= scanned


def test_a_missing_ruff_fails_loudly_rather_than_reading_as_clean(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("tests.unit.ruff_scan.ruff_is_installed", lambda: False)
    with pytest.raises(RuntimeError, match="not installed"):
        run_ruff()


def test_bare_noqa_would_launder_a_finding_and_is_not_used() -> None:
    """A bare noqa silences every rule invisibly. This file only writes about it."""
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
    assert sum(actual.values()) == len(run_ruff())
    assert tally([]) == {}
