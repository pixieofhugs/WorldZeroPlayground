from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field
from schemas.base import WireModel

from schemas.comment import CommentOut
from schemas.praxis import PraxisOut


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


class AccountSummary(WireModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime


class CharacterBrief(WireModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    faction_slug: str
    status: str


class AccountDetail(WireModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime
    characters: list[CharacterBrief]


class CharacterSummary(WireModel):
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


class FlagOut(WireModel):
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


class OverviewStats(WireModel):
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
class FactionCreate(WireModel):
    slug: str = Field(..., min_length=2, max_length=30, pattern=r"^[a-z0-9_-]+$")
    hidden: bool = False


class AdminFactionOut(WireModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    status: str
    created_at: datetime


class AdminCharacterCreate(WireModel):
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


class AdminCharacterOut(WireModel):
    """The character an admin just minted (``POST /admin/characters``).

    Carries ``account_id`` on purpose. The "never expose account_id" rule
    (SPEC-backend-architecture.md §4) governs the *public* API; the admin router
    is the operator surface and already answers with raw account identity and
    e-mail (``AccountSummary``). An admin who creates a character for an account
    needs to see which account it landed on.

    Deliberately not ``CharacterOut``: that shape is the player-facing profile
    (score, level, badges, faction display), none of which exists yet at
    creation time. This is the insert receipt.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    username: str
    display_name: str
    faction_slug: str
    status: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Adjust Game State
# ---------------------------------------------------------------------------


class VoteSpendRepairOut(WireModel):
    """One character's ``votes_spent_this_era`` before and after a recompute.

    The wire mirror of ``services.character_stats.VoteSpendRepair``. It is a
    separate declaration rather than the dataclass itself because the response
    shape is a published contract and the dataclass is an internal return type;
    tying them together would make an internal rename a wire break.
    """

    character_id: int
    before: int
    after: int


class VoteBudgetBackfillOut(WireModel):
    """Readout for ``POST /admin/characters/backfill-vote-budget``.

    ``changes`` is the whole point of the endpoint's ``dry_run`` mode: an admin
    ``votes_available`` grant writes the same counter a recompute rebuilds, and
    nothing records that a row was hand-set, so an operator reads these
    before/after pairs to spot a grant this pass would revert.
    """

    dry_run: bool
    changed: int
    changes: list[VoteSpendRepairOut]


class StatsBackfillOut(WireModel):
    """Readout for ``POST /admin/characters/backfill-stats``.

    ``recalculated`` counts *active* characters — banned ones are skipped — so
    it will not match a headcount of the accounts table.
    """

    recalculated: int


class EraResetOut(WireModel):
    """Readout for ``PUT /admin/era/reset``: the new era row and who it touched."""

    era_id: int
    characters_reset: int


class CharacterStatsPatch(WireModel):
    """All fields optional — only supplied fields are updated."""

    level: int | None = Field(None, ge=0)
    score: int | None = Field(None, ge=0)
    all_time_score: int | None = Field(None, ge=0)
    votes_available: int | None = Field(None, ge=0)


class CharacterStatsOut(WireModel):
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


class ModerationAction(WireModel):
    status: Literal["visible", "hidden", "failed"]
    admin_note: str | None = Field(None, max_length=1000)


class AdminTaskPatch(WireModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    point_value: int | None = Field(None, ge=1)
    level_required: int | None = Field(None, ge=0)


class TaskStatusAction(WireModel):
    status: Literal["pending", "active", "retired"]


class TaskImportResult(WireModel):
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


class RoleAction(WireModel):
    role: str = Field(..., min_length=1, max_length=50)
    action: Literal["grant", "revoke"]


class SuspendAction(WireModel):
    suspended: bool


class BanAction(WireModel):
    banned: bool


class RoleActionOut(WireModel):
    """Echo of an applied ``POST /admin/accounts/{id}/role``.

    An echo rather than the account's full role set: the service applies one
    grant/revoke and does not read the rest back, and inventing a fuller shape
    here would mean a second query whose only consumer is the confirmation.
    """

    account_id: int
    role: str
    action: Literal["grant", "revoke"]


class SuspendActionOut(WireModel):
    """Result of ``POST /admin/accounts/{id}/suspend``.

    ``status`` is the account's resulting ``AccountStatus`` value, read back from
    the row rather than echoed from the request — suspension is idempotent, so
    the stored value is the one worth reporting.
    """

    account_id: int
    status: str


class BanActionOut(WireModel):
    """Result of ``POST /admin/characters/{id}/ban``.

    Character-scoped: a ban lands on one character, not the account behind it
    (ADR-0041). Suspending the account is the other endpoint.
    """

    character_id: int
    banned: bool


# ---------------------------------------------------------------------------
# CLI Auth
# ---------------------------------------------------------------------------


class CliTokenResponse(WireModel):
    access_token: str
