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
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: A real faction of the live era that is NOT the one the shared fixtures seat
#: characters in. Derived, never named (#2708): "some other faction" is the
#: whole requirement, and the era owns which one that is.
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


@pytest.fixture
async def other_faction(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """A faction that is not the fixtures' own, for the FK to point at.

    Seeded by ``some_faction`` since #2708 — every era's slugs get a row, so
    adding this one again is a duplicate primary key rather than a no-op.
    """
    result = await db_session.execute(
        select(Faction).where(Faction.slug == OTHER_FACTION_SLUG)
    )
    return result.scalar_one()


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
    other_faction: Faction,
) -> None:
    """?faction=<slug> puts the character straight into that faction."""
    resp = await client.post(
        f"/auth/dev-login?key=contrast&name=Sweep%20Bot&faction={OTHER_FACTION_SLUG}"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["faction_slug"] == OTHER_FACTION_SLUG
    assert (
        await _character_faction(db_session, body["character_id"])
        == OTHER_FACTION_SLUG
    )


@pytest.mark.asyncio
async def test_dev_login_faction_is_idempotent_across_calls(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    other_faction: Faction,
) -> None:
    """The sweep re-logs the same bot per faction — the last call wins."""
    first = await client.post(
        f"/auth/dev-login?key=contrast&name=Sweep%20Bot&faction={OTHER_FACTION_SLUG}"
    )
    second = await client.post(
        f"/auth/dev-login?key=contrast&faction={DEFAULT_FACTION_SLUG}"
    )
    assert second.status_code == 200
    assert second.json()["character_id"] == first.json()["character_id"]
    assert (
        await _character_faction(db_session, second.json()["character_id"])
        == DEFAULT_FACTION_SLUG
    )


@pytest.mark.asyncio
async def test_dev_login_rejects_unknown_faction(
    client: AsyncClient,
    era: Era,
    some_faction: Faction,
) -> None:
    """A typo'd slug is a 400, not a silent no-op that skins the wrong faction."""
    resp = await client.post(
        "/auth/dev-login?key=contrast&name=Sweep%20Bot&faction=nosuch"
    )
    assert resp.status_code == 400
    assert "nosuch" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_dev_login_faction_without_character_is_rejected(
    client: AsyncClient,
    era: Era,
    some_faction: Faction,
) -> None:
    """faction= with no character to place fails loudly rather than doing nothing."""
    resp = await client.post(
        f"/auth/dev-login?key=contrast-nochar&faction={DEFAULT_FACTION_SLUG}"
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_dev_login_without_faction_leaves_membership_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    other_faction: Faction,
) -> None:
    """Omitting faction= must not reset an existing membership."""
    first = await client.post(
        f"/auth/dev-login?key=contrast&name=Sweep%20Bot&faction={OTHER_FACTION_SLUG}"
    )
    await client.post("/auth/dev-login?key=contrast")
    assert (
        await _character_faction(db_session, first.json()["character_id"])
        == OTHER_FACTION_SLUG
    )


@pytest.mark.asyncio
async def test_dev_login_404s_in_production(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The guard the whole seam rests on."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    resp = await client.post(
        f"/auth/dev-login?key=contrast&faction={DEFAULT_FACTION_SLUG}"
    )
    assert resp.status_code == 404
