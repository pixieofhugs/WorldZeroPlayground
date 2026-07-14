"""Service layer for comments (ADR-0006).

Comments are actor-scoped, attach to exactly one of a praxis or a task, are flat
(replies via @mention), not votable, and reuse the praxis moderation +
activity-feed machinery.
"""
import re
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.comment import MAX_COMMENT_BODY, Comment, CommentMention
from models.flag import Flag, FlagReason, stored_flag_reason
from models.praxis import ModerationStatus, Praxis
from models.task import Task, TaskStatus
from schemas.comment import CommentAuthor, CommentMentionOut, CommentOut
from services.era import get_current_era_row, get_or_create_stats

# @handle mentions: word chars matching Character.username. Unresolved handles
# stay plain text — linkify at render runs against the resolved set only.
MENTION_RE = re.compile(r"@([A-Za-z0-9_]+)")

# Eager-load spec shared by every Comment read: author (for actor-scoped theming)
# + mentions with their resolved characters (for the API mention list).
_COMMENT_LOADERS = (
    selectinload(Comment.created_by),
    selectinload(Comment.mentions).selectinload(CommentMention.mentioned_character),
)


async def _character_level(character_id: int, session: AsyncSession) -> int:
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)
    return stats.level


async def can_comment(
    viewer: Optional[Character],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True if viewer is authenticated and at/above era.comment_level_required.

    Mirrors :func:`services.praxis.can_flag_praxis`.
    """
    if viewer is None:
        return False
    return await _character_level(viewer.id, session) >= era.comment_level_required


async def get_comment(comment_id: int, session: AsyncSession) -> Comment:
    result = await session.execute(
        select(Comment)
        .options(*_COMMENT_LOADERS)
        # populate_existing so an edit's reconciled mentions overwrite the
        # already-loaded collection rather than returning stale rows.
        .execution_options(populate_existing=True)
        .where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found.")
    return comment


async def _resolve_mentions(
    body_text: str, author: Character, session: AsyncSession
) -> list[Character]:
    """Resolve @username handles to Characters, case-insensitive, excluding self."""
    handles = {handle.lower() for handle in MENTION_RE.findall(body_text)}
    if not handles:
        return []
    result = await session.execute(
        select(Character).where(func.lower(Character.username).in_(handles))
    )
    return [c for c in result.scalars().all() if c.id != author.id]


async def _reconcile_mentions(
    comment: Comment, mentioned: list[Character], session: AsyncSession
) -> None:
    """Reconcile the comment's mention rows to exactly ``mentioned``.

    A bulk DELETE + re-insert rather than ORM-collection mutation: in async
    SQLAlchemy, touching an unloaded relationship triggers an illegal lazy load.
    The caller re-queries with populate_existing so the returned object refreshes.
    """
    await session.execute(
        delete(CommentMention)
        .where(CommentMention.comment_id == comment.id)
        .execution_options(synchronize_session=False)
    )
    for character in mentioned:
        session.add(
            CommentMention(
                comment_id=comment.id, mentioned_character_id=character.id
            )
        )


def _clean_body(body_text: str) -> str:
    body_text = body_text.strip()
    if not body_text:
        raise HTTPException(status_code=422, detail="Comment cannot be empty.")
    if len(body_text) > MAX_COMMENT_BODY:
        raise HTTPException(
            status_code=422,
            detail=f"Comment exceeds {MAX_COMMENT_BODY} characters.",
        )
    return body_text


async def _assert_commentable_target(
    praxis_id: Optional[int], task_id: Optional[int], session: AsyncSession
) -> None:
    """Exactly one target, and it must be open for comments.

    A visible praxis (withdrawn/hidden → no thread) or an active task (ADR-0006).
    The DB CHECK also guards exactly-one; this gives a clean 4xx before the insert.
    """
    if (praxis_id is None) == (task_id is None):
        raise HTTPException(
            status_code=422,
            detail="A comment targets exactly one of a praxis or a task.",
        )
    if praxis_id is not None:
        praxis = await session.get(Praxis, praxis_id)
        if praxis is None:
            raise HTTPException(status_code=404, detail="Praxis not found.")
        if praxis.moderation_status != ModerationStatus.visible:
            raise HTTPException(
                status_code=403, detail="This praxis is not open for comments."
            )
    else:
        task = await session.get(Task, task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found.")
        if task.status != TaskStatus.active:
            raise HTTPException(
                status_code=403, detail="This task is not open for comments."
            )


async def create_comment(
    author: Character,
    *,
    praxis_id: Optional[int] = None,
    task_id: Optional[int] = None,
    body_text: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Comment:
    if not await can_comment(author, session, era):
        raise HTTPException(
            status_code=403,
            detail=f"Must be level {era.comment_level_required} or above to comment.",
        )
    body_text = _clean_body(body_text)
    await _assert_commentable_target(praxis_id, task_id, session)

    comment = Comment(
        praxis_id=praxis_id,
        task_id=task_id,
        created_by_id=author.id,
        body_text=body_text,
    )
    session.add(comment)
    await session.flush()

    await _reconcile_mentions(
        comment, await _resolve_mentions(body_text, author, session), session
    )
    await session.flush()
    return await get_comment(comment.id, session)


async def edit_comment(
    comment_id: int, author: Character, body_text: str, session: AsyncSession
) -> Comment:
    comment = await get_comment(comment_id, session)
    if comment.created_by_id != author.id:
        raise HTTPException(
            status_code=403, detail="Cannot edit another character's comment."
        )
    body_text = _clean_body(body_text)

    comment.body_text = body_text
    comment.is_edited = True
    await _reconcile_mentions(
        comment, await _resolve_mentions(body_text, author, session), session
    )
    await session.flush()
    return await get_comment(comment_id, session)


async def withdraw_comment(
    comment_id: int, author: Character, session: AsyncSession
) -> None:
    """Author soft-delete."""
    comment = await get_comment(comment_id, session)
    if comment.created_by_id != author.id:
        raise HTTPException(
            status_code=403, detail="Cannot delete another character's comment."
        )
    comment.is_withdrawn = True
    await session.flush()


async def list_comments(
    *,
    praxis_id: Optional[int] = None,
    task_id: Optional[int] = None,
    session: AsyncSession,
) -> list[Comment]:
    """Public list for a target: visible, non-withdrawn, chronological ascending."""
    query = (
        select(Comment)
        .options(*_COMMENT_LOADERS)
        .where(
            Comment.is_withdrawn.is_(False),
            Comment.moderation_status == ModerationStatus.visible,
        )
        .order_by(Comment.created_at.asc())
    )
    if praxis_id is not None:
        query = query.where(Comment.praxis_id == praxis_id)
    if task_id is not None:
        query = query.where(Comment.task_id == task_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def flag_comment(
    comment_id: int,
    flagged_by: Character,
    reason: FlagReason,
    session: AsyncSession,
    reason_detail: Optional[str] = None,
    era: EraConfig = CURRENT_ERA,
) -> Comment:
    """Flag a comment for moderation. Reuses era.flag_level_required.

    When the flag count reaches era.comment_flag_review_threshold the comment goes
    to ``flagged`` and surfaces on the admin review page (alongside flagged praxes).
    """
    comment = await get_comment(comment_id, session)
    if flagged_by.id == comment.created_by_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own comment.")
    if await _character_level(flagged_by.id, session) < era.flag_level_required:
        raise HTTPException(
            status_code=403,
            detail=f"Must be level {era.flag_level_required} or above to flag a comment.",
        )
    session.add(
        Flag(
            comment_id=comment.id,
            flagged_by=flagged_by.id,
            reason=stored_flag_reason(reason, reason_detail),
        )
    )
    await session.flush()

    count_result = await session.execute(
        select(func.count()).select_from(Flag).where(Flag.comment_id == comment.id)
    )
    if count_result.scalar_one() >= era.comment_flag_review_threshold:
        comment.moderation_status = ModerationStatus.flagged
        await session.flush()
    return await get_comment(comment_id, session)


async def moderate_comment(
    comment_id: int, new_status: str, session: AsyncSession
) -> Comment:
    """Admin moderation: hidden (reversible hold) / deleted (tombstone) / visible."""
    comment = await get_comment(comment_id, session)
    try:
        comment.moderation_status = ModerationStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=422, detail=f"Invalid moderation status: {new_status}"
        )
    await session.flush()
    return await get_comment(comment_id, session)


async def list_flagged_comments(session: AsyncSession) -> list[Comment]:
    result = await session.execute(
        select(Comment)
        .options(*_COMMENT_LOADERS)
        .where(Comment.moderation_status == ModerationStatus.flagged)
        .order_by(Comment.created_at.desc())
    )
    return list(result.scalars().all())


def build_comment_out(comment: Comment) -> CommentOut:
    """Assemble the API shape from a Comment with created_by + mentions loaded.

    Lives in the service (like services.praxis.build_praxis_out) because the
    nested author/mention assembly is shared by the public and admin routers.
    """
    return CommentOut(
        id=comment.id,
        praxis_id=comment.praxis_id,
        task_id=comment.task_id,
        body_text=comment.body_text,
        is_edited=comment.is_edited,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=CommentAuthor.model_validate(comment.created_by),
        mentions=[
            CommentMentionOut(
                character_id=mention.mentioned_character.id,
                username=mention.mentioned_character.username,
                display_name=mention.mentioned_character.display_name,
            )
            for mention in comment.mentions
        ],
    )
