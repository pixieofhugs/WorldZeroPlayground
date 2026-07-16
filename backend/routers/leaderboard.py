from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from schemas.character import CharacterOut
from services.character import build_character_outs, list_characters_for_viewer

router = APIRouter()


@router.get("", response_model=list[CharacterOut])
async def get_leaderboard(
    faction: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
):
    """Top characters by current era score, optionally filtered by faction."""
    rows = await list_characters_for_viewer(
        session, faction_slug=faction, limit=limit, offset=offset
    )
    return await build_character_outs(rows, session)
