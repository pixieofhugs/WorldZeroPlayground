"""Integration tests for the dev-only bot-login seam (POST /auth/dev-login).

Covers the `faction` param added for the contrast sweep (#651): it places a
character in an arbitrary faction directly, bypassing the invite gate that
would otherwise make 5 of the 7 factions unreachable from a test.

The production guard is the load-bearing part — this endpoint hands out a
session cookie with no credential, so a regression that let it answer in
production would be a full auth bypass.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus


@pytest.fixture
async def faction_ephemerists_row(db_session: AsyncSession) -> Faction:
    """Seed a non-ua faction so the character.faction_slug FK can point at it."""
    result = await db_session.execute(
        select(Faction).where(Faction.slug == "ephemerists")
    )
    faction = result.scalar_one_or_none()
    if faction is None:
        faction = Faction(slug="ephemerists", status=FactionStatus.visible)
        db_session.add(faction)
        await db_session.flush()
    return faction


async def _character_faction(db_session: AsyncSession, character_id: int) -> str:
    result = await db_session.execute(
        select(Character.faction_slug).where(Character.id == character_id)
    )
    return result.scalar_one()


@pytest.mark.asyncio
async def test_dev_login_faction_places_character(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    faction_ephemerists_row: Faction,
) -> None:
    """?faction=<slug> puts the character straight into that faction."""
    resp = await client.post(
        "/auth/dev-login?key=contrast&name=Sweep%20Bot&faction=ephemerists"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["faction_slug"] == "ephemerists"
    assert await _character_faction(db_session, body["character_id"]) == "ephemerists"


@pytest.mark.asyncio
async def test_dev_login_faction_is_idempotent_across_calls(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    faction_ephemerists_row: Faction,
) -> None:
    """The sweep re-logs the same bot per faction — the last call wins."""
    first = await client.post("/auth/dev-login?key=contrast&name=Sweep%20Bot&faction=ephemerists")
    second = await client.post("/auth/dev-login?key=contrast&faction=ua")
    assert second.status_code == 200
    assert second.json()["character_id"] == first.json()["character_id"]
    assert await _character_faction(db_session, second.json()["character_id"]) == "ua"


@pytest.mark.asyncio
async def test_dev_login_rejects_unknown_faction(
    client: AsyncClient,
    era: Era,
    some_faction: Faction,
) -> None:
    """A typo'd slug is a 400, not a silent no-op that skins the wrong faction."""
    resp = await client.post("/auth/dev-login?key=contrast&name=Sweep%20Bot&faction=nosuch")
    assert resp.status_code == 400
    assert "nosuch" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_dev_login_faction_without_character_is_rejected(
    client: AsyncClient,
    era: Era,
    some_faction: Faction,
) -> None:
    """faction= with no character to place fails loudly rather than doing nothing."""
    resp = await client.post("/auth/dev-login?key=contrast-nochar&faction=ua")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_dev_login_without_faction_leaves_membership_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    faction_ephemerists_row: Faction,
) -> None:
    """Omitting faction= must not reset an existing membership."""
    first = await client.post("/auth/dev-login?key=contrast&name=Sweep%20Bot&faction=ephemerists")
    await client.post("/auth/dev-login?key=contrast")
    assert await _character_faction(db_session, first.json()["character_id"]) == "ephemerists"


@pytest.mark.asyncio
async def test_dev_login_404s_in_production(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The guard the whole seam rests on."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    resp = await client.post("/auth/dev-login?key=contrast&faction=ua")
    assert resp.status_code == 404
