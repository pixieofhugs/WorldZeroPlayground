from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from errors import ErrorCode, raise_coded
from dependencies import get_current_character
from models.character import Character
from models.relationship import RelationshipType
from schemas.block import BlockCreate, BlockListItem
from schemas.relationship import RelationshipCreate, RelationshipListItem
from services.block_service import block_character, list_blocks, unblock_character
from services.relationship_service import (
    build_relationship_item,
    create_relationship,
    list_relationships,
)

router = APIRouter()


# Blocks (ADR-0077): their own record, addressed by character, never by edge.


@router.get("/blocks", response_model=list[BlockListItem])
async def list_my_blocks(
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> list[BlockListItem]:
    """Outgoing blocks only: a block is silent to the blocked (ADR-0077)."""
    return await list_blocks(character_id=character.id, session=session)


@router.post("/blocks", response_model=BlockListItem, status_code=201)
async def block_character_route(
    data: BlockCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> BlockListItem:
    """Block a character; idempotent."""
    return await block_character(
        blocker=character,
        character_id=data.character_id,
        session=session,
    )


@router.delete("/blocks/{character_id}", status_code=204)
async def unblock_character_route(
    character_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> None:
    """Lift your block; restores no friend/foe edge (ADR-0077)."""
    await unblock_character(
        blocker=character,
        character_id=character_id,
        session=session,
    )


@router.get("", response_model=list[RelationshipListItem])
async def list_my_relationships(
    type: Optional[str] = None,
    status: Optional[str] = None,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> list[RelationshipListItem]:
    """Outgoing friend/foe declarations with their pairing's display status."""
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
    session: AsyncSession = Depends(get_db, scope="function"),
) -> RelationshipListItem:
    """Declare a friend or foe (instant); answers the enriched item (#1383)."""
    relationship = await create_relationship(
        from_character=character,
        to_character_id=data.to_character_id,
        rel_type=RelationshipType[data.type],
        session=session,
    )
    return await build_relationship_item(relationship, session)


@router.delete("/{relationship_id}", status_code=204)
async def delete_relationship(
    relationship_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
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
