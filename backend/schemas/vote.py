from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    praxis_id: int
    voter_character_id: int
    value: int
    created_at: datetime
    updated_at: datetime


class VoteSummary(BaseModel):
    praxis_id: int
    total_votes: int
    total_score: float


class VoterDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    value: int
