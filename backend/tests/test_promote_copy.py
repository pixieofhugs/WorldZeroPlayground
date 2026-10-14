"""The copy bake refuses a key the catalog does not hold (#3165)."""

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "scripts"))

import promote_copy  # noqa: E402  (needs the sys.path line above)


def test_bake_refuses_absent_key_and_writes_nothing_for_it(tmp_path: Path) -> None:
    catalog = tmp_path / "feed.json"
    catalog.write_text('{"m": {"n_one": "Member", "n_other": "Members"}}')

    lines = promote_copy.promote(
        [
            {"ns": "feed", "key": "m.n", "value": "stale unsuffixed row"},
            {"ns": "feed", "key": "m.n_other", "value": "Folk"},
        ],
        tmp_path,
    )

    assert lines[0].startswith("REFUSE feed:m.n ")
    assert json.loads(catalog.read_text()) == {"m": {"n_one": "Member", "n_other": "Folk"}}


def test_script_self_check_passes() -> None:
    promote_copy._check()
