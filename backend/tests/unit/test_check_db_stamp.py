"""The stamp-detection branch that gates deploys in start.sh.

``KNOWN`` is a stand-in for whatever ``versions/`` holds, not a copy of it —
the function under test is pure, and hard-wiring it to the live chain would make
this file churn on every squash. The names below are chosen to look like the
real thing so the failure message reads sensibly.
"""
from scripts.check_db_stamp import stamp_is_known

KNOWN = {"0002_squashed"}


def test_fresh_db_proceeds():
    assert stamp_is_known(None, KNOWN)


def test_known_revision_proceeds():
    assert stamp_is_known("0002_squashed", KNOWN)


def test_squashed_away_revision_blocks():
    """The state every deployed DB is in the moment a squash lands (#1398)."""
    assert not stamp_is_known("0011_vote_unique_per_account", KNOWN)
