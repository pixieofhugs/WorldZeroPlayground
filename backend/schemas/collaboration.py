from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CollaborationCreate(BaseModel):
    task_id: int
    mode: str  # "collaboration" or "duel"


class CollaborationMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    character_id: int
    display_name: str
    faction_slug: str
    has_submitted: bool
    joined_at: datetime


class CollaborationInviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collaboration_id: int
    inviter_id: int
    inviter_display_name: str
    invitee_id: int
    invitee_display_name: str
    type: str
    status: str
    created_at: datetime


class CollaborationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    task_title: str
    task_point_value: int
    mode: str
    status: str
    body_text: str
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    members: list[CollaborationMemberOut] = []
    # Invites only included when the viewer is a member (populated at service layer)
    invites: list[CollaborationInviteOut] = []


class CollaborationInviteCreate(BaseModel):
    invitee_character_id: int


class InviteResponse(BaseModel):
    accept: bool
    # If the invitee's task list is full, they must supply a task_id to drop before accepting.
    drop_task_id: Optional[int] = None


class CollaborationDocumentUpdate(BaseModel):
    body_text: str = Field(..., max_length=50000)


class DuelVoteSummary(BaseModel):
    character_id: int
    display_name: str
    total_stars: int
    is_winning: bool


class CollaborationVoteIn(BaseModel):
    target_character_id: int
    stars: int = Field(..., ge=1, le=5)
