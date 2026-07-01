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
