from datetime import datetime
from typing import Annotated, Any

from pydantic import ConfigDict, Field, StringConstraints, model_validator
from schemas.base import WireModel

# The one statement of what a display name may be (#1686). Creation and renaming
# used to say it separately, and the renaming one forgot ``min_length`` — so a
# character created as "Molly" could be renamed to "" or "   " and the server
# stored it, leaving every byline, roster, comment attribution and avatar
# monogram to invent its own answer for what a blank name looks like.
#
# ponytail: the strip is on this alias rather than ``str_strip_whitespace`` on
# WireModel. That flag would be the fix-once seam if display names were the only
# strings on this wire, but WireModel is the base for *every* request and
# response model — praxis bodies, comment bodies, search terms — and response
# models validate from ORM attributes, so it would also rewrite text on read.
# Upgrade path if more identity-ish fields want this: widen the alias's reach,
# not WireModel's.
DisplayName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)
]


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
    display_name: DisplayName
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


class CharacterUpdate(WireModel):
    """A partial edit. Absent fields are left alone (``exclude_unset`` downstream).

    ``display_name`` is the one field that cannot be blanked (#1686): omitting it
    and sending an explicit ``null`` both mean "leave unchanged", and ``""``,
    ``"   "`` and ``"\\t"`` are rejected here rather than stored. The other fields
    keep their existing semantics, where a ``null`` clears the value — a player
    is allowed to have no bio, and is not allowed to have no name.
    """

    display_name: DisplayName | None = None
    bio: str | None = Field(None, max_length=500)
    tagline: str | None = Field(None, max_length=140)
    avatar_url: str | None = Field(None, max_length=500)
    location: str | None = Field(None, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def _null_display_name_means_unchanged(cls, data: Any) -> Any:
        """Drop an explicit ``display_name: null`` so it reads as omitted.

        The update service coerces every ``None`` it is handed to ``""``, so a
        client sending an explicit null blanked the name by the back door. Making
        the field simply *unset* is what routes both spellings of "I am not
        editing this" through the same ``exclude_unset`` gate — and it keeps the
        rule in the schema, where the wire can enforce it, rather than adding a
        second statement of it in the service.
        """
        if isinstance(data, dict) and data.get("display_name", ...) is None:
            data = {key: value for key, value in data.items() if key != "display_name"}
        return data
