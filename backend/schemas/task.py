from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, Field
from schemas.base import WireModel

from models.praxis import PraxisType
from models.task import TaskStatus, TaskType


class TaskOut(WireModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: int
    title: str
    description: str
    point_value: int
    level_required: int
    status: TaskStatus
    task_type: TaskType
    created_by: int
    primary_faction_slug: str
    metatask_faction_slug: Optional[str] = None
    created_at: datetime
    # Active signups (in_progress + pending), as GET /tasks/{id}/signups (#1021).
    # Defaults (here and below) because metatask rows in the praxis seal stack
    # are TaskOut.model_validate()'d on a bare Task (praxis_out.applied_metatasks_for).
    in_progress_count: int = 0
    # Author byline, read-time joins via services.task.authors_for_tasks (#1029).
    created_by_display_name: str = ""
    # Relative media path, "" = no portrait (monogram fallback).
    created_by_avatar_url: str = ""
    # The author's member faction, not the task's primary_faction_slug.
    created_by_faction_slug: Optional[str] = None
    # Current-era level (ADR-0042); 0 when no stats row this era.
    created_by_level: int = 0
    # Viewer-relative flags; defaults are safe for anonymous callers.
    can_sign_up: bool = False
    allowed_modes: list[str] = []
    eligible_for_current_user: bool = False
    # Why sign-up is open/shut: a SignupDenialReason value,
    # SIGNUP_REASON_MULTI_MEMBERSHIP, or None (#1497).
    signup_reason: Optional[str] = None
    # The viewer's own `in_progress` draft id (#2359), so a card can link it
    # without an N+1. Narrower than the denial's population; NOT filtered by the
    # Double Dipper carve-out (``active_member_task_ids``) — it's a raw fact.
    in_progress_praxis_id: Optional[int] = None
    # The viewer's own `submitted` praxis id (#2643), most recent if several
    # (re-signup is live: `ctaAgain`, Double Dipper). Viewer-scoped: the query
    # joins PraxisMember on the viewer's character, so no leak of others'.
    submitted_praxis_id: Optional[int] = None
    # The *start here* mark (#1861, SPEC-onboarding § The hand-off): the
    # onboarding task, never completed by this character in ANY era. One field
    # read by the mark, CreateCharacter's hand-off and `/start`'s stop condition.
    # Not era-scoped, else every era reset relights it for everyone.
    start_here: bool = False
    # This viewer's multiplier via compute_faction_multiplier (solo) (#2865);
    # ADR-0053/0055 still forbid pre-multiplying point_value. 1.0 on viewerless
    # ``build_task_out`` responses (POST /tasks, admin routes) — don't trust it there.
    viewer_faction_multiplier: float = 1.0


#: Trust-boundary caps (ADR-0006). These bodies reach an admin agent context
#: via mcp/worldzero-admin, so unbounded fields are a place to hide injection.
MAX_TASK_TITLE = 200
MAX_TASK_DESCRIPTION = 5000
#: Proposer's note to the reviewing admin (#1823); capped for the same reason.
MAX_TASK_NOTES = 2000


class TaskCreate(WireModel):
    title: str = Field(..., min_length=1, max_length=MAX_TASK_TITLE)
    description: Optional[str] = Field(None, max_length=MAX_TASK_DESCRIPTION)
    point_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
    primary_faction_slug: Optional[str] = None
    # For the reviewing admin; also used by metatask proposals (same body).
    notes: Optional[str] = Field(None, max_length=MAX_TASK_NOTES)
    task_type: Optional[str] = None
    metatask_faction_slug: Optional[str] = None


class TaskSignupOut(WireModel):
    """One row of a task's in-progress roster (GET /tasks/{id}/signups).

    This is the route's real response model (``response_model=list[TaskSignupOut]``).
    It previously was not: the route declared ``list[dict]`` and hand-built rows,
    so FastAPI validated nothing and the two drifted (#1051). The reconciliation
    kept the names the *route* emitted, because those are the accurate ones:

    * ``praxis_type`` is the praxis's :class:`PraxisType` (solo/collab/duel). The
      schema used to call this ``status``, which was simply the wrong fact — a
      praxis type is not a status, and the route never emitted a status.
    * ``joined_at`` is ``PraxisMember.joined_at``, matching both the source column
      and the ``joined_at`` already on praxis-member payloads. The schema used to
      call it ``signed_up_at``; same fact, inconsistent name.

    Neither of the schema's old names was consumed by anything (see #1051), so no
    live reader depended on the drift.
    """

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    # Current-era level (ADR-0042); 0 when no stats row this era.
    level: int = 0
    praxis_type: PraxisType
    joined_at: datetime
