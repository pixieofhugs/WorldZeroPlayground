"""Dev-only bot login (POST /auth/dev-login); `faction` bypasses the invite gate (#651).

The production 404 is load-bearing: it issues a session with no credential.
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
from models.invitation_letter import InvitationLetter
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Any real faction other than the fixtures'; derived, never named (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


@pytest.fixture
async def other_faction(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """Already seeded by ``some_faction``; re-adding would be a duplicate PK."""
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
    """The sweep re-logs the same bot per faction; the last call wins."""
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
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    resp = await client.post(
        f"/auth/dev-login?key=contrast&faction={DEFAULT_FACTION_SLUG}"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dev_login_invited_delivers_letter(
    client: AsyncClient, db_session: AsyncSession, other_faction: Faction, era: Era
) -> None:
    resp = await client.post(
        f"/auth/dev-login?key=inv&name=Inv&level=1&invited={OTHER_FACTION_SLUG}"
    )
    assert resp.status_code == 200
    slugs = (
        await db_session.scalars(
            select(InvitationLetter.faction_slug).where(
                InvitationLetter.character_id == resp.json()["character_id"]
            )
        )
    ).all()
    assert slugs == [OTHER_FACTION_SLUG]


@pytest.mark.asyncio
async def test_dev_login_albescent_unlocked_is_earned_not_flagged(
    client: AsyncClient, some_faction: Faction, era: Era
) -> None:
    resp = await client.post("/auth/dev-login?key=alb&name=Alb&albescent=unlocked")
    assert resp.status_code == 200
    me = (await client.get("/auth/me")).json()
    assert me["can_start_as_albescent"] is True
    assert me["albescent_revealed"] is True
    assert me["albescent_glimpsed"] is True


@pytest.mark.asyncio
async def test_dev_login_albescent_glimpsed_only(
    client: AsyncClient, some_faction: Faction, era: Era
) -> None:
    await client.post("/auth/dev-login?key=glimpse&name=Gl&albescent=glimpsed")
    me = (await client.get("/auth/me")).json()
    assert me["albescent_glimpsed"] is True
    assert me["can_start_as_albescent"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "query, status",
    [
        ("name=B&invited=nosuch", 400),
        ("name=B&invited=albescent", 400),  # a sentinel, never a real invitation
        ("name=B&invited=unaffiliated", 400),
        ("name=B&albescent=maybe", 422),
        ("albescent=glimpsed", 400),  # no character on this account yet
    ],
)
async def test_dev_login_rejects_bad_fixture_params(
    client: AsyncClient, some_faction: Faction, era: Era, query: str, status: int
) -> None:
    resp = await client.post(f"/auth/dev-login?key=bad&{query}")
    assert resp.status_code == status


@pytest.mark.asyncio
async def test_dev_login_fixture_params_404_in_production(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    resp = await client.post(
        "/auth/dev-login?key=x&name=X&invited=snide&albescent=unlocked"
    )
    assert resp.status_code == 404
