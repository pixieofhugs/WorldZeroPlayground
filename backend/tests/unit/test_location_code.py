"""Character.location is three letters or empty (#2798, ADR-0094). Seam: the schemas."""
import pytest
from pydantic import ValidationError

from schemas.character import CharacterCreate, CharacterUpdate


@pytest.mark.parametrize(
    "raw,stored", [("pdx ", "PDX"), ("", ""), ("  yyz", "YYZ"), ("ZZZ", "ZZZ")]
)
def test_accepts_and_normalises(raw, stored):
    assert CharacterCreate(display_name="A", location=raw).location == stored
    assert CharacterUpdate(location=raw).location == stored


@pytest.mark.parametrize("raw", ["PDXX", "P1X", "14 Elm St", "PD", "P X", "éée"])
def test_rejects(raw):
    with pytest.raises(ValidationError):
        CharacterCreate(display_name="A", location=raw)
    with pytest.raises(ValidationError):
        CharacterUpdate(location=raw)


def test_update_null_and_absent_pass_through():
    assert CharacterUpdate(location=None).location is None
    assert "location" not in CharacterUpdate().model_fields_set
