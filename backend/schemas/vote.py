from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VoteIn(BaseModel):
    stars: int = Field(..., ge=1, le=5)


class VoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    voter_character_id: int
    stars: int
    created_at: datetime
    updated_at: datetime


class VoteSummary(BaseModel):
    submission_id: int
    total_votes: int
    average_stars: float
    total_score: float


class VoterDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    stars: int
