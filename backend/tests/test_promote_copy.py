"""The copy bake refuses a key the catalog does not hold (#3165)."""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "scripts"))

import promote_copy  # noqa: E402  (needs the sys.path line above)


def test_script_self_check_passes() -> None:
    promote_copy._check()
