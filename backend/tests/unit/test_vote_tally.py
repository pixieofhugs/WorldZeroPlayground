"""Unit tests for services.vote_tally — pure helpers only."""

import pytest

from services.vote_tally import ViewerVote, VoteTally, get_tally, viewer_votes_for


def test_get_tally_returns_empty_when_missing():
    assert get_tally({}, 99) == VoteTally(0, 0)


def test_get_tally_returns_entry_when_present():
    entry = VoteTally(points_from_votes=12, voter_count=3)
    result = get_tally({42: entry}, 42)
    assert result is entry


def test_vote_tally_is_frozen():
    import dataclasses
    assert dataclasses.fields(VoteTally)  # confirms it's a dataclass
    tally = VoteTally(points_from_votes=5, voter_count=1)
    try:
        tally.voter_count = 99  # type: ignore[misc]
        assert False, "Expected FrozenInstanceError"
    except Exception:
        pass  # frozen dataclasses raise FrozenInstanceError on mutation


@pytest.mark.asyncio
async def test_viewer_votes_for_empty_ids_short_circuits():
    """Empty praxis_ids returns {} without touching the session (#573)."""

    class _ExplodingSession:
        async def execute(self, *args, **kwargs):  # pragma: no cover - must not run
            raise AssertionError("execute should not be called for empty ids")

    result = await viewer_votes_for([], 1, 1, _ExplodingSession())
    assert result == {}


@pytest.mark.asyncio
async def test_viewer_votes_for_splits_own_and_account_mate():
    """Account rows split into the carried character's star vs an account-mate marker (#644).

    Row shape is (praxis_id, voter_character_id, value, display_name). The carried
    character (id 7) yields ``value``; a different character on the account yields
    ``voted_by_name`` only when the carried character did not vote that praxis.

    Praxis 12 (carried character AND a mate) is unreachable from the database
    since #1150 — ``uq_vote_praxis_account`` allows one row per (praxis, account).
    The stubbed rows keep the suppression branch covered as defence for pre-#1150
    data; this is the reason the integration test for that case was replaced with
    a re-rate test rather than deleted outright.
    """

    class _FakeResult:
        def all(self):
            return [
                (10, 7, 4, "Me"),        # carried character voted → value=4
                (11, 9, 2, "Alice"),     # account-mate only → marker
                (12, 7, 5, "Me"),        # carried voted...
                (12, 9, 1, "Alice"),     # ...and a mate voted → marker suppressed
            ]

    class _FakeSession:
        def __init__(self):
            self.captured = None

        async def execute(self, statement):
            self.captured = statement
            return _FakeResult()

    session = _FakeSession()
    result = await viewer_votes_for([10, 11, 12], 7, 1, session)
    assert result[10] == ViewerVote(value=4, voted_by_name=None)
    assert result[11] == ViewerVote(value=None, voted_by_name="Alice")
    # Carried character's own star wins; the mate marker is suppressed.
    assert result[12] == ViewerVote(value=5, voted_by_name=None)
    assert session.captured is not None  # a query was issued for non-empty ids
