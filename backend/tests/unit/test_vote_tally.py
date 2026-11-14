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
    assert dataclasses.fields(VoteTally)
    tally = VoteTally(points_from_votes=5, voter_count=1)
    with pytest.raises(dataclasses.FrozenInstanceError):
        tally.voter_count = 99  # type: ignore[misc]


@pytest.mark.asyncio
async def test_viewer_votes_for_empty_ids_short_circuits():
    """#573."""

    class _ExplodingSession:
        async def execute(self, *args, **kwargs):  # pragma: no cover - must not run
            raise AssertionError("execute should not be called for empty ids")

    result = await viewer_votes_for([], 1, 1, _ExplodingSession())
    assert result == {}


@pytest.mark.asyncio
async def test_viewer_votes_for_splits_own_and_account_mate():
    """Carried character's star vs an account-mate marker (#644).

    Praxis 12 is unreachable since #1150 (one vote per praxis+account); kept as
    defence for older data.
    """

    class _FakeResult:
        def all(self):
            return [
                (10, 7, 4, "Me"),
                (11, 9, 2, "Alice"),     # account-mate only → marker
                (12, 7, 5, "Me"),
                (12, 9, 1, "Alice"),     # mate too → marker suppressed
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
    assert result[12] == ViewerVote(value=5, voted_by_name=None)
    assert session.captured is not None
