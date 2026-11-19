import pytest

from models.flag import FlagReason
from schemas.comment import FlagIn


@pytest.mark.parametrize(
    "reason, note, expected",
    [
        (FlagReason.other, "  x  ", "x"),
        (FlagReason.other, "   ", None),
        (FlagReason.nsfw, "x", None),
    ],
)
def test_flag_note_rules(reason, note, expected) -> None:
    assert FlagIn(reason=reason, reason_detail=note).reason_detail == expected
