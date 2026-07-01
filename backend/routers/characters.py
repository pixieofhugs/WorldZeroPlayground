import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

logger = logging.getLogger(__name__)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from dependencies import get_current_character, get_current_character_optional
from models.account import Account
from models.character import Character, CharacterStatus
from models.relationship import Relationship
from models.praxis import Praxis
from models.vote import Vote
from schemas.character import CharacterCreate, CharacterOut, CharacterUpdate
from schemas.relationship import RelationshipOut
from schemas.praxis import PraxisOut
from services.auth import get_current_account
from services.character import (
    CharacterCreationResult,
    build_character_out,
    create_character,
    list_characters_for_viewer,
    soft_delete_character,
    update_character,
)
from services.era import load_current_era_stats
from services.media import process_and_save_avatar
from services.praxis import build_praxis_out, praxis_visibility_condition

router = APIRouter()


@router.get("", response_model=list[CharacterOut])
async def list_characters(
    search: Optional[str] = None,
    faction: Optional[str] = None,
    exclude_active_task_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
):
    """List all active characters. Optionally filter by name or faction.

    ``exclude_active_task_id`` hides players already active on that task (invite
    search pre-filter, #320).
    """
    rows = await list_characters_for_viewer(
        session,
        search=search,
        faction_slug=faction,
        exclude_active_task_id=exclude_active_task_id,
        limit=limit,
        offset=offset,
    )
    return [build_character_out(character, stats) for character, stats in rows]


@router.get("/{character_id}", response_model=CharacterOut)
async def get_character(
    character_id: int,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Character).where(
            Character.id == character_id,
            Character.status == CharacterStatus.active,
        )
    )
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    stats = await load_current_era_stats(character_id, session)
    return build_character_out(character, stats)


@router.post("", response_model=CharacterOut, status_code=201)
async def create_character_route(
    data: CharacterCreate,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    result: CharacterCreationResult = await create_character(account.id, data, session)
    return build_character_out(result.character, result.stats)


@router.put("/{character_id}", response_model=CharacterOut)
async def update_character_route(
    character_id: int,
    data: CharacterUpdate,
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot edit another character.")
    character = await update_character(character_id, data, session)
    stats = await load_current_era_stats(character_id, session)
    return build_character_out(character, stats)


@router.delete("/{character_id}", status_code=204)
async def delete_character_route(
    character_id: int,
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character.")
    await soft_delete_character(character_id, session)


@router.get("/{character_id}/praxes", response_model=list[PraxisOut])
async def get_character_praxes(
    character_id: int,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    # ADR-0024: an in_progress praxis is member-only, so a profile grid shows
    # another character's drafts only when the viewer is a member.
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(
            Praxis.created_by_id == character_id,
            praxis_visibility_condition(viewer.id if viewer else None),
        )
        .order_by(Praxis.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    praxis_list = result.scalars().all()
    return [await build_praxis_out(praxis, session) for praxis in praxis_list]


@router.post("/{character_id}/avatar", response_model=CharacterOut)
async def upload_avatar(
    character_id: int,
    file: UploadFile = File(...),
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot update another character's avatar.")
    character = current_character
    character.avatar_url = await process_and_save_avatar(file, character_id)
    await session.flush()
    await session.refresh(character)
    stats = await load_current_era_stats(character_id, session)
    return build_character_out(character, stats)


@router.get("/{character_id}/relationships", response_model=list[RelationshipOut])
async def get_character_relationships(
    character_id: int,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Relationship).where(
            (Relationship.from_character_id == character_id)
            | (Relationship.to_character_id == character_id)
        )
    )
    relationships = result.scalars().all()
    return [RelationshipOut.model_validate(relationship) for relationship in relationships]


@router.get("/{character_id}/stats/votes-received")
async def get_votes_received_count(
    character_id: int,
    session: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Return the total number of votes received on all of a character's praxes."""
    result = await session.execute(
        select(func.count())
        .select_from(Vote)
        .join(Praxis, Vote.praxis_id == Praxis.id)
        .where(Praxis.created_by_id == character_id)
    )
    count = result.scalar_one()
    return {"character_id": character_id, "votes_received": count}
