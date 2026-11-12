from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field
from schemas.base import WireModel

from schemas.comment import CommentOut
from schemas.praxis import PraxisOut


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
    """One moderator-queue flag (ADR-0037).

    Legacy free text surfaces as ``other`` + ``reason_detail``. Reporter is
    character-scoped, never account/email.
    """

    reason: str
    reason_detail: str | None = None
    flagged_by_id: int
    flagged_by_name: str
    created_at: datetime


class FlaggedPraxisOut(PraxisOut):
    """PraxisOut plus its flag rows."""

    flags: list[FlagOut] = []


class FlaggedCommentOut(CommentOut):
    """CommentOut plus its flag rows."""

    flags: list[FlagOut] = []


class OverviewStats(WireModel):
    accounts: int
    characters: int
    active_tasks: int
    praxis: int
    votes: int
    flagged_praxis: int = 0
    suspended_accounts: int = 0


class CharacterStatsPatch(WireModel):
    """Only supplied fields are updated."""

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


class ModerationAction(WireModel):
    status: Literal["visible", "hidden", "failed"]
    admin_note: str | None = Field(None, max_length=1000)


class AdminTaskPatch(WireModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    point_value: int | None = Field(None, ge=1)
    level_required: int | None = Field(None, ge=0)
    #: The task's own faction (#1714); validated in ``admin_edit_task`` against
    #: era config. Not ``metatask_faction_slug``, which is a different question.
    primary_faction_slug: str | None = Field(None, min_length=1, max_length=50)


class TaskStatusAction(WireModel):
    status: Literal["pending", "active", "retired", "deleted"]


class TaskImportResult(WireModel):
    """Successful CSV task import (#1376). Atomic: failures are a 422 with one
    ``{row, msg}`` per rejected row."""

    created_count: int
    created_titles: list[str]
    # Corrections the importer made (e.g. a legacy faction slug).
    warnings: list[str]


class SuspendAction(WireModel):
    suspended: bool


class BanAction(WireModel):
    banned: bool


class SuspendActionOut(WireModel):
    """``status`` is the stored ``AccountStatus``, read back (idempotent)."""

    account_id: int
    status: str


class BanActionOut(WireModel):
    """A ban is character-scoped, not account (ADR-0041)."""

    character_id: int
    banned: bool


class CliTokenResponse(WireModel):
    access_token: str


# Era rollover (ADR-0091)


class EraOption(WireModel):
    """Admin era selector row; ``name`` comes from config (unrun eras have no row)."""

    config_key: str
    name: str
    is_live: bool


class EraRollIn(WireModel):
    """Just the key: resets are the incoming era's flags (ADR-0042)."""

    config_key: str


class EraRollOut(WireModel):
    """What the rollover did, read back."""

    era_id: int
    config_key: str
    name: str
    characters_reset: int


class AdminRow(WireModel):
    """One account holding admin, shown as its lowest-id character (#3258).

    No ``account_id`` or ``email``: the roster is addressed by username.
    """

    username: str
    display_name: str
    is_owner: bool


class AdminGrantIn(WireModel):
    username: str
