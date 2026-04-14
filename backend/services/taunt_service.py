"""Service layer for foe taunts.

Generates faction-flavored taunt messages when foes overtake each other in
score, level up, or complete submissions.
"""
import random
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.taunt_message import TauntMessage, TauntTriggerType

DEFAULT_FACTION = "default"


def pick_taunt_template(
    faction_slug: str,
    trigger_type: str,
    era: EraConfig = CURRENT_ERA,
) -> Optional[str]:
    """Select a random template string for the given faction and trigger."""
    templates_dict = era.taunt_templates
    faction_templates = templates_dict.get(faction_slug, {})
    templates = faction_templates.get(trigger_type)

    if not templates:
        fallback_templates = templates_dict.get(DEFAULT_FACTION, {})
        templates = fallback_templates.get(trigger_type)

    if not templates:
        return None

    return random.choice(templates)


async def generate_taunt(
    from_character: Character,
    to_character: Character,
    trigger_type: TauntTriggerType,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Optional[TauntMessage]:
    """Generate and persist a taunt message between foes."""
    template = pick_taunt_template(
        from_character.faction_slug,
        trigger_type.value,
        era=era,
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
) -> list[dict]:
    """Fetch recent taunts received by a character, enriched with sender display info."""
    result = await session.execute(
        select(
            TauntMessage,
            Character.display_name.label("from_display_name"),
            Character.faction_slug.label("from_faction_slug"),
            Character.avatar_url.label("from_avatar_url"),
        )
        .join(Character, TauntMessage.from_character_id == Character.id)
        .where(TauntMessage.to_character_id == character_id)
        .order_by(TauntMessage.created_at.desc())
        .limit(limit)
    )
    rows = result.all()
    enriched: list[dict] = []
    for taunt, display_name, faction_slug, avatar_url in rows:
        data = {
            "id": taunt.id,
            "from_character_id": taunt.from_character_id,
            "to_character_id": taunt.to_character_id,
            "message": taunt.message,
            "trigger_type": taunt.trigger_type.value,
            "created_at": taunt.created_at,
            "from_display_name": display_name,
            "from_faction_slug": faction_slug,
            "from_avatar_url": avatar_url,
        }
        enriched.append(data)
    return enriched
