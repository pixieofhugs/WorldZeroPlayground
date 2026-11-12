"""Account-scoped "my lives" endpoints (ADR-0019); /characters is the public roster."""
from dataclasses import asdict
from typing import Callable

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_session_factory
from models.account import Account
from models.praxis import PraxisStatus
from schemas.activity_feed import ACTIVITY_FEED_ITEM_ADAPTER
from schemas.airports import NearbyAirportsOut
from schemas.auth import CurrentUser
from schemas.character import ActiveCharacterIn, CharacterOut
from schemas.notification_prefs import (
    NotificationPrefOut,
    NotificationPrefsIn,
    NotificationPrefsOut,
)
from schemas.sidebar import SidebarOut
from services.account_deletion import delete_account
from services.activity_feed import get_sidebar_feed
from services.airports import nearby_airport_codes
from services.auth import get_current_account
from services.character import (
    build_character_out,
    get_account_invited_faction_slugs,
    list_account_roster,
    resolve_active_character,
    set_active_character,
)
from services.current_user import build_current_user
from services.data_export import build_account_export
from services.data_export import stream as export_stream
from services.notification_prefs import apply_update, muted_feed_types, resolve_prefs
from services.praxis import list_praxes
from services.praxis_out import build_praxis_cards

router = APIRouter()


@router.get("/characters", response_model=list[CharacterOut])
async def my_characters(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """The account's own roster — every non-banned life, carried life first."""
    rows = await list_account_roster(account, session)
    return [build_character_out(character, stats) for character, stats in rows]


@router.get("/nearby-airports", response_model=NearbyAirportsOut)
async def my_nearby_airports(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Airport codes near the carried character's: the Players "Nearby" filter."""
    character = await resolve_active_character(account, session)
    codes = nearby_airport_codes(character.location) if character else None
    return NearbyAirportsOut(codes=None if codes is None else sorted(codes))


@router.post("/active-character", response_model=CurrentUser)
async def switch_active_character(
    data: ActiveCharacterIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Carry a different owned, active life; return the refreshed current user."""
    await set_active_character(account, data.character_id, session)
    return await build_current_user(account, session)


@router.delete("/account", status_code=204)
async def delete_my_account(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """End this account: tombstone every row, unlink its media (ADR-0081, #2160).

    Irreversible; the account comes from the JWT, never a path param. The held JWT
    is inert afterwards (non-active accounts are refused); sign-out stays
    ``POST /auth/logout``.
    """
    await delete_account(account.id, session)


def _prefs_out(raw: object) -> NotificationPrefsOut:
    """Shared by read and save so both report the same resolution."""
    return NotificationPrefsOut(
        events={
            key: NotificationPrefOut(
                on_updates=pref.on_updates, by_email=pref.by_email, locked=pref.locked
            )
            for key, pref in resolve_prefs(raw).items()
        }
    )


@router.get("/notification-prefs", response_model=NotificationPrefsOut)
async def my_notification_prefs(
    account: Account = Depends(get_current_account),
) -> NotificationPrefsOut:
    """This account's notification switches, resolved, every row (#1047).

    Per account, not character. ``by_email`` is stored intent only (no email is
    sent yet, #2164); ``on_updates`` is live.
    """
    return _prefs_out(account.notification_prefs)


@router.put("/notification-prefs", response_model=NotificationPrefsOut)
async def save_my_notification_prefs(
    body: NotificationPrefsIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> NotificationPrefsOut:
    """Save changed rows (each whole); answer the resolved result.

    Unknown keys are dropped and locked ``on_updates`` ignored, so the answer is
    the authority. Reassign, don't mutate: SQLAlchemy won't see in-place JSON edits.
    """
    account.notification_prefs = apply_update(
        account.notification_prefs,
        {
            key: {"on_updates": row.on_updates, "by_email": row.by_email}
            for key, row in body.events.items()
        },
    )
    await session.commit()
    return _prefs_out(account.notification_prefs)


@router.get("/invited-factions", response_model=list[str])
async def my_invited_factions(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Faction slugs a new life on this account may be born into (ADR-0019).

    Letters plus any faction a life on the account held this era (#2385).
    """
    return await get_account_invited_faction_slugs(account.id, session)


@router.get(
    "/export",
    response_class=StreamingResponse,
    responses={
        200: {
            "description": "A zip archive of everything on the account.",
            "content": {
                "application/zip": {"schema": {"type": "string", "format": "binary"}}
            },
        }
    },
)
async def export_my_data(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Download everything tied to your account as a zip (#2158).

    README + ``export.json`` + your original uploads. Over 200 MB of uploads, the
    media is listed as URLs instead. Built on request, never stored.
    """
    archive_file, filename = await build_account_export(account, session)
    return StreamingResponse(
        export_stream(archive_file),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/sidebar", response_model=SidebarOut)
async def my_sidebar(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
    session_factory: Callable = Depends(get_session_factory),
) -> SidebarOut:
    """The desktop rail's three panels in one request (#1344).

    Fired before auth is known, so guests get a plain 401 (excluded from the
    expired-session redirect). No character yet → 200 with empty panels.
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
        # Same switches as the feed (#1047); the request count ignores them.
        muted=muted_feed_types(account.notification_prefs),
    )
    # Membership, not authorship: slot counts count memberships.
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
