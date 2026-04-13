from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MediaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    file_path: str
    display_order: int


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    character_id: int
    character_display_name: str = ""
    task_title: str = ""
    task_point_value: int = 0
    title: str
    body_text: Optional[str]
    is_flagged: bool
    collaboration_mode: str = "solo"
    partner_character_id: Optional[int] = None
    partner_display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    media: list[MediaItemOut] = []
    score: Optional[float] = None


class SubmissionCreate(BaseModel):
    task_id: int
    title: str = Field(..., max_length=200)
    body_text: Optional[str] = Field(None, max_length=10000)
    collaboration_mode: Optional[str] = "solo"
    partner_character_id: Optional[int] = None
