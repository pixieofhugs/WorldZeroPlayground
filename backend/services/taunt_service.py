"""Service layer for foe taunts.

ADR-0031: the backend never renders taunt prose. It persists a structured
reference — the sender's send-time faction voice (``faction_slug``) plus the
``trigger_type`` — and the frontend react-i18next catalog
(``frontend/src/locales/en/taunts.json``) owns the words. The read path adds
the FK-derived display names; the frontend picks a variant deterministically
from the row id and interpolates the names.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.taunt_message import TauntMessage, TauntTriggerType


async def generate_taunt(
    from_character: Character,
    to_character: Character,
    trigger_type: TauntTriggerType,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> TauntMessage:
    """Persist a structured taunt reference between foes.

    Always creates the row: the backend can't know whether the catalog has a
    variant for this (faction_slug, trigger_type) — the frontend owns the
    ``default`` fallback. ``era`` is accepted for signature consistency with the
    rest of the service layer even though no era values are read here.
    """
    taunt = TauntMessage(
        from_character_id=from_character.id,
        to_character_id=to_character.id,
        faction_slug=from_character.faction_slug,
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
    """Fetch recent taunts received by a character as structured references.

    Returns the sender's frozen ``faction_slug`` + ``trigger_type`` plus the
    FK-derived sender and recipient display names, so the frontend catalog can
    resolve and interpolate the copy. No prose is returned.
    """
    from_character = aliased(Character)
    to_character = aliased(Character)
    result = await session.execute(
        select(
            TauntMessage,
            from_character.display_name.label("from_display_name"),
            from_character.avatar_url.label("from_avatar_url"),
            to_character.display_name.label("to_display_name"),
        )
        .join(from_character, TauntMessage.from_character_id == from_character.id)
        .join(to_character, TauntMessage.to_character_id == to_character.id)
        .where(TauntMessage.to_character_id == character_id)
        .order_by(TauntMessage.created_at.desc())
        .limit(limit)
    )
    enriched: list[dict] = []
    for taunt, from_display_name, from_avatar_url, to_display_name in result.all():
        enriched.append({
            "id": taunt.id,
            "from_character_id": taunt.from_character_id,
            "to_character_id": taunt.to_character_id,
            "faction_slug": taunt.faction_slug,
            "trigger_type": taunt.trigger_type.value,
            "created_at": taunt.created_at,
            "from_display_name": from_display_name,
            "from_faction_slug": taunt.faction_slug,
            "from_avatar_url": from_avatar_url,
            "to_display_name": to_display_name,
        })
    return enriched
