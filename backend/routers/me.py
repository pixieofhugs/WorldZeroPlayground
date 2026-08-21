"""Account-scoped "my lives" endpoints (ADR-0019, #270).

Distinct from /characters (public roster): these read the authenticated account's
own characters and which life it is currently carrying.
"""
from dataclasses import asdict
from typing import Callable

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_session_factory
from models.account import Account
from models.praxis import PraxisStatus
from schemas.activity_feed import ACTIVITY_FEED_ITEM_ADAPTER
from schemas.auth import CurrentUser
from schemas.character import ActiveCharacterIn, CharacterOut
from schemas.sidebar import SidebarOut
from services.activity_feed import get_sidebar_feed
from services.auth import get_current_account
from services.character import (
    build_character_out,
    get_account_invited_faction_slugs,
    list_account_roster,
    resolve_active_character,
    set_active_character,
)
from services.current_user import build_current_user
from services.praxis import list_praxes
from services.praxis_out import build_praxis_cards

router = APIRouter()


@router.get("/characters", response_model=list[CharacterOut])
async def my_characters(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """The account's own roster — every non-banned life, carried life first."""
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
    """Faction slugs a new life on this account may be born into (ADR-0019).

    Not just live invitation letters: since #2385 this also counts any faction
    an existing life on the account currently holds or has ever held this era.
    Walking out burns the door for *that* character, not for the account.
    """
    return await get_account_invited_faction_slugs(account.id, session)


@router.get("/sidebar", response_model=SidebarOut)
async def my_sidebar(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
    session_factory: Callable = Depends(get_session_factory),
) -> SidebarOut:
    """Everything the desktop rail's three data panels draw, in one request (#1344).

    The rail used to make three, and every one of them waited on ``/auth/me``
    resolving first — for no reason: none of the three needed anything from the
    client, since this route resolves the viewer from the JWT itself. The client
    now fires this in the first wave, before it knows whether anyone is signed
    in, which is why a guest's answer here is a plain 401 and why the frontend
    excludes this URL from its expired-session redirect.

    An account with no character yet gets 200 and three empty panels, not 403:
    the rail renders for them — it draws the "no character" card — so empty is
    the answer, not an error.
    """
    character = await resolve_active_character(account, session)
    if character is None:
        return SidebarOut(
            pending_requests_count=0,
            global_activity=[],
            global_activity_count=0,
            active_praxes=[],
        )

    (
        pending_requests_count,
        global_activity,
        global_activity_count,
    ) = await get_sidebar_feed(
        character_id=character.id,
        session=session,
        session_factory=session_factory,
    )
    # Membership-scoped, not authorship: an accepted collab invite is in-flight
    # work too, and the slot count it sits under counts memberships.
    active_praxes = await list_praxes(
        session=session,
        member_id=character.id,
        status=PraxisStatus.in_progress,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    return SidebarOut(
        pending_requests_count=pending_requests_count,
        global_activity=[
            ACTIVITY_FEED_ITEM_ADAPTER.validate_python(asdict(item))
            for item in global_activity
        ],
        global_activity_count=global_activity_count,
        active_praxes=await build_praxis_cards(active_praxes, session, character),
    )
