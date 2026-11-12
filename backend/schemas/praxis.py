from datetime import datetime
from typing import List, Optional
from schemas.base import WireModel
from schemas.task import TaskOut
from models.praxis import PraxisType, PraxisStatus, PraxisInviteStatus, MediaType, ModerationStatus


class MediaItemOut(WireModel):
    id: int
    praxis_id: int
    type: MediaType
    file_path: str
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUploadResultOut(WireModel):
    """Per-file outcome of a batch media upload; one of ``media_item``/``error``.

    ``filename`` is the client-supplied name, echoed unsanitized for the error
    toast. ``status_code`` is what the single-file route would return (413/422/500).
    """

    filename: str
    media_item: Optional[MediaItemOut] = None
    error: Optional[str] = None
    status_code: Optional[int] = None


class PraxisMemberOut(WireModel):
    id: int
    praxis_id: int
    character_id: int
    character_display_name: str  # populated by build_praxis_out
    # Relative media path, or "" (no portrait: UI shows a monogram) (#2318).
    character_avatar_url: str = ""  # populated by build_praxis_out
    # APPROVAL of the live proposal (ADR-0079), not "filed their part".
    has_submitted: bool
    # "My part is finished" (ADR-0079): social, reversible, survives approval
    # resets. Set via `POST /praxes/{id}/done`.
    is_done: bool
    # When `has_submitted` last flipped True; cleared with it, never stale (#571).
    submitted_at: Optional[datetime] = None
    joined_at: datetime
    # When the VIEWER last nudged this member (#1083); NULL once `NUDGE_COOLDOWN`
    # lapses, so non-null means "can't nudge yet".
    nudged_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PraxisDoneUpdate(WireModel):
    """The Done toggle's body (ADR-0079); a field, not /done + /undone routes."""

    is_done: bool


class PraxisInviteOut(WireModel):
    id: int
    praxis_id: int
    inviter_id: int
    invitee_id: int
    invitee_display_name: str   # populated by build_praxis_out
    # Same "" fallback as ``PraxisMemberOut.character_avatar_url`` (#2318).
    invitee_avatar_url: str = ""  # populated by build_praxis_out
    status: PraxisInviteStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PraxisOut(WireModel):
    id: int
    task_id: int
    task_title: str             # populated by build_praxis_out
    task_point_value: int       # populated by build_praxis_out
    task_level_required: int = 0  # populated by build_praxis_out
    task_faction_slug: Optional[str] = None  # populated by build_praxis_out; drives per-faction vote UI
    type: PraxisType
    status: PraxisStatus
    title: Optional[str]
    body_text: Optional[str]
    moderation_status: ModerationStatus
    admin_note: Optional[str]
    flagged_at: Optional[datetime]
    submitted_at: Optional[datetime] = None  # set on in_progress→submitted
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish window opened-at (ADR-0012)
    created_by_id: int
    created_by_display_name: str  # populated by build_praxis_out
    # Relative media path or "" (monogram fallback) (#2106).
    created_by_avatar_url: str = ""  # populated by build_praxis_out
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline
    created_at: datetime
    updated_at: datetime
    members: List[PraxisMemberOut]
    invites: List[PraxisInviteOut]
    media_items: List[MediaItemOut]
    # The one authoritative number (ADR-0053), for the praxis AUTHOR:
    #   score = task_point_value × display_multiplier
    #           + metatask_points + points_from_votes + habit_bonus_points
    # Only the base multiplies (ADR-0086).
    score: float                # populated by build_praxis_out; the computed total
    metatask_points: int = 0    # populated by build_praxis_out
    display_multiplier: float = 1.0  # faction × duel collapsed; 1.0 when nothing applies
    points_from_votes: int = 0  # populated by build_praxis_out
    # #1617 faction habit bonus, stamped at seal time; flat. On the wire because
    # it is a term of `score`.
    habit_bonus_points: int = 0  # populated by build_praxis_out
    voter_count: int = 0        # populated by build_praxis_out via vote_tally
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    duel_id: Optional[int] = None
    applied_metatasks: List[TaskOut] = []
    can_flag: bool = False      # populated by build_praxis_out; viewer-relative
    # Viewer-relative (#998): False only for the permanent blocks, the viewer's
    # account owns the praxis (ADR-0013) or is in its duel (#309). Budget doesn't
    # count; anonymous → True (login gate).
    # No default on purpose (#1974): a permission field must not fail open.
    viewer_can_vote: bool
    # Viewer's own star (1-5); None if unvoted/anonymous (#1382).
    viewer_vote: Optional[int] = None

    model_config = {"from_attributes": True}


class PraxisCardOut(WireModel):
    """Lightweight list-view schema."""
    id: int
    task_id: int
    task_title: str
    task_point_value: int
    task_level_required: int
    type: PraxisType
    status: PraxisStatus
    title: Optional[str]
    moderation_status: ModerationStatus
    created_by_id: int
    created_by_display_name: str
    # Same as ``PraxisOut.created_by_avatar_url`` (#888).
    created_by_avatar_url: str = ""
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish chip (#521, ADR-0012)
    member_count: int
    # See ``PraxisOut.score``: for the AUTHOR, not the viewer. ``display_multiplier``
    # is faction × duel collapsed.
    score: float
    metatask_points: int = 0
    display_multiplier: float = 1.0
    points_from_votes: int = 0
    # See ``PraxisOut.habit_bonus_points``.
    habit_bonus_points: int = 0
    voter_count: int = 0
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    # Full rows: the seal stack themes by issuing faction. Loaded page-wide (no N+1).
    applied_metatasks: List[TaskOut] = []
    task_faction_slug: Optional[str] = None
    # For mobile praxis cards (#573).
    body_text: Optional[str] = None
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline
    members: List[PraxisMemberOut] = []
    media_items: List[MediaItemOut] = []
    viewer_vote: Optional[int] = None  # the authenticated viewer's own cast value (1-5), None if unvoted/anonymous
    # Account-mate marker (#644 §7): another of the viewer's characters who voted
    # this, set only when the carried character didn't.
    voted_by_name: Optional[str] = None
    # See ``PraxisOut.viewer_can_vote``; page-wide via ``viewer_can_vote_map``.
    viewer_can_vote: bool
    # A duel side is stored ``type='solo'``, so gate duel UI on this, not ``type``
    # (#992, ADR-0011). Page-wide via ``duel_id_map``.
    duel_id: Optional[int] = None
    # The rival duel side (#596), via ``duel_opponents_for``. The three nullable
    # fields are set together or not at all: None when not a duel side or the duel
    # is still pending. Gate the banner on ``opponent_display_name``.
    opponent_praxis_id: Optional[int] = None
    opponent_display_name: Optional[str] = None
    opponent_faction_slug: Optional[str] = None
    # "" covers both no rival and no portrait (#2128); never the draw gate.
    opponent_avatar_url: str = ""

    model_config = {"from_attributes": True}


class PraxisCreate(WireModel):
    task_id: int
    type: PraxisType = PraxisType.solo
    title: Optional[str] = None
    body_text: Optional[str] = None


class PraxisTypeChange(WireModel):
    """Body for the in-place solo↔collab mode switch (#321)."""

    type: PraxisType


class PraxisInviteCreate(WireModel):
    invitee_id: int


class PraxisVoteIn(WireModel):
    value: int
