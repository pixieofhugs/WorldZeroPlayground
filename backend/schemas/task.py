from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    point_value: int
    level_required: int
    status: str
    task_type: str
    created_by: int
    primary_faction_slug: str
    metatask_faction_slug: Optional[str] = None
    is_task_vision_eligible: bool
    created_at: datetime


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    point_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
    primary_faction_slug: Optional[str] = None
    # Metatask fields — optional; defaults to a standard task.
    task_type: Optional[str] = None
    metatask_faction_slug: Optional[str] = None


class CharacterTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task: TaskOut
    status: str
    signed_up_at: datetime


class TaskSignupOut(BaseModel):
    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    status: str
    signed_up_at: datetime
