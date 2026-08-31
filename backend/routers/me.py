"""Account-scoped "my lives" endpoints (ADR-0019, #270).

Distinct from /characters (public roster): these read the authenticated account's
own characters and which life it is currently carrying.
"""
from dataclasses import asdict
from typing import Callable

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_session_factory
from models.account import Account
from models.praxis import PraxisStatus
from schemas.activity_feed import ACTIVITY_FEED_ITEM_ADAPTER
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


@router.delete("/account", status_code=204)
async def delete_my_account(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    """End this account: tombstone every row, unlink its media (ADR-0081, #2160).

    Irreversible, and takes no body — the confirmation is the client's
    (#2161). The route is deliberately unable to delete anyone else's: the
    account comes from the JWT, never from a path parameter.

    No grace period and no scheduled follow-up; see ``services.account_deletion``.
    The JWT the caller still holds is inert the moment this returns —
    ``get_current_account`` refuses any account that is not ``active`` — so
    signing out is ``POST /auth/logout`` like any other sign-out, and the cookie
    flags stay stated in exactly one place.
    """
    await delete_account(account.id, session)


def _prefs_out(raw: object) -> NotificationPrefsOut:
    """The stored column as the wire shape.

    Both routes answer through this, so a save can never report a different
    resolution from the read beside it.
    """
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
    """This account's notification switches, resolved (#1047).

    Always all nine rows: an account whose column is still ``{}`` gets every
    default, so a client never has to know what a default is. Per ACCOUNT, not
    per character — no character is resolved here at all.

    ``by_email`` is stored INTENT. Nothing in ``backend/`` sends email; #2164
    honours these values when the channel goes live, and the settings card says
    so in copy. ``on_updates`` is live behaviour — see the activity feed.
    """
    return _prefs_out(account.notification_prefs)


@router.put("/notification-prefs", response_model=NotificationPrefsOut)
async def save_my_notification_prefs(
    body: NotificationPrefsIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
) -> NotificationPrefsOut:
    """Save some or all of the switches; answer with the resolved result.

    Partial by ROW and whole by row: send the rows that changed, each with both
    of its switches. Unknown event keys are dropped and a locked row's
    ``on_updates`` is ignored (``apply_update``), so the ANSWER is the authority
    on what was actually stored — a client that sent a locked
    ``on_updates: false`` sees it come back ``true`` rather than believing the
    write landed.

    The whole dict is reassigned rather than mutated in place: SQLAlchemy does
    not track mutation *inside* a JSON value, so an in-place edit would flush
    nothing and the save would silently do nothing.
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
    session: AsyncSession = Depends(get_db),
):
    """Faction slugs a new life on this account may be born into (ADR-0019).

    Not just live invitation letters: since #2385 this also counts any faction
    an existing life on the account currently holds or has ever held this era.
    Walking out burns the door for *that* character, not for the account.
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
    session: AsyncSession = Depends(get_db),
):
    """Download everything tied to your account, as a zip, right now (#2158).

    The archive holds a README explaining what the values mean, an
    ``export.json`` with your account email, every character and its stats, the
    praxis you created or joined, the votes you cast, your comments and your
    faction history — and the photos and videos you uploaded, as the original
    files rather than as links, so the download stays readable whatever happens
    to this site.

    **If your uploads add up to more than 200 MB**, they are too large to build
    into one download. The archive is then written without them: ``export.json``
    lists a web address for each file so you can save them yourself, and the
    README says which of the two forms you received. Nothing is left out of the
    export except the media itself.

    The file is built while you wait and is never stored, so no copy of it
    exists for anyone else to be given.
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
        # The rail's activity panel is a window onto the same feed, so it
        # honours the same switches (#1047). The request COUNT beside it is
        # untouchable by them — `_visible_types` enforces that, not this call.
        muted=muted_feed_types(account.notification_prefs),
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
