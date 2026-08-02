import enum
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class RelationshipTypeEnum(str, enum.Enum):
    friend = "friend"
    foe = "foe"


RelationshipDisplayStatus = Literal[
    "Mutual Friends",
    "Rivals",
    "Tsundere",
    "One-sided Friend",
    "One-sided Foe",
    "Secret Admirer",
    "Targeted",
    "Blocked",
    "Unknown",
]


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
    # The reverse edge's type is NOT emitted (#1387): `display_status` is the
    # server's word on what the pair of edges means, and was the only thing read.
    display_status: RelationshipDisplayStatus
