from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_account_optional, get_viewer_is_admin
from models.account import Account
from schemas.character import CharacterOut
from services.character import build_character_outs, list_characters_for_viewer

router = APIRouter()


@router.get("", response_model=list[CharacterOut])
async def get_leaderboard(
    faction: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db, scope="function"),
    account: Optional[Account] = Depends(get_current_account_optional),
    viewer_is_admin: bool = Depends(get_viewer_is_admin),
):
    """Top characters by current era score, optionally filtered by faction.

    Public; optional auth only feeds the reveal check (#2422).
    """
    rows = await list_characters_for_viewer(
        session,
        faction_slug=faction,
        viewer_account=account,
        # Admins count as revealed here only (#2400).
        viewer_is_admin=viewer_is_admin,
        limit=limit,
        offset=offset,
    )
    return await build_character_outs(rows, session)
