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

from dependencies import account_has_admin_role
from errors import DETAIL_CONTEXT_PARAM, ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.comment import MAX_COMMENT_BODY, Comment, CommentMention
from models.flag import Flag, FlagReason, stored_flag_reason
from models.praxis import ModerationStatus, Praxis
from models.task import Task, TaskStatus
from schemas.comment import CommentAuthor, CommentMentionOut, CommentOut
from services.character_capabilities import compute_capabilities
from services.era import get_current_era_row, get_or_create_stats
from services.praxis import account_already_flagged, can_view_praxis

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
    """Whether ``viewer`` may post a comment — the enforcement half of the
    ``can_comment`` flag ``/auth/me`` carries.

    Derived from :func:`services.character_capabilities.compute_capabilities`
    rather than restated, because restating it is what broke. This used to read
    the level alone, while the flag the frontend gates the composer on
    short-circuits to True for admins. An admin below
    ``era.comment_level_required`` was therefore shown a comment box and got a
    403 from every submit — which is how a production database reached zero
    comments with an admin repeatedly trying to leave one.

    That is the same trap :func:`services.praxis.evaluate_signup` is built to
    avoid: one predicate, so the ``can_sign_up`` flag can't drift from
    enforcement. One predicate here too.
    """
    if viewer is None:
        return False
    capabilities = compute_capabilities(
        await _character_level(viewer.id, session),
        await account_has_admin_role(viewer.account_id, session),
        era,
    )
    return capabilities.can_comment


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
    praxis_id: Optional[int],
    task_id: Optional[int],
    session: AsyncSession,
    author: Optional[Character] = None,
) -> None:
    """Exactly one target, and it must be open for comments.

    A visible praxis (withdrawn/hidden → no thread) or an active task (ADR-0006).
    The DB CHECK also guards exactly-one; this gives a clean 4xx before the insert.
    """
    if (praxis_id is None) == (task_id is None):
        raise_coded(
            422,
            ErrorCode.comment_target_ambiguous,
            "A comment targets exactly one of a praxis or a task.",
        )
    if praxis_id is not None:
        # The write door must ask the same question as the read door. It used to
        # check only `moderation_status`, so any player could POST a comment into
        # someone else's `in_progress` draft (ADR-0024 makes those private) or a
        # live duel side (#999) — content they cannot themselves read back. That
        # also made it an existence oracle: 201 for a draft, 404 only when the
        # row was absent. `list_praxis_comments` already gates on can_view_praxis;
        # now both doors share the predicate.
        #
        # Absent and invisible collapse into ONE raise on purpose — two raises
        # with the same status still differ in reachability, and that difference
        # is the oracle we are closing.
        praxis = await session.get(Praxis, praxis_id)
        if praxis is None or (
            author is not None and not await can_view_praxis(author, praxis, session)
        ):
            raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
        if praxis.moderation_status != ModerationStatus.visible:
            raise_coded(
                403,
                ErrorCode.praxis_not_open_for_comments,
                "This praxis is not open for comments.",
            )
    else:
        task = await session.get(Task, task_id)
        if task is None:
            raise_coded(404, ErrorCode.task_not_found, "Task not found.")
        if task.status != TaskStatus.active:
            raise_coded(
                403,
                ErrorCode.task_not_open_for_comments,
                "This task is not open for comments.",
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
        raise_coded(
            403,
            ErrorCode.comment_level_too_low,
            f"Must be level {era.comment_level_required} or above to comment.",
            {"level": era.comment_level_required},
        )
    body_text = _clean_body(body_text)
    await _assert_commentable_target(praxis_id, task_id, session, author=author)

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

    Account-scoped anti-self-flag and one-flag-per-account, mirroring
    :func:`services.praxis.flag_praxis`.
    """
    comment = await get_comment(comment_id, session)

    # Account-scoped, not character-scoped (#328): a second life on the same
    # account is a puppet here, and comment_flag_review_threshold is 1 — so a
    # character-only check let a player push their own account's comment into
    # the admin queue. Same two guards, same statuses as flag_praxis.
    author = comment.created_by
    if author is not None and author.account_id == flagged_by.account_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own comment.")
    if await account_already_flagged(
        flagged_by.account_id, session, comment_id=comment.id
    ):
        raise_coded(
            409,
            ErrorCode.comment_already_flagged,
            "Your account has already flagged this comment.",
        )

    if await _character_level(flagged_by.id, session) < era.flag_level_required:
        raise_coded(
            403,
            ErrorCode.flag_level_too_low,
            f"Must be level {era.flag_level_required} or above to flag a comment.",
            {"level": era.flag_level_required, DETAIL_CONTEXT_PARAM: "comment"},
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

    Lives in the service (like services.praxis_out.build_praxis_out) because the
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
