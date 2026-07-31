from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import (
    get_current_account_optional,
    get_current_character,
)
from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from schemas.faction import (
    FactionChoiceRequest,
    FactionOut,
    FactionPageOut,
    FactionStatusOut,
    InvitationLetterOut,
)
from services.auth import get_current_account
from services.character import ALBESCENT_FACTION_SLUG
from services.era import get_current_era_row
from services.faction_service import (
    defect_to_faction,
    get_invitation_status,
)
from models.invitation_letter import InvitationLetter

router = APIRouter()


@router.get("", response_model=list[FactionOut])
async def list_factions(
    account: Account | None = Depends(get_current_account_optional),
    session: AsyncSession = Depends(get_db),
):
    """Return all non-hidden factions.

    Albescent is a secret society (ADR-0027, #390): it is omitted unless the
    current account has been revealed to it. Optional auth — anonymous callers
    stay anonymous and never see Albescent.
    """
    result = await session.execute(
        select(Faction).where(Faction.status == FactionStatus.visible).order_by(Faction.slug)
    )
    factions = result.scalars().all()
    reveal_albescent = account is not None and account.albescent_revealed
    return [
        FactionOut.model_validate(faction)
        for faction in factions
        if faction.slug != ALBESCENT_FACTION_SLUG or reveal_albescent
    ]


@router.post("/choose", response_model=FactionOut)
async def choose_faction(
    data: FactionChoiceRequest,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Choose or defect to a new faction.

    Works for the initial faction join and later defections.
    Players cannot rejoin factions they have left, except UA Masters and Albescent.
    """
    updated_character = await defect_to_faction(
        character, data.faction_slug, session
    )
    faction = await session.get(Faction, updated_character.faction_slug)
    return FactionOut.model_validate(faction)


@router.get("/status", response_model=FactionPageOut)
async def get_faction_status(
    account: Account = Depends(get_current_account),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Return faction page data: current faction and status of all factions.

    Albescent (ADR-0027, #390) is omitted from ``all_factions`` unless this
    account has been revealed to the secret society.
    """
    era_row = await get_current_era_row(session)
    status_map = await get_invitation_status(
        character.id, era_row.id, session
    )
    all_factions = [
        FactionStatusOut(
            slug=slug,
            status=status,
        )
        for slug, status in status_map.items()
        if slug != ALBESCENT_FACTION_SLUG or account.albescent_revealed
    ]
    return FactionPageOut(
        current_faction_slug=character.faction_slug,
        all_factions=all_factions,
    )


@router.get("/invitations", response_model=list[InvitationLetterOut])
async def list_invitations(
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Return all invitation letters delivered to the current character."""
    era_row = await get_current_era_row(session)
    result = await session.execute(
        select(InvitationLetter).where(
            InvitationLetter.character_id == character.id,
            InvitationLetter.era_id == era_row.id,
        )
    )
    letters = result.scalars().all()
    return [
        InvitationLetterOut(
            faction_slug=letter.faction_slug,
            delivered_at=letter.delivered_at,
        )
        for letter in letters
    ]
