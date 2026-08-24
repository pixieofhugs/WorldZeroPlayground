"""Guard: `docs/adr/` can answer "which of these are still rules" (#2536).

Sits beside `test_adr_numbers_are_unique.py`, which walks the same directory for
a different failure. That one catches two records claiming one number; this one
catches a record whose *standing* is unreadable.

Three claims, and the third is the one that makes the index worth having:

1. every numbered ADR opens with a parseable `**Status:**` / `**Date:**` block;
2. every `Superseded by` / `Amended by` names a record that exists;
3. `docs/adr/README.md` is what `scripts/adr_index.py` would write today.

Without (3) the index is just another hand-maintained file that drifts, which is
the exact failure the ADR status lines had already suffered before #2536.
"""

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "scripts"))

import adr_index  # noqa: E402  (needs the sys.path line above)


@pytest.fixture(scope="module")
def adrs() -> list[adr_index.Adr]:
    """Every numbered ADR, parsed. Fails loudly on the first malformed header."""
    paths = sorted(adr_index.ADR_DIR.glob(adr_index.NUMBERED_GLOB))
    assert paths, f"no numbered ADRs found under {adr_index.ADR_DIR}"

    parsed, broken = [], []
    for path in paths:
        try:
            parsed.append(adr_index.parse(path))
        except adr_index.AdrFormatError as exc:
            broken.append(str(exc))

    assert not broken, "ADRs with an unreadable status block:\n" + "\n".join(broken)
    return parsed


def test_every_adr_declares_a_parseable_status(adrs: list[adr_index.Adr]) -> None:
    # The fixture raises on a bad header; this asserts the corpus is non-trivial
    # so a glob that silently matched nothing cannot pass vacuously.
    assert len(adrs) >= 84, f"expected the full corpus, parsed only {len(adrs)}"


def test_every_supersession_names_a_record_that_exists(
    adrs: list[adr_index.Adr],
) -> None:
    known = {adr.number for adr in adrs}
    dangling = {
        adr.filename: [f"ADR-{n}" for n in adr.refs if n not in known]
        for adr in adrs
        if any(n not in known for n in adr.refs)
    }
    assert not dangling, (
        "a status line points at an ADR number with no file behind it - fix the "
        f"reference, do not renumber the target: {dangling}"
    )


def test_no_record_points_at_itself(adrs: list[adr_index.Adr]) -> None:
    circular = {a.filename: a.status for a in adrs if a.number in a.refs}
    assert not circular, f"an ADR cannot supersede or amend itself: {circular}"


def test_readme_is_what_the_generator_would_write(adrs: list[adr_index.Adr]) -> None:
    assert adr_index.INDEX_PATH.exists(), (
        f"{adr_index.INDEX_PATH} is missing - run `python scripts/adr_index.py`"
    )
    expected = adr_index.render(adrs)
    actual = adr_index.INDEX_PATH.read_text(encoding="utf-8")
    assert actual == expected, (
        "docs/adr/README.md is stale - it is generated, never hand-written. "
        "Run `python scripts/adr_index.py` and commit the result."
    )
