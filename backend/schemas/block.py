"""Wire shapes for the block record (ADR-0077).

Deliberately not a relationship shape. A block carries no ``type``, no
``status`` and no ``display_status``: it is not an edge, and the label it used
to produce is exactly what ADR-0077 ruling 2 removed.
"""
from datetime import datetime

from schemas.base import WireModel


class BlockCreate(WireModel):
    character_id: int


class BlockListItem(WireModel):
    """One character this viewer has blocked, enriched for the profile card.

    Emitted only to the blocker — an incoming block has no wire shape at all,
    because the blocked party must not be able to read one.
    """

    character_id: int
    display_name: str
    avatar_url: str
    faction_slug: str
    created_at: datetime
