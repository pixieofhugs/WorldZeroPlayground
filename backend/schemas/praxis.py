from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MediaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    file_path: str
    display_order: int


class PraxisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    character_id: int
    # Denormalized display fields — populated from relationships, never None once a Praxis is persisted.
    character_display_name: str
    task_title: str
    task_point_value: int
    task_faction_slug: Optional[str] = None
    title: str
    body_text: Optional[str]
    moderation_status: str = "visible"
    is_withdrawn: bool = False
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    media: list[MediaItemOut] = []
    score: Optional[float] = None


class PraxisCreate(BaseModel):
    task_id: int
    title: str = Field(..., max_length=200)
    body_text: Optional[str] = Field(None, max_length=10000)
