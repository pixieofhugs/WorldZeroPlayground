from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from models.comment import MAX_COMMENT_BODY
from models.flag import MAX_FLAG_REASON_DETAIL, FlagReason


class CommentAuthor(BaseModel):
    """Public author identity — drives the actor-scoped theming on the frontend.

    Never exposes account_id or email (CLAUDE.md Do-NOT).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    avatar_url: str
    faction_slug: str


class CommentMentionOut(BaseModel):
    """A resolved @mention — the frontend linkifies these handles in the body."""

    character_id: int
    username: str
    display_name: str


class CommentIn(BaseModel):
    # max_length enforces the ≤2000 trust-boundary cap at the API edge (ADR-0006).
    body_text: str = Field(..., min_length=1, max_length=MAX_COMMENT_BODY)


class FlagIn(BaseModel):
    """Player flag payload — reason constrained to the shared vocabulary (ADR-0031).

    ``reason_detail`` is the free-text escape hatch for ``other``; the four named
    reasons carry no note (any detail sent alongside them is ignored).
    """

    reason: FlagReason
    reason_detail: Optional[str] = Field(None, max_length=MAX_FLAG_REASON_DETAIL)


class CommentModerationIn(BaseModel):
    # Comments have their own moderation vocabulary (ADR-0006): hidden (reversible)
    # / deleted (terminal tombstone) / visible. Praxis-only states like `failed`
    # don't apply, and `deleted` must be reachable.
    status: Literal["visible", "hidden", "deleted"]


class CommentOut(BaseModel):
    id: int
    praxis_id: Optional[int] = None
    task_id: Optional[int] = None
    body_text: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    author: CommentAuthor
    mentions: list[CommentMentionOut] = []
