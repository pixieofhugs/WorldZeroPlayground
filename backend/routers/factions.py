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
)

router = APIRouter()


@router.get("", response_model=list[FactionOut])
async def list_factions(session: AsyncSession = Depends(get_db)):
    """Return all non-hidden factions — Albescent included, for everyone.

    **This listing is no longer reveal-gated (#2409, ADR-0082.)** Albescent is
    still a secret society, but secrecy is now expressed as REDACTION at the
    render rather than as omission at the wire: the eighth row ships to every
    caller and ``utils/factions.ts`` resolves its every string to ``[REDACTED]``
    for a viewer ``/auth/me`` has not revealed. Hiding a row taught an
    unrevealed player nothing; a row they can see and cannot read is the locked
    door with no keyhole the mechanic is actually about.

    The optional-auth dependency went with the filter. It existed to answer one
    question — "is this viewer revealed?" — and this handler no longer asks it,
    so resolving an account here would be a read nothing consumes. The predicate
    itself is untouched and still governs the surfaces that DO ask
    (``services.progression``, ``faction_slugs``, ``services.current_user``);
    what changed is that the faction directory stopped being one of them.

    What this handler is NOT is a redaction point. ``FactionOut`` is
    ``{slug, status}`` and carries no prose, so serving the row leaks the slug
    and nothing else — the same slug the wire has always carried on every
    Albescent-authored task and praxis. Whether ``/factions`` should one day
    serve a *redacted row* rather than the real one, so the tease survives a
    reader of the network tab, is the follow-on ADR-0082 names and does not
    settle.
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
    session: AsyncSession = Depends(get_db),
):
    """Choose or defect to a new faction.

    Works for the initial faction join and later defections.
    Players cannot rejoin factions they have left, except Albescent.

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

    ``all_factions`` carries Albescent for every caller since #2409 — the same
    move ``list_factions`` makes, and it has to be the same move or the two
    payloads the directory joins would disagree about how many cards there are.
    The status this row reports is the ordinary invite-gated one, so an
    unrevealed viewer reads ``not_invited`` and draws a LOCKED tile whose every
    string redacts. Reveal governs the word; ``defect_to_faction``'s eligibility
    guard still governs the door (ADR-0082).

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
        FactionStatusOut(slug=slug, status=status)
        for slug, status in status_map.items()
    ]
    return FactionPageOut(
        current_faction_slug=character.faction_slug,
        all_factions=all_factions,
        invitations=[InvitationLetterOut.model_validate(letter) for letter in letters],
    )
