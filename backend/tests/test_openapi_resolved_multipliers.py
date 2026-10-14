"""#2865 -- the contract carries the resolved multipliers, as required numbers.

The client formats these instead of re-deriving which modifier applies, so if a
refactor drops or optionalises one the generated types must not quietly follow.
Reads the committed ``openapi.json`` (``test_openapi_dump.py`` proves it is the
one the app serves), so a removed field fails here as well as in the
``api-schema`` drift gate.
"""
import json
from pathlib import Path

import pytest

COMMITTED_SCHEMA = Path(__file__).resolve().parent.parent / "openapi.json"
_DOCUMENT = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
SCHEMAS = _DOCUMENT["components"]["schemas"]


@pytest.mark.parametrize(
    "model, field",
    [
        ("TaskOut", "viewer_faction_multiplier"),
        ("DuelSideOut", "win_multiplier"),
        ("DuelSideOut", "loss_multiplier"),
        ("DuelSideOut", "tie_multiplier"),
    ],
)
def test_resolved_multiplier_is_a_required_number(model: str, field: str) -> None:
    schema = SCHEMAS[model]
    assert schema["properties"][field]["type"] == "number"
    assert field in schema["required"]
