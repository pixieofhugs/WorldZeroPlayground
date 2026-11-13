"""Foe taunts, the write path (ADR-0068).

Stores (faction_slug, trigger_type); the words live in ``taunts.json`` (ADR-0031).
R gets S's taunts only if R has a foe edge -> S and no block either way
(ADR-0077). Read only via ``services.activity_feed``. No era rules read here.
"""
from dataclasses import dataclass

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_stats import CharacterStats
from models.relationship import Relationship, RelationshipType
from models.taunt_message import TauntMessage, TauntTriggerType
from services.block_service import blocked_counterpart_ids


@dataclass(frozen=True)
class FoeEdges:
    """Taunt wiring minus blocks: ``subscribers`` foe this character; ``subscribed_to``
    it foes."""

    subscribers: frozenset[int]
    subscribed_to: frozenset[int]

    def __bool__(self) -> bool:
        return bool(self.subscribers or self.subscribed_to)


async def load_foe_edges(character_id: int, session: AsyncSession) -> FoeEdges:
    """ADR-0068 subscription sets; either party's block silences the pair (ADR-0077)."""
    edges = (
        await session.execute(
            select(Relationship).where(
                or_(
                    Relationship.from_character_id == character_id,
                    Relationship.to_character_id == character_id,
                )
            )
        )
    ).scalars().all()

    blocked: set[int] = set(
        (await session.execute(blocked_counterpart_ids(character_id))).scalars().all()
    )
    subscribers: set[int] = set()
    subscribed_to: set[int] = set()
    for edge in edges:
        # Block outranks the edge without deleting it, so unblock restores it.
        counterpart_id = (
            edge.to_character_id
            if edge.from_character_id == character_id
            else edge.from_character_id
        )
        if edge.type is not RelationshipType.foe:
            continue
        if edge.to_character_id == character_id:
            subscribers.add(counterpart_id)
        else:
            subscribed_to.add(counterpart_id)

    return FoeEdges(
        subscribers=frozenset(subscribers - blocked),
        subscribed_to=frozenset(subscribed_to - blocked),
    )


async def generate_taunt(
    from_character: Character,
    to_character_id: int,
    trigger_type: TauntTriggerType,
    session: AsyncSession,
) -> TauntMessage:
    """Persist one taunt row unconditionally; callers own the ADR-0068 delivery gate."""
    taunt = TauntMessage(
        from_character_id=from_character.id,
        to_character_id=to_character_id,
        faction_slug=from_character.faction_slug,
        trigger_type=trigger_type,
    )
    session.add(taunt)
    await session.flush()
    await session.refresh(taunt)
    return taunt


async def fan_out_taunt(
    sender_id: int,
    trigger_type: TauntTriggerType,
    session: AsyncSession,
) -> list[TauntMessage]:
    """One taunt per subscriber; no throttle, the opt-in bounds it (ADR-0068)."""
    subscribers = (await load_foe_edges(sender_id, session)).subscribers
    if not subscribers:
        return []
    sender = await session.get(Character, sender_id)
    if sender is None:
        return []
    return [
        await generate_taunt(sender, recipient_id, trigger_type, session)
        for recipient_id in sorted(subscribers)
    ]


async def emit_recalc_taunts(
    character: Character,
    session: AsyncSession,
    *,
    era_id: int,
    old_score: int,
    new_score: int,
    old_level: int,
    new_level: int,
) -> None:
    """Fire ``level_up`` and ``score_overtake`` after a recalc (ADR-0068).

    ``level_up`` has no high-water mark. ``score_overtake`` fires on a strict
    lead flip in either direction, so it self-dedupes. Organic play in the live
    era only; era transitions and admin backfills stay silent.
    """
    edges = await load_foe_edges(character.id, session)
    if not edges:
        return

    if new_level > old_level:
        for recipient_id in sorted(edges.subscribers):
            await generate_taunt(
                character, recipient_id, TauntTriggerType.level_up, session
            )

    if new_score == old_score:
        return

    counterparts = await session.execute(
        select(Character, CharacterStats.score)
        .outerjoin(
            CharacterStats,
            and_(
                CharacterStats.character_id == Character.id,
                CharacterStats.era_id == era_id,
            ),
        )
        .where(Character.id.in_(edges.subscribers | edges.subscribed_to))
    )
    for counterpart, counterpart_score in counterparts.all():
        # No stats row for this era = score 0.
        other_score = 0 if counterpart_score is None else counterpart_score
        if (
            counterpart.id in edges.subscribers
            and old_score <= other_score < new_score
        ):
            await generate_taunt(
                character, counterpart.id, TauntTriggerType.score_overtake, session
            )
        elif (
            counterpart.id in edges.subscribed_to
            and new_score < other_score <= old_score
        ):
            # Passive flip: the scoreboard fact is true regardless of who moved.
            await generate_taunt(
                counterpart, character.id, TauntTriggerType.score_overtake, session
            )
