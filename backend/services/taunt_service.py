"""Service layer for foe taunts — the write path (ADR-0068).

ADR-0031: the backend never renders taunt prose. It persists a structured
reference — the sender's send-time faction voice (``faction_slug``) plus the
``trigger_type`` — and the frontend react-i18next catalog
(``frontend/src/locales/en/taunts.json``) owns the words.

ADR-0068 owns *delivery*: **declaring a foe subscribes you to that rival's
taunts**. A taunt from sender S reaches recipient R only when R holds an active
foe edge → S, and a block between the pair silences it in both directions
(ADR-0077: the block is its own record, read here in both directions, and it
outranks the edge without consuming it).
The activity feed is the only delivery surface — there is no standalone read
route, and ``services.activity_feed`` reads the rows this module writes.

Nothing here reads an era *rule*, so no function takes an ``EraConfig``. The
one era value that matters is the ``era_id`` whose ladder an overtake is judged
against, which the caller already holds.
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
    """One character's taunt wiring, both directions, blocks already removed.

    ``subscribers`` hold an active foe edge *toward* this character, so they
    receive taunts this character sends. ``subscribed_to`` are the characters
    this one declared a foe, so their achievements arrive here.
    """

    subscribers: frozenset[int]
    subscribed_to: frozenset[int]

    def __bool__(self) -> bool:
        return bool(self.subscribers or self.subscribed_to)


async def load_foe_edges(character_id: int, session: AsyncSession) -> FoeEdges:
    """Resolve the ADR-0068 subscription sets for ``character_id``.

    Two queries. One over every edge touching the character, partitioned in
    Python because the pair rule needs both directions and a character holds few
    edges; one over the block records, which are read in both directions too —
    a block is directed in authorship and symmetric in effect (ADR-0077), so
    either party's block silences the pair.
    """
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
        # Blocked wins, in both directions, whatever the edge says — and the
        # edge survives, so unblocking restores the subscription for free.
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
    """Persist one structured taunt reference.

    Always creates the row: the backend can't know whether the catalog has a
    variant for this (faction_slug, trigger_type) — the frontend owns the
    ``default`` fallback. Callers are responsible for the ADR-0068 delivery
    check; this is the writer, not the gate.
    """
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
    """Send one taunt to every subscriber of ``sender_id``.

    The whole spam story is structural (ADR-0068): the fan-out is bounded by how
    many people chose to declare this character a foe, so no throttle, cooldown
    or cap is applied here.
    """
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
    """Fire the two score-recalculation triggers for one character (ADR-0068).

    ``level_up`` needles every subscriber whenever the level rises — no
    high-water mark, so a dip below a boundary and a re-cross taunts again.

    ``score_overtake`` compares the pair's ordering *before* and *after* this
    write, in both directions, and is self-deduplicating by construction: the
    same pair cannot fire again until the lead flips back. "Ahead" is strictly
    greater, so breaking a tie is a flip. Both directions matter — this
    character rising past a subscriber (sender: this character), and this
    character falling behind someone they subscribed to (sender: the other
    party, who never opts in and never sees it).

    Call only for the era in progress and only from organic play; era
    transitions and admin backfills are silent.
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
        # No stats row for this era ⟹ they are on nobody's ladder yet, at zero.
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
