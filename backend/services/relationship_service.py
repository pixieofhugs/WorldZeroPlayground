"""Service layer for character relationships (friends / foes).

Relationships are instant one-directional declarations. The combination of
A→B and B→A produces a display status (e.g. "Mutual Friends", "Tsundere").
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
    """Derive the human-readable relationship label from both sides."""
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
    await session.commit()
    await session.refresh(relationship)
    return relationship


async def block_relationship(
    relationship_id: int,
    character: Character,
    session: AsyncSession,
) -> Relationship:
    """Block a relationship. Either party can block."""
    relationship = await session.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="Relationship not found.")
    if character.id not in (relationship.from_character_id, relationship.to_character_id):
        raise HTTPException(status_code=403, detail="Not a party to this relationship.")

    relationship.status = RelationshipStatus.blocked
    await session.commit()
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

    # Gather the reverse relationships in one query
    target_ids = [row[1].id for row in rows]
    reverse_query = select(Relationship).where(
        and_(
            Relationship.from_character_id.in_(target_ids),
            Relationship.to_character_id == character_id,
            Relationship.status == RelationshipStatus.active,
        )
    )
    reverse_result = await session.execute(reverse_query)
    reverse_map: dict[int, str] = {
        reverse_relationship.from_character_id: reverse_relationship.type.value
        for reverse_relationship in reverse_result.scalars().all()
    }

    items = []
    for relationship, target_character in rows:
        outgoing_type = relationship.type.value
        incoming_type = reverse_map.get(target_character.id)
        items.append(RelationshipListItem(
            id=relationship.id,
            from_character_id=relationship.from_character_id,
            to_character_id=relationship.to_character_id,
            type=outgoing_type,
            status=relationship.status.value,
            created_at=relationship.created_at,
            to_display_name=target_character.display_name,
            to_avatar_url=target_character.avatar_url,
            to_faction_slug=target_character.faction_slug,
            reverse_type=incoming_type,
            display_status=compute_display_status(outgoing_type, incoming_type),
        ))

    return items
