from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from schemas.auth import CurrentUser
from schemas.faction import (
    FactionChoiceRequest,
    FactionOut,
    FactionPageOut,
    FactionStatusOut,
    InvitationLetterOut,
)
from services.auth import get_current_account
from services.current_user import build_current_user
from services.era import get_current_era_row
from services.faction_service import (
    defect_to_faction,
    get_invitation_status,
    load_move_facts,
    move_refusal,
)

router = APIRouter()


@router.get("", response_model=list[FactionOut])
async def list_factions(session: AsyncSession = Depends(get_db, scope="function")):
    """All non-hidden factions, Albescent included for everyone (ADR-0082).

    Secrecy is redaction at render (``utils/factions.ts``), not omission here.
    ``FactionOut`` is ``{slug, status}``, so only the slug ships.
    """
    result = await session.execute(
        select(Faction).where(Faction.status == FactionStatus.visible).order_by(Faction.slug)
    )
    return [FactionOut.model_validate(faction) for faction in result.scalars().all()]


@router.post("/choose", response_model=CurrentUser)
async def choose_faction(
    data: FactionChoiceRequest,
    account: Account = Depends(get_current_account),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Join or defect to a faction; no rejoining a left one, except Albescent.

    Answers the refreshed `CurrentUser` (#1383): membership changes it wholesale.
    """
    await defect_to_faction(character, data.faction_slug, session)
    return await build_current_user(account, session)


@router.get("/status", response_model=FactionPageOut)
async def get_faction_status(
    account: Account = Depends(get_current_account),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Faction page data: current faction, per-faction status, and letters.

    ``all_factions`` includes Albescent for everyone, matching ``list_factions``
    (ADR-0082). ``joinable`` is ``move_refusal``'s answer (#3168). No Albescent
    letter is ever delivered (``_NON_INVITE_FACTION_SLUGS``), so nothing leaks.
    """
    era_row = await get_current_era_row(session)
    status_map, letters, defections = await get_invitation_status(
        character.id, era_row.id, session
    )
    facts = await load_move_facts(
        character, era_row.id, session, defections=defections, letters=letters
    )
    all_factions = [
        FactionStatusOut(
            slug=slug,
            status=status,
            joinable=move_refusal(slug, facts) is None,
        )
        for slug, status in status_map.items()
    ]
    return FactionPageOut(
        current_faction_slug=character.faction_slug,
        all_factions=all_factions,
        invitations=[InvitationLetterOut.model_validate(letter) for letter in letters],
    )
