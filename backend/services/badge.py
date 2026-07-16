"""Badge evaluation service (ADR-0033, #459).

Evaluates the code-defined :data:`badges.ALL_BADGES` registry against a
per-character :class:`badges.BadgeContext` built from explicit queries.

Every fact a badge condition consults is a **per-account aggregate**, so list
paths do not need one query per character: :func:`build_badge_contexts` folds
the whole page into a single ``GROUP BY account_id`` query and builds each
context in memory (#655). The rule is "never *per-character* on list paths",
not "never on list paths".
"""
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import aggregate_order_by, array_agg
from sqlalchemy.ext.asyncio import AsyncSession

from badges import ALL_BADGES, BadgeContext
from models.character import Character
from schemas.character import BadgeOut


async def build_badge_contexts(
    characters: Iterable[Character],
    session: AsyncSession,
) -> dict[int, BadgeContext]:
    """Assemble each character's :class:`BadgeContext` in ONE query, keyed by id.

    ``Character.account`` is ``lazy="raise"`` — siblings are queried explicitly
    by ``account_id``. One ``GROUP BY account_id`` row per distinct account
    carries both facts a condition can consult: how many characters the account
    owns, and which of them is "earliest" — first by ``(created_at, id)``, id
    breaking same-instant creation ties.

    The sibling count is deliberately unfiltered by status: a puppet is a puppet
    whether or not the list path would surface it.
    """
    characters = list(characters)
    account_ids = {character.account_id for character in characters}
    if not account_ids:
        return {}

    result = await session.execute(
        select(
            Character.account_id,
            func.count(Character.id).label("character_count"),
            # Postgres arrays are 1-indexed: [1] is the earliest by (created_at, id).
            array_agg(
                aggregate_order_by(
                    Character.id,
                    Character.created_at.asc(),
                    Character.id.asc(),
                )
            )[1].label("earliest_id"),
        )
        .where(Character.account_id.in_(account_ids))
        .group_by(Character.account_id)
    )
    by_account = {
        account_id: (character_count, earliest_id)
        for account_id, character_count, earliest_id in result.all()
    }

    contexts: dict[int, BadgeContext] = {}
    for character in characters:
        character_count, earliest_id = by_account.get(
            character.account_id, (1, character.id)
        )
        contexts[character.id] = BadgeContext(
            account_character_count=character_count,
            is_earliest_on_account=character.id == earliest_id,
        )
    return contexts


async def build_badge_context(
    character: Character,
    session: AsyncSession,
) -> BadgeContext:
    """Single-character :func:`build_badge_contexts` — the same one query."""
    contexts = await build_badge_contexts([character], session)
    return contexts[character.id]


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
