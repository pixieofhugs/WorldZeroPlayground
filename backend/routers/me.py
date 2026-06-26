"""Account-scoped "my lives" endpoints (ADR-0019, #270).

Distinct from /characters (public roster): these read the authenticated account's
own characters and which life it is currently carrying.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.account import Account
from schemas.auth import CurrentUser
from schemas.character import ActiveCharacterIn, CharacterOut
from services.auth import get_current_account
from services.character import (
    build_character_out,
    get_account_invited_faction_slugs,
    list_account_roster,
    set_active_character,
)
from services.current_user import build_current_user

router = APIRouter()


@router.get("/characters", response_model=list[CharacterOut])
async def my_characters(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """The account's own roster — active + paused lives, carried life first."""
    rows = await list_account_roster(account, session)
    return [build_character_out(character, stats) for character, stats in rows]


@router.post("/active-character", response_model=CurrentUser)
async def switch_active_character(
    data: ActiveCharacterIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """Carry a different owned, active life; return the refreshed current user."""
    await set_active_character(account, data.character_id, session)
    return await build_current_user(account, session)


@router.get("/invited-factions", response_model=list[str])
async def my_invited_factions(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """Faction slugs the account holds a current-era invitation for (empty until #272)."""
    return await get_account_invited_faction_slugs(account.id, session)
