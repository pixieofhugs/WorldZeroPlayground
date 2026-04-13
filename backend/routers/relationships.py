import enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from db import get_db
from dependencies import get_current_character
from models.character import Character
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from schemas.relationship import RelationshipCreate, RelationshipDetailOut, RelationshipOut

router = APIRouter()


class RelationshipAction(str, enum.Enum):
    ACCEPT = "accept"
    DECLINE = "decline"
    BLOCK = "block"


class RelationshipUpdate(BaseModel):
    action: RelationshipAction


@router.get("", response_model=list[RelationshipDetailOut])
async def list_relationships(
    status: Optional[str] = Query(None, description="Filter by status: pending, accepted, blocked"),
    type: Optional[str] = Query(None, description="Filter by type: friend, foe"),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """List all relationships where the current character is either sender or recipient."""
    from_char = aliased(Character, name="from_char")
    to_char = aliased(Character, name="to_char")

    query = (
        select(
            Relationship,
            from_char.display_name.label("from_display_name"),
            from_char.faction_slug.label("from_faction_slug"),
            to_char.display_name.label("to_display_name"),
            to_char.faction_slug.label("to_faction_slug"),
        )
        .join(from_char, Relationship.from_character_id == from_char.id)
        .join(to_char, Relationship.to_character_id == to_char.id)
        .where(
            or_(
                Relationship.from_character_id == character.id,
                Relationship.to_character_id == character.id,
            )
        )
    )

    if status:
        query = query.where(Relationship.status == RelationshipStatus[status])
    if type:
        query = query.where(Relationship.type == RelationshipType[type])

    query = query.order_by(Relationship.created_at.desc())
    result = await session.execute(query)
    rows = result.all()

    return [
        RelationshipDetailOut(
            id=row.Relationship.id,
            from_character_id=row.Relationship.from_character_id,
            to_character_id=row.Relationship.to_character_id,
            type=row.Relationship.type.value,
            status=row.Relationship.status.value,
            created_at=row.Relationship.created_at,
            from_character_display_name=row.from_display_name,
            from_character_faction_slug=row.from_faction_slug,
            to_character_display_name=row.to_display_name,
            to_character_faction_slug=row.to_faction_slug,
        )
        for row in rows
    ]


@router.post("", response_model=RelationshipOut, status_code=201)
async def create_relationship(
    data: RelationshipCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if data.to_character_id == character.id:
        raise HTTPException(status_code=422, detail="Cannot create a relationship with yourself.")

    # Check for existing relationship
    existing = await session.execute(
        select(Relationship).where(
            Relationship.from_character_id == character.id,
            Relationship.to_character_id == data.to_character_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Relationship already exists.")

    rel = Relationship(
        from_character_id=character.id,
        to_character_id=data.to_character_id,
        type=RelationshipType[data.type],
        status=RelationshipStatus.pending,
    )
    session.add(rel)
    await session.commit()
    await session.refresh(rel)
    return RelationshipOut.model_validate(rel)


@router.put("/{relationship_id}", response_model=RelationshipOut)
async def update_relationship(
    relationship_id: int,
    data: RelationshipUpdate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    rel = await session.get(Relationship, relationship_id)
    if rel is None:
        raise HTTPException(status_code=404, detail="Relationship not found.")

    # Only the recipient can accept/decline; either party can block
    if data.action in (RelationshipAction.ACCEPT, RelationshipAction.DECLINE) and rel.to_character_id != character.id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept or decline.")
    if data.action == RelationshipAction.BLOCK and character.id not in (rel.from_character_id, rel.to_character_id):
        raise HTTPException(status_code=403, detail="Not a party to this relationship.")

    if data.action == RelationshipAction.ACCEPT:
        rel.status = RelationshipStatus.accepted
    elif data.action == RelationshipAction.DECLINE:
        rel.status = RelationshipStatus.blocked
    elif data.action == RelationshipAction.BLOCK:
        rel.status = RelationshipStatus.blocked

    await session.commit()
    await session.refresh(rel)
    return RelationshipOut.model_validate(rel)


@router.delete("/{relationship_id}", status_code=204)
async def delete_relationship(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    rel = await session.get(Relationship, relationship_id)
    if rel is None:
        raise HTTPException(status_code=404, detail="Relationship not found.")
    if character.id not in (rel.from_character_id, rel.to_character_id):
        raise HTTPException(status_code=403, detail="Not a party to this relationship.")
    await session.delete(rel)
    await session.commit()
