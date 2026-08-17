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
    block_relationship,
    build_relationship_item,
    create_relationship,
    list_relationships,
    unblock_relationship,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Blocks (ADR-0077) — their own record, addressed by character, never by edge.
# ---------------------------------------------------------------------------


@router.get("/blocks", response_model=list[BlockListItem])
async def list_my_blocks(
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> list[BlockListItem]:
    """List the characters the authenticated character has blocked.

    Outgoing only. A block is silent to the party it names (ADR-0077), so there
    is no route, field or error anywhere that reports an *incoming* one.
    """
    return await list_blocks(character_id=character.id, session=session)


@router.post("/blocks", response_model=BlockListItem, status_code=201)
async def block_character_route(
    data: BlockCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> BlockListItem:
    """Block a character. No friend or foe declaration is needed or created.

    Idempotent — blocking someone already blocked answers the existing record.
    """
    return await block_character(
        blocker=character,
        character_id=data.character_id,
        session=session,
    )


@router.delete("/blocks/{character_id}", status_code=204)
async def unblock_character_route(
    character_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Lift a block. Only the character who created it can, and it restores
    nothing else — no friend or foe edge comes back with it (ADR-0077)."""
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
    session: AsyncSession = Depends(get_db),
) -> list[RelationshipListItem]:
    """List the authenticated character's outgoing friend and foe declarations,
    with the display status their pairing produces.

    Outgoing only, and blocks do not appear here at all — a block is its own
    record with its own route (ADR-0077).
    """
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
    """Block the other party to this relationship, addressed by the edge's id.

    Superseded by `POST /relationships/blocks`, which takes a character id and
    needs no edge (ADR-0077). Kept for one release while the client moves;
    retires with #1907.
    """
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
    """Lift this caller's block on the other party to this relationship,
    addressed by the edge's id.

    Superseded by `DELETE /relationships/blocks/{character_id}` (ADR-0077).
    Kept for one release while the client moves; retires with #1907. Only the
    blocker's own record is deleted, and no edge changes.
    """
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
