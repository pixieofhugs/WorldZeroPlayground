from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from errors import ErrorCode, raise_coded
from dependencies import get_current_character
from models.character import Character
from models.relationship import RelationshipType
from schemas.relationship import RelationshipCreate, RelationshipListItem
from services.relationship_service import (
    block_relationship,
    build_relationship_item,
    create_relationship,
    list_relationships,
    unblock_relationship,
)

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


@router.post("", response_model=RelationshipListItem, status_code=201)
async def create_relationship_route(
    data: RelationshipCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> RelationshipListItem:
    """Declare a friend or foe relationship (instant, no pending state).

    Answers the enriched item, not the bare row (#1383): the display name,
    avatar, faction and derived ``display_status`` are what the profile draws,
    and it used to re-list every relationship the viewer holds to get them.
    """
    relationship = await create_relationship(
        from_character=character,
        to_character_id=data.to_character_id,
        rel_type=RelationshipType[data.type],
        session=session,
    )
    return await build_relationship_item(relationship, session)


@router.put("/{relationship_id}", response_model=RelationshipListItem)
async def block_relationship_route(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> RelationshipListItem:
    """Block a relationship. Either party can block."""
    relationship = await block_relationship(
        relationship_id=relationship_id,
        character=character,
        session=session,
    )
    return await build_relationship_item(relationship, session)


@router.post("/{relationship_id}/unblock", response_model=RelationshipListItem)
async def unblock_relationship_route(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> RelationshipListItem:
    """Reverse a block. Either party can unblock; the edge returns to active.
    Separate route from PUT /{id} (block) so the two actions don't collide.

    ADR-0009, superseded by ADR-0077 — under which a block is its own record
    and unblock is that record's deletion, authored by the blocker alone. This
    route still implements ADR-0009."""
    relationship = await unblock_relationship(
        relationship_id=relationship_id,
        character=character,
        session=session,
    )
    return await build_relationship_item(relationship, session)


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
        raise_coded(404, ErrorCode.relationship_not_found, "Relationship not found.")
    if relationship.from_character_id != character.id:
        raise_coded(
            403,
            ErrorCode.relationship_not_declarer,
            "Only the declaring party can delete a relationship.",
        )
    await session.delete(relationship)
    await session.flush()
