from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


class AccountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime


class CharacterBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    faction_slug: str
    status: str


class AccountDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    status: str
    created_at: datetime
    characters: list[CharacterBrief]


class CharacterSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    username: str
    display_name: str
    faction_slug: str
    status: str
    score: int
    level: int
    votes_available: int
    created_at: datetime


class OverviewStats(BaseModel):
    accounts: int
    characters: int
    active_tasks: int
    submissions: int
    votes: int


# ---------------------------------------------------------------------------
# Seed / Insert
# ---------------------------------------------------------------------------


class FactionCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=30, pattern=r"^[a-z0-9_-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    hidden: bool = False


class FactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    description: str
    status: str
    created_at: datetime


class AdminCharacterCreate(BaseModel):
    account_id: int
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., max_length=50)
    bio: str = Field(default="", max_length=500)
    avatar_url: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=100)
    faction_slug: str = Field(default="ua")


# ---------------------------------------------------------------------------
# Adjust Game State
# ---------------------------------------------------------------------------


class CharacterStatsPatch(BaseModel):
    """All fields optional — only supplied fields are updated."""

    level: int | None = Field(None, ge=0)
    score: int | None = Field(None, ge=0)
    all_time_score: int | None = Field(None, ge=0)
    votes_available: int | None = Field(None, ge=0)


class CharacterStatsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    character_id: int
    era_id: int
    score: int
    all_time_score: int
    level: int
    votes_available: int


# ---------------------------------------------------------------------------
# Role & Account Management
# ---------------------------------------------------------------------------


class RoleAction(BaseModel):
    role: str = Field(..., min_length=1, max_length=50)
    action: Literal["grant", "revoke"]


class SuspendAction(BaseModel):
    suspended: bool


# ---------------------------------------------------------------------------
# CLI Auth
# ---------------------------------------------------------------------------


class CliTokenResponse(BaseModel):
    access_token: str
