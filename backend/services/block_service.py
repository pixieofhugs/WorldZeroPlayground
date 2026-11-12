"""Block record service (ADR-0077); independent of the friend/foe edge.

A block prevents a closed list: taunts and friends-and-foes feed sources only.
"""
from sqlalchemy import Select, case, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from models.character import Character
from models.character_block import CharacterBlock
from schemas.block import BlockListItem


def blocked_counterpart_ids(character_id: int) -> Select[tuple[int]]:
    """Every character silenced for ``character_id``, blocks read both ways.

    A ``SELECT`` so ``activity_feed`` can embed it as ``NOT IN`` without growing
    its pinned statement count; ``taunt_service`` executes it.
    """
    return select(
        case(
            (
                CharacterBlock.blocker_character_id == character_id,
                CharacterBlock.blocked_character_id,
            ),
            else_=CharacterBlock.blocker_character_id,
        )
    ).where(
        or_(
            CharacterBlock.blocker_character_id == character_id,
            CharacterBlock.blocked_character_id == character_id,
        )
    )


def _to_item(character: Character, block: CharacterBlock) -> BlockListItem:
    return BlockListItem(
        character_id=character.id,
        display_name=character.display_name,
        avatar_url=character.avatar_url,
        faction_slug=character.faction_slug,
        created_at=block.created_at,
    )


async def block_character(
    blocker: Character,
    character_id: int,
    session: AsyncSession,
) -> BlockListItem:
    """Idempotent: re-blocking returns the existing record, not a conflict."""
    if character_id == blocker.id:
        raise_coded(422, ErrorCode.block_self, "Cannot block yourself.")

    target = await session.get(Character, character_id)
    if target is None:
        raise_coded(404, ErrorCode.character_not_found, "Target character not found.")

    existing = (
        await session.execute(
            select(CharacterBlock).where(
                CharacterBlock.blocker_character_id == blocker.id,
                CharacterBlock.blocked_character_id == character_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return _to_item(target, existing)

    block = CharacterBlock(
        blocker_character_id=blocker.id, blocked_character_id=character_id
    )
    session.add(block)
    await session.flush()
    await session.refresh(block)
    return _to_item(target, block)


async def unblock_character(
    blocker: Character,
    character_id: int,
    session: AsyncSession,
) -> None:
    """Restores nothing else (ADR-0077 ruling 5). No match is a no-op, not a
    404, so the blocked party learns nothing."""
    await session.execute(
        delete(CharacterBlock).where(
            CharacterBlock.blocker_character_id == blocker.id,
            CharacterBlock.blocked_character_id == character_id,
        )
    )
    await session.flush()


async def list_blocks(
    character_id: int,
    session: AsyncSession,
) -> list[BlockListItem]:
    """Outgoing blocks only: the blocked party must never read an incoming one."""
    rows = await session.execute(
        select(CharacterBlock, Character)
        .join(Character, Character.id == CharacterBlock.blocked_character_id)
        .where(CharacterBlock.blocker_character_id == character_id)
        .order_by(CharacterBlock.id)
    )
    return [_to_item(character, block) for block, character in rows.all()]
