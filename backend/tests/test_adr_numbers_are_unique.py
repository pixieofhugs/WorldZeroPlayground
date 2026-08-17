"""Guard: no two ADRs in `docs/adr/` claim the same number.

An ADR number is allocated by reading the current contents of `docs/adr/` for
the next free one. Two branches doing that concurrently both see the same
highest number and both claim its successor; each PR is green in isolation and
the collision only exists once they land together on `main`. That is exactly
how `main` came to carry two ADR-0077s (#1985).

The directory listing is the registry, so the listing is where the check goes.
"""
import re
from collections import defaultdict
from pathlib import Path

_ADR_DIR = Path(__file__).resolve().parents[2] / "docs" / "adr"
_NUMBER_PREFIX = re.compile(r"^(\d+)-")


def test_no_two_adrs_share_a_number() -> None:
    by_number: dict[str, list[str]] = defaultdict(list)
    for path in sorted(_ADR_DIR.glob("*.md")):
        match = _NUMBER_PREFIX.match(path.name)
        if match:
            by_number[match.group(1)].append(path.name)

    assert by_number, f"no numbered ADRs found under {_ADR_DIR}"

    collisions = {number: names for number, names in by_number.items() if len(names) > 1}
    assert not collisions, (
        "two ADRs claim the same number - renumber the later one and follow every "
        f"citation (grep -rn 'ADR-00NN' .): {collisions}"
    )
