"""Service layer for foe taunts.

Generates faction-flavored taunt messages when foes overtake each other in
score, level up, or complete submissions.
"""
import random
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import TAUNT_TEMPLATES
from models.character import Character
from models.taunt_message import TauntMessage, TauntTriggerType

DEFAULT_FACTION = "default"


def pick_taunt_template(
    faction_slug: str,
    trigger_type: str,
) -> Optional[str]:
    """Select a random template string for the given faction and trigger."""
    faction_templates = TAUNT_TEMPLATES.get(faction_slug, {})
    templates = faction_templates.get(trigger_type)

    if not templates:
        fallback_templates = TAUNT_TEMPLATES.get(DEFAULT_FACTION, {})
        templates = fallback_templates.get(trigger_type)

    if not templates:
        return None

    return random.choice(templates)


async def generate_taunt(
    from_character: Character,
    to_character: Character,
    trigger_type: TauntTriggerType,
    session: AsyncSession,
) -> Optional[TauntMessage]:
    """Generate and persist a taunt message between foes."""
    template = pick_taunt_template(
        from_character.faction_slug,
        trigger_type.value,
    )
    if template is None:
        return None

    message_text = template.format(
        from_name=from_character.display_name,
        to_name=to_character.display_name,
    )

    taunt = TauntMessage(
        from_character_id=from_character.id,
        to_character_id=to_character.id,
        message=message_text,
        trigger_type=trigger_type,
    )
    session.add(taunt)
    await session.flush()
    await session.refresh(taunt)
    return taunt


async def get_taunts_for_character(
    character_id: int,
    session: AsyncSession,
    limit: int = 20,
) -> list[TauntMessage]:
    """Fetch recent taunts received by a character."""
    result = await session.execute(
        select(TauntMessage)
        .where(TauntMessage.to_character_id == character_id)
        .order_by(TauntMessage.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
