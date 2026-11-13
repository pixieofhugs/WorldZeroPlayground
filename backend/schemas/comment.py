from datetime import datetime
from typing import Literal, Optional

from pydantic import ConfigDict, Field
from schemas.base import WireModel

from models.comment import MAX_COMMENT_BODY
from models.flag import MAX_FLAG_REASON_DETAIL, FlagReason


class CommentAuthor(WireModel):
    """Public author identity; never account_id or email."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    avatar_url: str
    faction_slug: str


class CommentMentionOut(WireModel):
    """A resolved @mention, linkified by the frontend."""

    character_id: int
    username: str
    display_name: str


class CommentIn(WireModel):
    # Trust-boundary cap (ADR-0006).
    body_text: str = Field(..., min_length=1, max_length=MAX_COMMENT_BODY)


class FlagIn(WireModel):
    """Player flag (ADR-0037); ``reason_detail`` is kept only for ``other``."""

    reason: FlagReason
    reason_detail: Optional[str] = Field(None, max_length=MAX_FLAG_REASON_DETAIL)


class CommentModerationIn(WireModel):
    # Comment vocabulary (ADR-0006): `deleted` is a terminal tombstone; no `failed`.
    status: Literal["visible", "hidden", "deleted"]


class CommentOut(WireModel):
    id: int
    praxis_id: Optional[int] = None
    task_id: Optional[int] = None
    body_text: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    author: CommentAuthor
    mentions: list[CommentMentionOut] = []
