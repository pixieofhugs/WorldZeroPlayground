"""The persistent moderation action log (#3548).

Every moderating service calls :func:`log_mod_action` in the same transaction as
the action, so no route has to remember to.
"""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.mod_action import ModAction


async def log_mod_action(
    session: AsyncSession,
    actor_account_id: int,
    action: str,
    target_type: str,
    target_id: int,
    detail: Optional[str] = None,
) -> None:
    session.add(
        ModAction(
            actor_account_id=actor_account_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )
    await session.flush()


async def list_mod_actions(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 50,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
) -> tuple[list[tuple[ModAction, Optional[str]]], int]:
    """Newest first, each with the actor's first character name, plus the total."""
    filters = []
    if target_type is not None:
        filters.append(ModAction.target_type == target_type)
    if target_id is not None:
        filters.append(ModAction.target_id == target_id)
    actor_name = (
        select(Character.display_name)
        .where(Character.account_id == ModAction.actor_account_id)
        .order_by(Character.id)
        .limit(1)
        .scalar_subquery()
    )
    rows = await session.execute(
        select(ModAction, actor_name)
        .where(*filters)
        .order_by(ModAction.created_at.desc(), ModAction.id.desc())
        .offset(offset)
        .limit(limit)
    )
    total = await session.scalar(
        select(func.count()).select_from(ModAction).where(*filters)
    )
    return [(a, n) for a, n in rows.all()], total or 0
