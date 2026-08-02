from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.comment import CommentOut
from schemas.praxis import PraxisOut


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


class AccountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime


class CharacterBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    faction_slug: str
    status: str


class AccountDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime
    characters: list[CharacterBrief]


class CharacterSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    username: str
    display_name: str
    faction_slug: str
    status: str
    score: int
    level: int
    votes_available: int
    created_at: datetime


class FlagOut(BaseModel):
    """One flag row for the moderator queue (#237, ADR-0037).

    ``reason`` is normalized onto the shared vocabulary at read time; legacy
    free text (or an ``other`` note) surfaces via ``reason_detail`` under the
    ``other`` key. Reporter identity is character-scoped — never account/email.
    """

    reason: str
    reason_detail: str | None = None
    flagged_by_id: int
    flagged_by_name: str
    created_at: datetime


class FlaggedPraxisOut(PraxisOut):
    """PraxisOut plus its flag rows — the moderator review queue shape."""

    flags: list[FlagOut] = []


class FlaggedCommentOut(CommentOut):
    """CommentOut plus its flag rows — the moderator review queue shape."""

    flags: list[FlagOut] = []


class OverviewStats(BaseModel):
    accounts: int
    characters: int
    active_tasks: int
    praxis: int
    votes: int
    flagged_praxis: int = 0
    suspended_accounts: int = 0


# ---------------------------------------------------------------------------
# Seed / Insert
# ---------------------------------------------------------------------------


# ADR-0038: faction name/description prose is not DB-owned. A faction row carries
# slug + status only; the English words live in
# frontend/src/locales/en/factions.json.
class FactionCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=30, pattern=r"^[a-z0-9_-]+$")
    hidden: bool = False


class AdminFactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    status: str
    created_at: datetime


class AdminCharacterCreate(BaseModel):
    account_id: int
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., max_length=50)
    bio: str = Field(default="", max_length=500)
    avatar_url: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=100)
    # Characters start unaffiliated (ADR-0019). An admin who wants to place a
    # character straight into a faction passes the slug explicitly. Omitted here
    # rather than defaulted to a literal so the era owns the answer: the service
    # fills it from era.starting_faction_slug (#1559), which the admin door must
    # agree with or the two creation paths drift.
    faction_slug: str | None = Field(default=None)


# ---------------------------------------------------------------------------
# Adjust Game State
# ---------------------------------------------------------------------------


class CharacterStatsPatch(BaseModel):
    """All fields optional — only supplied fields are updated."""

    level: int | None = Field(None, ge=0)
    score: int | None = Field(None, ge=0)
    all_time_score: int | None = Field(None, ge=0)
    votes_available: int | None = Field(None, ge=0)


class CharacterStatsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    character_id: int
    era_id: int
    score: int
    all_time_score: int
    level: int
    votes_available: int


# ---------------------------------------------------------------------------
# Role & Account Management
# ---------------------------------------------------------------------------


class ModerationAction(BaseModel):
    status: Literal["visible", "hidden", "failed"]
    admin_note: str | None = Field(None, max_length=1000)


class AdminTaskPatch(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    point_value: int | None = Field(None, ge=1)
    level_required: int | None = Field(None, ge=0)


class TaskStatusAction(BaseModel):
    status: Literal["pending", "active", "retired"]


class TaskImportResult(BaseModel):
    """Readout for a successful CSV task import (#1376).

    Only ever returned when the whole file imported — the import is atomic, so
    there is deliberately no partial-success shape. Failures come back as a 422
    whose ``detail`` is one ``{row, msg}`` object per rejected row.
    """

    created_count: int
    created_titles: list[str]
    # Corrections applied on the way in (e.g. a legacy faction slug), so the admin
    # sees what the importer changed and not only what it wrote.
    warnings: list[str]


class RoleAction(BaseModel):
    role: str = Field(..., min_length=1, max_length=50)
    action: Literal["grant", "revoke"]


class SuspendAction(BaseModel):
    suspended: bool


# ---------------------------------------------------------------------------
# CLI Auth
# ---------------------------------------------------------------------------


class CliTokenResponse(BaseModel):
    access_token: str
