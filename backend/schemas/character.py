from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CharacterOut(BaseModel):
    """Public character response. Stats (score, level, all_time_score) come from CharacterStats.

    votes_available is the on-read computed vote budget for the current era
    (see services.scoring.compute_votes_available); it reflects score growth
    and spent votes without a stored counter.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    bio: str
    avatar_url: str
    location: str
    level: int
    score: int
    all_time_score: int
    votes_available: int = 0
    faction_slug: str
    status: str
    created_at: datetime


class CharacterCreate(BaseModel):
    # username is optional: the server derives a unique @handle from display_name
    # when absent (ADR-0019). An explicit one is still accepted for back-compat.
    username: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=50)
    bio: str = Field(default="", max_length=500)
    avatar_url: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=100)
    # Optional starting faction. Born unaffiliated ("na") by default; a non-None
    # slug must be one the account holds an invitation for. "albescent" is never
    # a creation option (join-in-the-field only).
    faction_slug: str | None = Field(default=None, max_length=50)


class ActiveCharacterIn(BaseModel):
    character_id: int


class CharacterUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=50)
    bio: str | None = Field(None, max_length=500)
    avatar_url: str | None = Field(None, max_length=500)
    location: str | None = Field(None, max_length=100)
