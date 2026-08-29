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
    can_sign_up: bool = False
    allowed_modes: list[str] = []
    eligible_for_current_user: bool = False
    # *Why* sign-up is open or shut for this viewer — a SignupDenialReason value,
    # SIGNUP_REASON_MULTI_MEMBERSHIP, or None when there is nothing to explain.
    # The flag above says whether; this says which, so the client can label the
    # call to action ("begin again" vs "you are already on this") without
    # re-deriving a server rule from its own state (#1497).
    signup_reason: Optional[str] = None
    # The VIEWER'S OWN open draft on this task — the praxis id, or None (#2359).
    #
    # NOT ``in_progress_count``'s sibling despite the name it shares a prefix
    # with: that is a population count of everyone working the task, this is one
    # viewer-relative id, and it defaults to None for anonymous callers exactly
    # as the flags above default.
    #
    # It exists because ``signup_reason == "already_active_member"`` was a dead
    # label on a card: the reason names a draft the card had no way to reach.
    # The task DETAIL page reaches it by fetching the viewer's own
    # ``status=in_progress`` praxes and finding this task among them, which a
    # feed of cards cannot do without an N+1 — so the id rides along on the row.
    #
    # THE POPULATION IS THE DETAIL PAGE'S, `in_progress` ONLY, and it is
    # deliberately NARROWER than the denial's own (`in_progress`, `pending`,
    # `submitted`). A submitted praxis shuts sign-up with nothing left to edit,
    # and this field is None there — reachable, not theoretical, and
    # `submitted_praxis_id` below is what the client reaches for instead
    # (#2643). Only `pending` still falls through to the plain label.
    #
    # It is also NOT filtered by the Double Dipper carve-out
    # (``active_member_task_ids``). "Do I hold a draft here" is a raw fact no
    # ability changes; sourcing it from the blocking set would have made an
    # Everymen player the one group whose draft the wire refused to name.
    in_progress_praxis_id: Optional[int] = None
    # The VIEWER'S OWN FILED praxis on this task — the praxis id, or None (#2643).
    #
    # The field above's twin, one status further on, and it exists because the
    # field above left half its own denial unanswered. `already_active_member`
    # covers a submitted praxis too, and there the card had nothing to offer:
    # a greyed "Already done" where the task detail says "Read your praxis" and
    # links to it. The detail reaches that praxis through its own submitted-only
    # gallery fetch, which a grid of cards cannot make one per card — so the id
    # rides along on the row, exactly as its twin does.
    #
    # VIEWER-SCOPED, and this is the one that would be worth a leak. A popular
    # task has many submissions and only ONE of them is the requesting
    # character's: the id comes from
    # `services.signup_eligibility.submitted_praxis_ids`,
    # whose query joins `PraxisMember` on the viewer's own character id, and it
    # is None for a viewer who has not submitted. It defaults None for anonymous
    # callers exactly as the flags above do.
    #
    # `submitted` ONLY — narrower than the denial's population, like its twin.
    # A `pending` praxis is awaiting moderation and is nobody's "read your
    # praxis"; it keeps falling through to the plain label.
    #
    # SUBMITTED MORE THAN ONCE, this holds the MOST RECENT. Re-signing up after
    # a praxis is filed is a live path (`ctaAgain`, Double Dipper), so the case
    # is real rather than theoretical, and the answer is stated in the query's
    # ordering rather than left to the default: offering someone a first attempt
    # they have already superseded is the wrong door.
    submitted_praxis_id: Optional[int] = None
    # The *start here* mark (#1861, SPEC-onboarding § The hand-off). True iff
    # this is the one game-wide onboarding task AND the viewing character has
    # never completed it — ever, not "not this era".
    #
    # ONE RULE, THREE CONSUMERS, and they agree by construction because they
    # read this one field: the mark drawn wherever the task appears,
    # `CreateCharacter`'s hand-off destination for a brand-new character, and
    # the `/start` flow's stop condition. A second signal is the drift the
    # spec's "one rule" sentence exists to prevent — the flow could then refuse
    # to start someone whose task is simultaneously marked *start here*.
    #
    # NOT era-scoped, deliberately. An era reset drops every character to level
    # 0 and retires the board except this task, so an era-scoped completion
    # would relight the mark for the whole playerbase at every rollover. Being
    # honest about it costs no storage: `Praxis` carries no `era_id` filter on
    # this read (era membership is a seal-time fact,
    # `services.era.get_era_row_for_praxis`), so praxis history already
    # outlives resets.
    #
    # Viewer-relative, so it defaults False for anonymous callers exactly as the
    # flags above do, and on the metatask rows the praxis seal stack builds with
    # `TaskOut.model_validate()`.
    start_here: bool = False


#: Trust-boundary caps on the three free-text fields a player writes, matching
#: the convention `CommentIn` already follows (ADR-0006). All were unbounded, and
#: the DB columns behind them are `String`/`Text` with no length either — so a
#: task proposal could carry an arbitrarily long body. That body is read back by
#: the admin moderation queue and by `mcp/worldzero-admin`'s `wz_list_pending_-
#: tasks`, which returns it into an agent context that also holds `wz_manage_-
#: role`. A cap is not a defence against prompt injection, but an unbounded
#: field is a comfortable place to hide one.
MAX_TASK_TITLE = 200
MAX_TASK_DESCRIPTION = 5000
#: The proposer's note to the reviewing admin (#1823). It lands in exactly the
#: same admin queue and the same agent context as the description above, so it
#: is capped for exactly the same reason. Smaller because it answers one narrow
#: question ("why should this exist?") instead of specifying the task.
MAX_TASK_NOTES = 2000


class TaskCreate(WireModel):
    title: str = Field(..., min_length=1, max_length=MAX_TASK_TITLE)
    description: Optional[str] = Field(None, max_length=MAX_TASK_DESCRIPTION)
    point_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
    primary_faction_slug: Optional[str] = None
    # Context for the reviewing admin; not part of the task. One field serves
    # both proposal kinds — a metatask proposal is this same body with
    # ``task_type="metatask"`` (the client's `MetataskProposal` is a frontend
    # convenience type, not a second endpoint). The form only collects notes for
    # standard tasks today; the schema needs no opinion about that.
    notes: Optional[str] = Field(None, max_length=MAX_TASK_NOTES)
    # Metatask fields — optional; defaults to a standard task.
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
