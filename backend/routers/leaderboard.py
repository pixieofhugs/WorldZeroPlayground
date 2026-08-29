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
    session: AsyncSession = Depends(get_db),
    account: Optional[Account] = Depends(get_current_account_optional),
    viewer_is_admin: bool = Depends(get_viewer_is_admin),
):
    """Top characters by current era score, optionally filtered by faction.

    Auth is **optional** and always was in effect — this is a public board and
    anonymous callers must keep getting an answer. The account is read for one
    thing: a caller revealed to Albescent may ask for that roster directly
    rather than getting the Unaffiliated fold (#2422).
    """
    rows = await list_characters_for_viewer(
        session,
        faction_slug=faction,
        viewer_account=account,
        # An admin counts as revealed for that question and no other (#2400).
        viewer_is_admin=viewer_is_admin,
        limit=limit,
        offset=offset,
    )
    return await build_character_outs(rows, session)
