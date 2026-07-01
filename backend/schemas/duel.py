from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from models.duel import DuelStatus


class DuelChallengeIn(BaseModel):
    """Body for POST /duels/challenge — attach a duel to an existing praxis."""
    challenger_praxis_id: int
    opponent_character_id: int


class DuelRespondIn(BaseModel):
    """Body for POST /duels/{duel_id}/respond — accept or decline."""
    accept: bool


class DuelOut(BaseModel):
    id: int
    task_id: int
    challenger_praxis_id: int
    opponent_character_id: int
    opponent_praxis_id: Optional[int]
    status: DuelStatus
    accepted_at: Optional[datetime]
    declined_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class DuelSideOut(BaseModel):
    """One side of a duel, shaped for the read page (#308).

    Display metadata + live vote points only — never the praxis body. A
    forfeited / unsubmitted side still renders (name, avatar) but ``is_submitted``
    is False; its body stays behind the normal in_progress 404 (ADR-0024).
    """
    praxis_id: Optional[int]
    character_id: int
    display_name: str
    faction_slug: str
    avatar_url: str
    points_from_votes: int
    is_submitted: bool


class DuelDetailOut(BaseModel):
    """Read-oriented duel view: both sides' display info + tallies in one call."""
    id: int
    task_id: int
    status: DuelStatus
    forfeited_by_character_id: Optional[int]
    challenger: DuelSideOut
    opponent: DuelSideOut
    viewer_is_participant: bool
