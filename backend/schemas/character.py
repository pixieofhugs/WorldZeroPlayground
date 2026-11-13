from datetime import datetime
from typing import Annotated, Any

from pydantic import (
    AfterValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)
from schemas.base import WireModel

# The one statement of a valid display name, for create and rename (#1686).
# ponytail: strip lives on this alias, not WireModel ``str_strip_whitespace``
# (that would rewrite every body and ORM read). More fields need it → widen the
# alias, not WireModel.
DisplayName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)
]


def _airport_code(value: str) -> str:
    """Trim, uppercase, require three letters or empty (ADR-0094).

    Three letters can't hold an address (privacy). No IATA allowlist on purpose.
    """
    value = value.strip().upper()
    if value and not (len(value) == 3 and value.isascii() and value.isalpha()):
        raise ValueError("location must be a three-letter airport code or empty")
    return value


LocationCode = Annotated[str, AfterValidator(_airport_code)]


class BadgeOut(WireModel):
    """A held badge (ADR-0033); the image is a frontend asset keyed by ``key``."""

    key: str
    name: str


class CharacterOut(WireModel):
    """Public character response. Stats (score, level, all_time_score) come from CharacterStats.

    No vote budget here (#1387): see ``VoteCastOut.viewer_stats``. Badges are
    computed on read; lists only via ``build_badge_contexts`` (#655).
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
    # Current-era invitation slugs (ADR-0022); set ONLY on the /auth/me path.
    invitations: list[str] = Field(default_factory=list)


class CharacterCreate(WireModel):
    # Derived from display_name when absent (ADR-0019).
    username: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: DisplayName
    bio: str = Field(default="", max_length=500)
    tagline: str = Field(default="", max_length=140)
    avatar_url: str = Field(default="", max_length=500)
    location: LocationCode = ""
    # Omitted → era.starting_faction_slug (#1559). Otherwise must be an invited
    # faction; never "albescent".
    faction_slug: str | None = Field(default=None, max_length=50)


class ActiveCharacterIn(WireModel):
    character_id: int


class CharacterUpdate(WireModel):
    """A partial edit (``exclude_unset`` downstream).

    ``display_name`` can't be blanked (#1686): ``null`` means unchanged. Other
    fields' ``null`` clears them.
    """

    display_name: DisplayName | None = None
    bio: str | None = Field(None, max_length=500)
    tagline: str | None = Field(None, max_length=140)
    avatar_url: str | None = Field(None, max_length=500)
    location: LocationCode | None = None

    @model_validator(mode="before")
    @classmethod
    def _null_display_name_means_unchanged(cls, data: Any) -> Any:
        """Drop explicit ``display_name: null``: the service coerces None to ""."""
        if isinstance(data, dict) and data.get("display_name", ...) is None:
            data = {key: value for key, value in data.items() if key != "display_name"}
        return data
