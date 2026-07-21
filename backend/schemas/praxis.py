from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from schemas.task import TaskOut
from models.praxis import PraxisType, PraxisStatus, PraxisInviteStatus, MediaType, ModerationStatus


class MediaItemOut(BaseModel):
    id: int
    praxis_id: int
    type: MediaType
    file_path: str
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PraxisMemberOut(BaseModel):
    id: int
    praxis_id: int
    character_id: int
    character_display_name: str  # populated by build_praxis_out
    has_submitted: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


class PraxisInviteOut(BaseModel):
    id: int
    praxis_id: int
    inviter_id: int
    invitee_id: int
    inviter_display_name: str   # populated by build_praxis_out
    invitee_display_name: str   # populated by build_praxis_out
    status: PraxisInviteStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PraxisOut(BaseModel):
    id: int
    task_id: int
    task_title: str             # populated by build_praxis_out
    task_point_value: int       # populated by build_praxis_out
    task_level_required: int = 0  # populated by build_praxis_out; ADR-0017 §6
    task_faction_slug: Optional[str] = None  # populated by build_praxis_out; drives per-faction vote UI
    type: PraxisType
    status: PraxisStatus
    title: Optional[str]
    body_text: Optional[str]
    moderation_status: ModerationStatus
    admin_note: Optional[str]
    flagged_at: Optional[datetime]
    submitted_at: Optional[datetime] = None  # set on in_progress→submitted; ADR-0017 §6
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish window opened-at (ADR-0012)
    created_by_id: int
    created_by_display_name: str  # populated by build_praxis_out
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline; ADR-0017 §6
    created_at: datetime
    updated_at: datetime
    members: List[PraxisMemberOut]
    invites: List[PraxisInviteOut]
    media_items: List[MediaItemOut]
    # The one authoritative number for this praxis (ADR-0053, supersedes
    # ADR-0047). Computed for the praxis AUTHOR, for every type incl. collab:
    #   score = (task_point_value + metatask_points) × display_multiplier
    #           + points_from_votes
    # "Merit" (base + votes, multipliers ignored) is retired.
    score: float                # populated by build_praxis_out; the computed total
    metatask_points: int = 0    # populated by build_praxis_out
    display_multiplier: float = 1.0  # faction × duel collapsed; 1.0 when nothing applies
    points_from_votes: int = 0  # populated by build_praxis_out
    voter_count: int = 0        # populated by build_praxis_out via vote_tally
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    # duel_id is set when this praxis is a side of a duel (ADR-0011).
    duel_id: Optional[int] = None
    applied_metatasks: List[TaskOut] = []
    can_flag: bool = False      # populated by build_praxis_out; viewer-relative

    model_config = {"from_attributes": True}


class PraxisCardOut(BaseModel):
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
    # The author's portrait, for the card byline (#888). Relative media path or
    # "" — an empty string is the ordinary case (no portrait uploaded) and the
    # byline degrades to the shared monogram avatar, not a placeholder image.
    # Deliberately card-only: ``PraxisOut`` gets it if the detail byline ever
    # needs a face.
    created_by_avatar_url: str = ""
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish chip (#521, ADR-0012)
    member_count: int
    # The computed total — the one number a praxis has (ADR-0053, supersedes
    # ADR-0047). Computed for the praxis AUTHOR (created_by), not the viewer:
    # the card shows the points the praxis banked for whoever made it.
    #   score = (task_point_value + metatask_points) × display_multiplier
    #           + points_from_votes
    # ``display_multiplier`` is faction × duel collapsed into one value, for
    # every type including collab (one author → one faction → one multiplier).
    # Base is ``task_point_value`` above; there is no separate ``base_points``.
    score: float
    metatask_points: int = 0
    display_multiplier: float = 1.0
    points_from_votes: int = 0
    voter_count: int = 0
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    task_faction_slug: Optional[str] = None
    # Full-fidelity fields for bespoke mobile praxis cards (#573).
    body_text: Optional[str] = None
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline
    members: List[PraxisMemberOut] = []
    media_items: List[MediaItemOut] = []
    viewer_vote: Optional[int] = None  # the authenticated viewer's own cast value (1-5), None if unvoted/anonymous
    # Account-mate marker (#644 §7): the display name of another character on the
    # viewer's account who voted this praxis, set only when the carried character
    # did not vote it. None otherwise (incl. anonymous). Computed, no column.
    voted_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class PraxisCreate(BaseModel):
    task_id: int
    type: PraxisType = PraxisType.solo
    title: Optional[str] = None
    body_text: Optional[str] = None


class PraxisUpdate(BaseModel):
    title: Optional[str] = None
    body_text: Optional[str] = None


class PraxisTypeChange(BaseModel):
    """Body for the in-place solo↔collab mode switch (#321)."""

    type: PraxisType


class PraxisInviteCreate(BaseModel):
    invitee_id: int


class PraxisVoteIn(BaseModel):
    value: int
