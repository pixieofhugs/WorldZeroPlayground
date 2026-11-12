"""The stamp-detection branch that gates deploys in start.sh.

``KNOWN`` stands in for ``versions/`` so this doesn't churn on every squash.
"""
from scripts.check_db_stamp import stamp_is_known, unknown_stamp_message

KNOWN = {"0002_squashed"}


def test_fresh_db_proceeds():
    assert stamp_is_known(None, KNOWN)


def test_known_revision_proceeds():
    assert stamp_is_known("0002_squashed", KNOWN)


def test_squashed_away_revision_blocks():
    """Every deployed DB right after a squash lands (#1398)."""
    assert not stamp_is_known("0011_vote_unique_per_account", KNOWN)


def test_recovery_message_names_no_retired_host_or_script():
    """#3058"""
    message = unknown_stamp_message("0011_vote_unique_per_account")
    assert "0011_vote_unique_per_account" in message
    # a plain `stamp` dies on the unknown revision it is meant to replace
    assert "alembic stamp --purge <revision>" in message
    assert "Render" not in message
    assert "Shell tab" not in message
    assert "reset_render_db" not in message
