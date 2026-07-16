"""Unit tests for services.vote_tally — pure helpers only."""

import pytest

from services.vote_tally import VoteTally, get_tally, viewer_votes_for


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

    result = await viewer_votes_for([], 1, _ExplodingSession())
    assert result == {}


@pytest.mark.asyncio
async def test_viewer_votes_for_maps_praxis_to_value():
    """Rows (praxis_id, value) map into a dict keyed by praxis id (#573)."""

    class _FakeResult:
        def all(self):
            return [(10, 4), (11, 2)]

    class _FakeSession:
        def __init__(self):
            self.captured = None

        async def execute(self, statement):
            self.captured = statement
            return _FakeResult()

    session = _FakeSession()
    result = await viewer_votes_for([10, 11], 7, session)
    assert result == {10: 4, 11: 2}
    assert session.captured is not None  # a query was issued for non-empty ids
