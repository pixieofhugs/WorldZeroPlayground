"""Tests for foe taunts: structured-reference generation + /taunts endpoint.

ADR-0031: taunts persist a (faction_slug, trigger_type) reference, never
rendered prose. The frontend catalog resolves the words.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.taunt_message import TauntTriggerType
from services.taunt_service import generate_taunt, get_taunts_for_character


@pytest.mark.asyncio
async def test_generate_taunt_persists_structured_reference(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """generate_taunt writes a structured row (frozen faction_slug + trigger,
    no prose); GET /taunts returns it enriched with both display names."""
    taunt = await generate_taunt(
        from_character=character2,
        to_character=character,
        trigger_type=TauntTriggerType.score_overtake,
        session=db_session,
    )
    assert taunt is not None
    # The frozen send-time faction voice is stored, not a rendered sentence.
    assert taunt.faction_slug == character2.faction_slug
    assert not hasattr(taunt, "message")
    await db_session.commit()

    resp = await client.get("/taunts", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    entry = body[0]
    assert entry["to_character_id"] == character.id
    assert entry["from_character_id"] == character2.id
    assert entry["faction_slug"] == character2.faction_slug
    assert entry["from_display_name"] == character2.display_name
    assert entry["to_display_name"] == character.display_name
    assert entry["trigger_type"] == "score_overtake"
    assert "message" not in entry


@pytest.mark.asyncio
async def test_generate_taunt_always_creates_row(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
):
    """The backend can't know whether the catalog has a variant, so it always
    creates the row — the frontend owns the default fallback."""
    taunt = await generate_taunt(
        from_character=character2,
        to_character=character,
        trigger_type=TauntTriggerType.level_up,
        session=db_session,
    )
    assert taunt is not None
    assert taunt.id is not None


@pytest.mark.asyncio
async def test_get_taunts_for_character_empty(
    db_session: AsyncSession, character: Character
):
    """A character with no taunts gets an empty list."""
    assert await get_taunts_for_character(character.id, db_session) == []
