import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class RelationshipTypeEnum(str, enum.Enum):
    friend = "friend"
    foe = "foe"


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_character_id: int
    to_character_id: int
    type: str
    status: str
    created_at: datetime


class RelationshipDetailOut(BaseModel):
    """Enriched relationship with character display data — avoids N+1 on frontend."""

    id: int
    from_character_id: int
    to_character_id: int
    type: str
    status: str
    created_at: datetime
    from_character_display_name: str
    from_character_faction_slug: Optional[str]
    to_character_display_name: str
    to_character_faction_slug: Optional[str]


class RelationshipCreate(BaseModel):
    to_character_id: int
    type: RelationshipTypeEnum


class RelationshipListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_character_id: int
    to_character_id: int
    type: str
    status: str
    created_at: datetime
    to_display_name: str
    to_avatar_url: str
    to_faction_slug: str
    reverse_type: Optional[str] = None
    display_status: str
