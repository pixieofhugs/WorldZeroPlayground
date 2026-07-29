"""Router for the unified activity feed."""
from dataclasses import asdict
from datetime import datetime
from typing import Callable, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_session_factory
from dependencies import get_current_character
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

router = APIRouter()


@router.get("", response_model=ActivityFeedResponse)
async def activity_feed(
    filter: Optional[str] = Query(None, alias="filter"),
    before: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    archived: bool = Query(False),
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
    session_factory: Callable = Depends(get_session_factory),
) -> ActivityFeedResponse:
    """Return a unified, paginated activity feed for the current character.

    ``archived=true`` returns the archive instead — same cursor, same page size,
    but it ignores the friend/foe/global type slicing and returns everything the
    character has put away.
    """
    # Unknown filters fall back to "all" in the service (FILTER_QUERIES.get default).
    before_cursor: Optional[datetime] = None
    if before:
        before_cursor = datetime.fromisoformat(before)

    dc_response = await get_activity_feed(
        character_id=character.id,
        session=session,
        session_factory=session_factory,
        feed_filter=filter,
        before_cursor=before_cursor,
        limit=limit,
        archived=archived,
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
