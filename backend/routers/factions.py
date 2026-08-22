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
from schemas.auth import CurrentUser
from schemas.faction import (
    FactionChoiceRequest,
    FactionOut,
    FactionPageOut,
    FactionStatusOut,
    InvitationLetterOut,
)
from services.albescent_reveal import is_albescent_revealed
from services.auth import get_current_account
from services.character import ALBESCENT_FACTION_SLUG
from services.current_user import build_current_user
from services.era import get_current_era_row
from services.faction_service import (
    defect_to_faction,
    get_invitation_status,
)

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
    reveal_albescent = is_albescent_revealed(account)
    return [
        FactionOut.model_validate(faction)
        for faction in factions
        if faction.slug != ALBESCENT_FACTION_SLUG or reveal_albescent
    ]


@router.post("/choose", response_model=CurrentUser)
async def choose_faction(
    data: FactionChoiceRequest,
    account: Account = Depends(get_current_account),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Choose or defect to a new faction.

    Works for the initial faction join and later defections.
    Players cannot rejoin factions they have left, except UA Masters and Albescent.

    Answers the refreshed `CurrentUser`, not the faction row (#1383). Membership
    dresses the whole site off `/auth/me` — the faction slug, the level-jump
    allowance, the capability flags and the sticky `albescent_revealed` reveal
    move together — so all four callers threw the `{slug}` away and re-asked
    `/auth/me` for the object this handler is already positioned to build.
    """
    await defect_to_faction(character, data.faction_slug, session)
    return await build_current_user(account, session)


@router.get("/status", response_model=FactionPageOut)
async def get_faction_status(
    account: Account = Depends(get_current_account),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Return faction page data: current faction, per-faction status, and letters.

    Albescent (ADR-0027, #390) is omitted from ``all_factions`` unless this
    account has been revealed to the secret society.

    ``invitations`` is not filtered the same way, and does not need to be:
    ``_NON_INVITE_FACTION_SLUGS`` (services/character_stats.py) means no
    Albescent letter is ever delivered, so there is nothing here to leak. This
    array replaces ``GET /factions/invitations`` (#1384), which re-ran the same
    ``InvitationLetter`` select against the same character and era row that
    ``get_invitation_status`` already runs — and whose only caller paired the
    two requests anyway.
    """
    era_row = await get_current_era_row(session)
    status_map, letters = await get_invitation_status(
        character.id, era_row.id, session
    )
    all_factions = [
        FactionStatusOut(
            slug=slug,
            status=status,
        )
        for slug, status in status_map.items()
        if slug != ALBESCENT_FACTION_SLUG or is_albescent_revealed(account)
    ]
    return FactionPageOut(
        current_faction_slug=character.faction_slug,
        all_factions=all_factions,
        invitations=[InvitationLetterOut.model_validate(letter) for letter in letters],
    )
