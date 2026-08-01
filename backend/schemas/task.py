from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from models.praxis import PraxisType
from models.task import TaskStatus, TaskType


class TaskOut(BaseModel):
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
    # Derived, read-time count of characters actively working on this task —
    # active-signup population (Praxis.status in [in_progress, pending]), the
    # same set GET /tasks/{id}/signups exposes, reduced to a count (#1021).
    # Populated by services.task.build_task_out(_for_viewer). Defaults to 0
    # because TaskOut.model_validate() is also used directly on metatask rows
    # (the praxis seal stack — services/praxis_out.py's applied_metatasks_for),
    # which have no such attribute on the Task ORM object; 0 is also the true
    # value there since metatasks are never signup targets (evaluate_signup
    # rejects TaskType.metatask before any status check).
    in_progress_count: int = 0
    # The proposing character, denormalised for the task-detail author row and
    # the browse card byline (#1029). ``created_by`` above stays the bare id
    # (it is what a profile link needs); these four are read-time joins on the
    # author's Character + current-era CharacterStats, populated by
    # services.task.build_task_out(_for_viewer) from
    # services.task.authors_for_tasks. Naming mirrors PraxisOut /
    # PraxisCardOut's existing ``created_by_*`` byline fields.
    #
    # They default for the same reason ``in_progress_count`` does: metatask
    # rows in the praxis seal stack are built by TaskOut.model_validate() on a
    # bare Task ORM object (services/praxis_out.py's applied_metatasks_for), which
    # carries no author attributes. A seal draws no byline, so the defaults are
    # never rendered there.
    created_by_display_name: str = ""
    # Relative media path or "" — an empty string is the ordinary case (no
    # portrait uploaded) and the row degrades to the shared monogram avatar,
    # exactly as PraxisCardOut.created_by_avatar_url does.
    created_by_avatar_url: str = ""
    # The author's *member* faction (Character.faction_slug), NOT the task's
    # primary_faction_slug — a Coven member may propose an "na" task.
    created_by_faction_slug: Optional[str] = None
    # The author's level in the CURRENT era (CharacterStats.level, ADR-0042:
    # levels are era-scoped history). 0 when the author has no stats row for
    # the current era.
    created_by_level: int = 0
    # Viewer-relative capability flags — populated by the task router using
    # the authenticated viewer's character. Defaults keep the flags safe for
    # unauthenticated callers (empty modes, cannot submit, not eligible).
    can_submit_praxis: bool = False
    allowed_modes: list[str] = []
    eligible_for_current_user: bool = False
    # *Why* sign-up is open or shut for this viewer — a SignupDenialReason value,
    # SIGNUP_REASON_MULTI_MEMBERSHIP, or None when there is nothing to explain.
    # The flag above says whether; this says which, so the client can label the
    # call to action ("begin again" vs "you are already on this") without
    # re-deriving a server rule from its own state (#1497).
    signup_reason: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    point_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
    primary_faction_slug: Optional[str] = None
    # Metatask fields — optional; defaults to a standard task.
    task_type: Optional[str] = None
    metatask_faction_slug: Optional[str] = None


class CharacterTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task: TaskOut
    status: str
    signed_up_at: datetime


class TaskSignupOut(BaseModel):
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
    # The signed-up character's level in the CURRENT era (CharacterStats.level,
    # ADR-0042), for the roster row's "lvl N" (#1029). 0 when the character has
    # no stats row for the current era.
    level: int = 0
    # Which kind of praxis the character is working the task through. Typed as the
    # enum rather than ``str`` so the domain values are not bare string literals;
    # Pydantic serialises it to its value ("solo"/"collab"/"duel") on the wire,
    # exactly as PraxisOut.type does.
    praxis_type: PraxisType
    joined_at: datetime
