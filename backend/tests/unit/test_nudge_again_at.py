"""``nudge_again_at`` is where the cooldown length leaves the backend."""

from datetime import datetime, timezone

from schemas.duel import DuelSideOut
from services.nudge import NUDGE_COOLDOWN, nudge_again_at
from services.praxis_out import _build_member_out

NUDGED = datetime(2026, 11, 16, 23, 0, tzinfo=timezone.utc)


def test_again_at_is_nudged_at_plus_cooldown_and_null_with_it():
    assert nudge_again_at(NUDGED) == NUDGED + NUDGE_COOLDOWN
    assert nudge_again_at(None) is None


def test_member_row_carries_both_or_neither():
    class _Char:
        display_name = "A"
        avatar_url = ""

    class _Member:
        id = praxis_id = character_id = 1
        character = _Char()
        has_approved = is_done = False
        approved_at = None
        joined_at = NUDGED

    row = _build_member_out(_Member(), NUDGED)
    assert row.nudge_again_at == NUDGED + NUDGE_COOLDOWN
    assert _build_member_out(_Member(), None).nudge_again_at is None


def test_duel_side_declares_the_field():
    assert "nudge_again_at" in DuelSideOut.model_fields
