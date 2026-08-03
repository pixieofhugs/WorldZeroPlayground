from datetime import datetime

from pydantic import ConfigDict, Field
from schemas.base import WireModel


class BadgeOut(WireModel):
    """A badge a character currently holds (ADR-0033). The image is a frontend
    asset keyed by ``key`` — never part of the payload."""

    key: str
    name: str


class CharacterOut(WireModel):
    """Public character response. Stats (score, level, all_time_score) come from CharacterStats.

    The vote budget is deliberately NOT here (#1387). It is computed on read
    (ADR-0043), so carrying it cost a recomputation per roster row for a number
    no client read. Its reader is the post-cast ``VoteCastOut.viewer_stats``
    (#1382); admin surfaces have their own shape in ``schemas.admin``.

    badges is evaluated on read (ADR-0033) — never stored. List serializers may
    populate it, but only via services.badge.build_badge_contexts, which resolves
    a whole page in one GROUP BY account_id query; the rule is "never
    per-character on a list path", not "never on a list path" (#655).
    account_id / email never leave the backend.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    bio: str
    tagline: str
    avatar_url: str
    location: str
    level: int
    score: int
    all_time_score: int
    faction_slug: str
    status: str
    created_at: datetime
    badges: list[BadgeOut] = Field(default_factory=list)
    # Faction slugs this character holds a current-era invitation letter for
    # (ADR-0022; #243). Populated ONLY by the /auth/me active-character path so
    # the frontend InvitationWatcher can detect a newly-earned invite; list
    # serializers and public reads leave it empty. na/albescent excluded.
    invitations: list[str] = Field(default_factory=list)


class CharacterCreate(WireModel):
    # username is optional: the server derives a unique @handle from display_name
    # when absent (ADR-0019). An explicit one is still accepted for back-compat.
    username: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=50)
    bio: str = Field(default="", max_length=500)
    tagline: str = Field(default="", max_length=140)
    avatar_url: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=100)
    # Optional starting faction. Omitted lands era.starting_faction_slug, which
    # defaults to unaffiliated ("na") — #1559. A non-None slug must be one the
    # account holds an invitation for. "albescent" is never a creation option
    # (join-in-the-field only).
    faction_slug: str | None = Field(default=None, max_length=50)


class ActiveCharacterIn(WireModel):
    character_id: int


class VotesReceivedOut(WireModel):
    """Votes received on the praxes a character **authored**.

    Author-scoped, not membership-scoped (ADR-0053) — see the route docstring in
    ``routers/characters.py`` for why the two must not be conflated. It echoes
    ``character_id`` so a caller batching several of these can tell the answers
    apart.
    """

    character_id: int
    votes_received: int


class CharacterUpdate(WireModel):
    display_name: str | None = Field(None, max_length=50)
    bio: str | None = Field(None, max_length=500)
    tagline: str | None = Field(None, max_length=140)
    avatar_url: str | None = Field(None, max_length=500)
    location: str | None = Field(None, max_length=100)
