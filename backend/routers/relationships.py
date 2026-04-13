from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.character import Character
from models.relationship import RelationshipType
from schemas.relationship import RelationshipCreate, RelationshipListItem, RelationshipOut
from services.relationship_service import block_relationship, create_relationship, list_relationships

router = APIRouter()


@router.get("", response_model=list[RelationshipListItem])
async def list_my_relationships(
    type: Optional[str] = None,
    status: Optional[str] = None,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> list[RelationshipListItem]:
    """List the authenticated character's outgoing relationships with display status."""
    return await list_relationships(
        character_id=character.id,
        session=session,
        type_filter=type,
        status_filter=status,
    )


@router.post("", response_model=RelationshipOut, status_code=201)
async def create_relationship_route(
    data: RelationshipCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> RelationshipOut:
    """Declare a friend or foe relationship (instant, no pending state)."""
    relationship = await create_relationship(
        from_character=character,
        to_character_id=data.to_character_id,
        rel_type=RelationshipType[data.type],
        session=session,
    )
    return RelationshipOut.model_validate(relationship)


@router.put("/{relationship_id}", response_model=RelationshipOut)
async def block_relationship_route(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> RelationshipOut:
    """Block a relationship. Either party can block."""
    relationship = await block_relationship(
        relationship_id=relationship_id,
        character=character,
        session=session,
    )
    return RelationshipOut.model_validate(relationship)


@router.delete("/{relationship_id}", status_code=204)
async def delete_relationship(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Remove a relationship. Only the declaring party can delete."""
    from models.relationship import Relationship

    relationship = await session.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="Relationship not found.")
    if relationship.from_character_id != character.id:
        raise HTTPException(status_code=403, detail="Only the declaring party can delete a relationship.")
    await session.delete(relationship)
    await session.commit()
