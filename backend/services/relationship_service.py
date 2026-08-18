"""Service layer for character relationships (friends / foes).

Relationships are instant one-directional declarations. The combination of
A→B and B→A produces a display status (e.g. "Mutual Friends", "Tsundere").

An edge carries a type and nothing else that anyone reads: blocking lives in
``services/block_service.py`` on its own record (ADR-0077), and
``Relationship.status`` is a dormant column that is always ``active``.
"""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from schemas.relationship import RelationshipListItem


# -- Display status labels ----------------------------------------------------
# Computed from the pair of (outgoing_type, incoming_type).

DISPLAY_STATUS_MUTUAL_FRIENDS = "Mutual Friends"
DISPLAY_STATUS_RIVALS = "Rivals"
DISPLAY_STATUS_TSUNDERE = "Tsundere"
DISPLAY_STATUS_ONE_SIDED_FRIEND = "One-sided Friend"
DISPLAY_STATUS_ONE_SIDED_FOE = "One-sided Foe"
DISPLAY_STATUS_SECRET_ADMIRER = "Secret Admirer"
DISPLAY_STATUS_TARGETED = "Targeted"
DISPLAY_STATUS_UNKNOWN = "Unknown"


def compute_display_status(
    outgoing_type: Optional[str],
    incoming_type: Optional[str],
) -> str:
    """Derive the human-readable relationship label from both sides.

    Types only. There is no ``Blocked`` label and no status argument: ADR-0077
    moves the block onto its own record and makes it silent to the party it
    names, so a block changes nothing either party reads here.
    """
    if outgoing_type == "friend" and incoming_type == "friend":
        return DISPLAY_STATUS_MUTUAL_FRIENDS
    if outgoing_type == "foe" and incoming_type == "foe":
        return DISPLAY_STATUS_RIVALS
    if outgoing_type == "friend" and incoming_type == "foe":
        return DISPLAY_STATUS_TSUNDERE
    if outgoing_type == "foe" and incoming_type == "friend":
        return DISPLAY_STATUS_TSUNDERE
    if outgoing_type == "friend" and incoming_type is None:
        return DISPLAY_STATUS_ONE_SIDED_FRIEND
    if outgoing_type == "foe" and incoming_type is None:
        return DISPLAY_STATUS_ONE_SIDED_FOE
    if outgoing_type is None and incoming_type == "friend":
        return DISPLAY_STATUS_SECRET_ADMIRER
    if outgoing_type is None and incoming_type == "foe":
        return DISPLAY_STATUS_TARGETED
    return DISPLAY_STATUS_UNKNOWN


def _to_list_item(
    relationship: Relationship,
    target_character: Character,
    incoming_type: Optional[str],
) -> RelationshipListItem:
    """Assemble one display-ready edge.

    The item describes THE EDGE, not the viewer: ``to_*`` always names
    ``relationship.to_character_id`` and ``display_status`` is computed with this
    edge as the outgoing side. ``status`` is emitted but dormant — it is always
    ``active`` now that a block is its own record (ADR-0077), and the column
    survives only because dropping a value from a PG enum buys nothing.
    """
    outgoing_type = relationship.type.value
    outgoing_status = relationship.status.value
    return RelationshipListItem(
        id=relationship.id,
        from_character_id=relationship.from_character_id,
        to_character_id=relationship.to_character_id,
        type=outgoing_type,
        status=outgoing_status,
        created_at=relationship.created_at,
        to_display_name=target_character.display_name,
        to_avatar_url=target_character.avatar_url,
        to_faction_slug=target_character.faction_slug,
        display_status=compute_display_status(outgoing_type, incoming_type),
    )


async def build_relationship_item(
    relationship: Relationship,
    session: AsyncSession,
) -> RelationshipListItem:
    """Enrich one freshly-written edge into the shape the list route emits.

    ``POST /relationships`` answers with this rather than the bare row (#1383):
    every caller immediately re-ran ``GET /relationships`` for exactly these
    display fields, so the write already held the answer to the read that chased
    it. It served the two edge-addressed block shims too until #2021 retired
    them.
    """
    target_character = await session.get(Character, relationship.to_character_id)
    if target_character is None:
        raise HTTPException(status_code=404, detail="Target character not found.")

    reverse_result = await session.execute(
        select(Relationship).where(
            Relationship.from_character_id == relationship.to_character_id,
            Relationship.to_character_id == relationship.from_character_id,
        )
    )
    reverse = reverse_result.scalar_one_or_none()
    return _to_list_item(
        relationship,
        target_character,
        reverse.type.value if reverse else None,
    )


async def create_relationship(
    from_character: Character,
    to_character_id: int,
    rel_type: RelationshipType,
    session: AsyncSession,
) -> Relationship:
    """Create an instant active relationship declaration."""
    if to_character_id == from_character.id:
        raise HTTPException(status_code=422, detail="Cannot create a relationship with yourself.")

    target = await session.get(Character, to_character_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target character not found.")

    existing = await session.execute(
        select(Relationship).where(
            Relationship.from_character_id == from_character.id,
            Relationship.to_character_id == to_character_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Relationship already exists.")

    relationship = Relationship(
        from_character_id=from_character.id,
        to_character_id=to_character_id,
        type=rel_type,
        status=RelationshipStatus.active,
    )
    session.add(relationship)
    await session.flush()
    await session.refresh(relationship)
    return relationship


async def list_relationships(
    character_id: int,
    session: AsyncSession,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> list[RelationshipListItem]:
    """List outgoing relationships for a character with display status computed."""
    # Query outgoing relationships
    query = (
        select(Relationship, Character)
        .join(Character, Character.id == Relationship.to_character_id)
        .where(Relationship.from_character_id == character_id)
    )
    if type_filter is not None:
        query = query.where(Relationship.type == RelationshipType(type_filter))
    if status_filter is not None:
        query = query.where(Relationship.status == RelationshipStatus(status_filter))

    result = await session.execute(query)
    rows = result.all()

    if not rows:
        return []

    # Gather the reverse relationships in one query — their type is the whole of
    # what the display label needs (ADR-0077 took the block off this row).
    target_ids = [row[1].id for row in rows]
    reverse_query = select(Relationship).where(
        and_(
            Relationship.from_character_id.in_(target_ids),
            Relationship.to_character_id == character_id,
        )
    )
    reverse_result = await session.execute(reverse_query)
    reverse_map: dict[int, str] = {
        reverse_relationship.from_character_id: reverse_relationship.type.value
        for reverse_relationship in reverse_result.scalars().all()
    }

    items = []
    for relationship, target_character in rows:
        items.append(_to_list_item(
            relationship,
            target_character,
            reverse_map.get(target_character.id),
        ))

    return items
