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
# Adjust Game State
# ---------------------------------------------------------------------------


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
    #: The task's own faction — which kit renders it and who earns the
    #: own-faction modifier (#1714). Validated against the era's factions in
    #: :func:`services.admin_service.admin_edit_task`, not here, because the
    #: allowed set is era config and a schema cannot read it (ADR-0042).
    #: Deliberately NOT ``metatask_faction_slug``: that field answers a
    #: different question (which faction may *apply* a metatask) and is bound
    #: to ``task_type`` on create, so moving it is its own decision.
    primary_faction_slug: str | None = Field(None, min_length=1, max_length=50)


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


class SuspendAction(WireModel):
    suspended: bool


class BanAction(WireModel):
    banned: bool


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


# ---------------------------------------------------------------------------
# Era rollover (#827, ADR-0091)
# ---------------------------------------------------------------------------


class EraOption(WireModel):
    """One row in the admin era selector.

    ``config_key`` is the identity a mod picks and ``Era.config_key`` stores;
    ``name`` is the era's player-visible name, read off the config rather than
    off any row, because an era that has never run has no row to read.
    """

    config_key: str
    name: str
    is_live: bool


class EraRollIn(WireModel):
    """``POST /admin/eras/roll`` — the era to roll the game into.

    Deliberately just the key. A rollover has no options: the resets it performs
    are the *incoming* era's flags (ADR-0042), so anything else this body could
    carry would be a second place to state a rule the era file already owns.
    """

    config_key: str


class EraRollOut(WireModel):
    """What the rollover did, read back rather than echoed."""

    era_id: int
    config_key: str
    name: str
    characters_reset: int
