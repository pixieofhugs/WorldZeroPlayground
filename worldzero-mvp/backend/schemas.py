from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Character ──────────────────────────────────────────────────────────────────

class CharacterCreate(BaseModel):
    username: str
    display_name: str
    bio: Optional[str] = None


class CharacterUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None


class CharacterOut(BaseModel):
    id: int
    username: str
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    level: int
    score: float
    all_time_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Task ───────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    point_value: int
    level_required: int
    status: str
    created_at: datetime
    submission_count: int = 0

    model_config = {"from_attributes": True}


# ── Submission ─────────────────────────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    task_id: int
    title: str
    body_text: str


class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    body_text: Optional[str] = None


class SubmissionOut(BaseModel):
    id: int
    task_id: int
    character_id: int
    title: str
    body_text: str
    score: float
    created_at: datetime
    updated_at: datetime
    character: CharacterOut
    vote_count: int = 0
    avg_stars: Optional[float] = None

    model_config = {"from_attributes": True}


class SubmissionSummary(BaseModel):
    id: int
    task_id: int
    character_id: int
    title: str
    score: float
    created_at: datetime
    character: CharacterOut
    vote_count: int = 0
    avg_stars: Optional[float] = None

    model_config = {"from_attributes": True}


# ── Vote ───────────────────────────────────────────────────────────────────────

class VoteCreate(BaseModel):
    stars: int


class VoteOut(BaseModel):
    id: int
    submission_id: int
    voter_character_id: int
    stars: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auth / Account ─────────────────────────────────────────────────────────────

class AccountOut(BaseModel):
    id: int
    email: str
    created_at: datetime
    character: Optional[CharacterOut] = None

    model_config = {"from_attributes": True}


# ── Leaderboard ────────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    username: str
    display_name: str
    level: int
    score: float

    model_config = {"from_attributes": True}
