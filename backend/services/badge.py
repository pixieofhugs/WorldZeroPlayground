"""Badge evaluation service (ADR-0033, #459).

Evaluates the code-defined :data:`badges.ALL_BADGES` registry against a
per-character :class:`badges.BadgeContext` built from explicit queries.
Only the single-character read path calls this — list serializers skip
badges entirely to avoid N+1 sibling queries.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from badges import ALL_BADGES, BadgeContext
from models.character import Character
from schemas.character import BadgeOut


async def build_badge_context(
    character: Character,
    session: AsyncSession,
) -> BadgeContext:
    """Assemble the facts badge conditions consult for one character.

    ``Character.account`` is ``lazy="raise"`` — sibling characters are queried
    explicitly by ``account_id``. The account's "earliest" character is the
    first by ``(created_at, id)`` (id breaks same-instant creation ties).
    """
    result = await session.execute(
        select(Character.id)
        .where(Character.account_id == character.account_id)
        .order_by(Character.created_at.asc(), Character.id.asc())
    )
    sibling_ids = [row[0] for row in result.all()]
    earliest_id = sibling_ids[0] if sibling_ids else character.id
    return BadgeContext(
        account_character_count=len(sibling_ids),
        is_earliest_on_account=character.id == earliest_id,
    )


def evaluate_badges(context: BadgeContext) -> list[BadgeOut]:
    """Every registry badge whose condition holds, in registry order."""
    return [
        BadgeOut(key=badge.key, name=badge.name)
        for badge in ALL_BADGES
        if badge.condition(context)
    ]


async def list_badges_for_character(
    character: Character,
    session: AsyncSession,
) -> list[BadgeOut]:
    context = await build_badge_context(character, session)
    return evaluate_badges(context)
