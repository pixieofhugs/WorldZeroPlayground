"""Service layer for the block record (ADR-0077).

A block is its own row, keyed blocker → blocked, and has nothing to do with the
friend/foe edge — see ``models/character_block.py``. Three things live here: the
two writes (block, unblock), the blocker's own read, and the one predicate both
enforcement sites share.

**What a block prevents is a closed list** (ADR-0077): taunts, from the moment of
the block, and the friends-and-foes feed sources. It does not hide a profile,
remove anyone from the standings, or close the request-shaped channels. Widening
that reach is a separate decision with its own record.
"""
from sqlalchemy import Select, case, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from models.character import Character
from models.character_block import CharacterBlock
from schemas.block import BlockListItem


def blocked_counterpart_ids(character_id: int) -> Select[tuple[int]]:
    """Every character silenced for ``character_id``, blocks read **both ways**.

    A ``SELECT`` rather than a set, because its two callers want different
    things from the same rule: ``taunt_service`` executes it (it partitions in
    Python), while ``activity_feed`` embeds it as a ``NOT IN`` subquery so the
    feed's pinned statement count does not grow. The ``CASE`` picks whichever
    end of the row is *not* this character, so one scan answers both directions.
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
    """Record that ``blocker`` has blocked ``character_id``.

    Idempotent: blocking someone already blocked answers the existing record
    rather than a conflict — the client cannot always know, and ADR-0077 rules a
    duplicate is not worth surfacing. No edge is read, written, or required.
    """
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
    """Delete ``blocker``'s block of ``character_id``, and stop there.

    Unblock restores nothing else (ADR-0077 ruling 5) — in particular the
    friend/foe edge that the ADR-0077 migration deleted does not come back.

    Only the blocker authored the record, so only the blocker can delete one;
    the statement's own ``WHERE`` is that rule. A delete that matches nothing is
    a no-op rather than a 404, which is both the ordinary DELETE contract and
    the reason the blocked party pressing it learns nothing.
    """
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
    """The blocks ``character_id`` created — outgoing only, always.

    This is the whole of "the blocker sees their block" (ADR-0077). It is
    deliberately **not** symmetric: an incoming block is exactly what the
    blocked party must not be able to read.
    """
    rows = await session.execute(
        select(CharacterBlock, Character)
        .join(Character, Character.id == CharacterBlock.blocked_character_id)
        .where(CharacterBlock.blocker_character_id == character_id)
        .order_by(CharacterBlock.id)
    )
    return [_to_item(character, block) for block, character in rows.all()]
