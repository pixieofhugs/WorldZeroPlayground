"""Router for the unified activity feed."""
from dataclasses import asdict
from datetime import datetime
from typing import Callable, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_session_factory
from dependencies import get_current_character
from models.account import Account
from models.character import Character
from schemas.activity_feed import (
    ActivityFeedResponse,
    FeedBulkArchiveRequest,
    FeedBulkArchiveResponse,
    FeedItemArchiveRequest,
    FeedItemArchiveResponse,
)
from services.activity_feed import (
    dismiss_feed_item,
    dismiss_feed_items_for_filter,
    get_activity_feed,
    restore_feed_item,
    restore_feed_items_for_filter,
)
from services.auth import get_current_account
from services.notification_prefs import muted_feed_types

router = APIRouter()


@router.get("", response_model=ActivityFeedResponse)
async def activity_feed(
    filter: Optional[str] = Query(None, alias="filter"),
    types: Optional[list[str]] = Query(None),
    before: Optional[datetime] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    archived: bool = Query(False),
    character: Character = Depends(get_current_character),
    # FREE. `get_current_character` already depends on this, and FastAPI caches
    # a dependency's result per request — so the account arrives without a
    # second statement. The feed load is pinned to an exact statement count by
    # `test_activity_feed_query_count.py`; a `select(Account.notification_prefs)`
    # here would have been a real extra round trip on every Updates page load,
    # for a column the request has already read.
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
    session_factory: Callable = Depends(get_session_factory),
) -> ActivityFeedResponse:
    """Return a unified, paginated activity feed for the current character.

    ``archived=true`` returns the archive instead — same cursor, same page size,
    but it ignores the friend/foe/global type slicing and returns everything the
    character has put away.

    ``types`` is a **repeated bare key** — ``?types=nudge&types=global_task`` —
    intersected with ``filter``'s own set, and clients must serialise it that
    way. A client that brackets the key instead — ``types[]=nudge`` — sends a
    name FastAPI reads nothing from, and this endpoint then answers 200 with an
    unfiltered list: the filter is silently ignored and nothing fails anywhere.
    That silence is why the rule is written down on the endpoint rather than
    left to whatever a client's HTTP library does by default.

    Both ``filter`` and ``types`` are tolerant of values the registry does not
    know — this is a read projection and a stale bookmark should degrade, not
    4xx. ``before`` is not: it is a cursor, and a cursor that does not parse is
    a malformed request rather than an empty page (FastAPI answers 422).
    """
    dc_response = await get_activity_feed(
        character_id=character.id,
        session=session,
        session_factory=session_factory,
        feed_filter=filter,
        before_cursor=before,
        limit=limit,
        archived=archived,
        item_types=types,
        # The account's "show on Updates" switches (#1047). ACCOUNT-scoped
        # while the feed is character-scoped, which is the issue's founding
        # sentence: someone who wants fewer rows wants fewer rows on every
        # life they carry.
        muted_types=muted_feed_types(account.notification_prefs),
    )
    return ActivityFeedResponse.model_validate(asdict(dc_response))


@router.post("/dismiss", response_model=FeedItemArchiveResponse)
async def dismiss_item(
    body: FeedItemArchiveRequest,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> FeedItemArchiveResponse:
    """Archive one feed item. 400 if the key is unknown or unarchivable."""
    changed = await dismiss_feed_item(character.id, body.item_key, session)
    return FeedItemArchiveResponse(
        item_key=body.item_key, archived=True, changed=changed
    )


@router.post("/restore", response_model=FeedItemArchiveResponse)
async def restore_item(
    body: FeedItemArchiveRequest,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> FeedItemArchiveResponse:
    """Take one feed item back out of the archive."""
    changed = await restore_feed_item(character.id, body.item_key, session)
    return FeedItemArchiveResponse(
        item_key=body.item_key, archived=False, changed=changed
    )


@router.post("/dismiss-all", response_model=FeedBulkArchiveResponse)
async def dismiss_all_items(
    body: FeedBulkArchiveRequest,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
    session_factory: Callable = Depends(get_session_factory),
) -> FeedBulkArchiveResponse:
    """Archive everything the given filter would currently return."""
    count = await dismiss_feed_items_for_filter(
        character_id=character.id,
        session=session,
        session_factory=session_factory,
        feed_filter=body.filter,
    )
    return FeedBulkArchiveResponse(count=count, archived=True)


@router.post("/restore-all", response_model=FeedBulkArchiveResponse)
async def restore_all_items(
    body: FeedBulkArchiveRequest,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
) -> FeedBulkArchiveResponse:
    """Empty the archive, or the part of it belonging to one filter."""
    count = await restore_feed_items_for_filter(
        character_id=character.id,
        session=session,
        feed_filter=body.filter,
    )
    return FeedBulkArchiveResponse(count=count, archived=False)
