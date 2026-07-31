from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    praxis_id: int
    voter_character_id: int
    value: int
    created_at: datetime
    updated_at: datetime


class VoteTallyOut(BaseModel):
    """A praxis's vote aggregate, in the field names every praxis payload uses.

    Deliberately the same two names as ``PraxisOut`` / ``PraxisCardOut`` carry
    (``points_from_votes``, ``voter_count``) rather than a third vocabulary for
    the same numbers. The retired ``VoteSummary`` used ``total_score`` /
    ``total_votes``, which is why the client needed a *separate* merge function
    for it — one shape, one merge (#1382).
    """

    points_from_votes: int
    voter_count: int


class ViewerStatsOut(BaseModel):
    """The voter's own stats as of immediately after their cast (#1382).

    Carried so the client never has to refetch ``/auth/me`` to find out what a
    cast did. ``score`` and ``level`` cannot actually move by casting — a vote
    recalculates the praxis MEMBERS and anti-self-vote guarantees the voter is
    never one — so in practice only ``votes_available`` changes. They are here
    because the client should read one authoritative object rather than assume
    which of its fields a write is allowed to touch.
    """

    score: int
    level: int
    votes_available: int


class VoteCastOut(VoteOut):
    """The complete post-cast truth: everything the client used to reconstruct.

    Extends ``VoteOut`` rather than nesting it — the vote's own fields stay at
    the top level so existing readers keep working — and adds the three facts
    that a bare ``VoteOut`` forced the client to fake or refetch:

    * ``tally`` — retired the client-side overlay's delta arithmetic (#626,
      stale-bugged twice as #1142 and #1239).
    * ``viewer_vote`` — the star that now stands for the viewer's carried
      character. Same name and meaning as ``PraxisCardOut.viewer_vote``.
    * ``viewer_stats`` — retired the ``/auth/me`` reload fired per star.
    """

    tally: VoteTallyOut
    viewer_vote: int
    viewer_stats: ViewerStatsOut


class VoterDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    value: int
