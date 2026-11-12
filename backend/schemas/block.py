"""Block record shapes (ADR-0077); not an edge, so no type/status fields."""
from datetime import datetime

from schemas.base import WireModel


class BlockCreate(WireModel):
    character_id: int


class BlockListItem(WireModel):
    """A character the viewer blocked; only ever sent to the blocker."""

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    created_at: datetime
