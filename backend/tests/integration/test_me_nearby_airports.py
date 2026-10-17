"""GET /me/nearby-airports (#3247)."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character


@pytest.mark.asyncio
async def test_null_without_recognised_location(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    for location in ("", "ZZZ"):
        character.location = location
        await db_session.commit()
        resp = await client.get("/me/nearby-airports", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == {"codes": None}


@pytest.mark.asyncio
async def test_lists_codes_for_known_airport(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    character.location = "PDX"
    await db_session.commit()
    codes = (await client.get("/me/nearby-airports", headers=auth_headers)).json()["codes"]
    assert "PDX" in codes
    assert "SEA" not in codes


@pytest.mark.asyncio
async def test_requires_auth(client: AsyncClient):
    assert (await client.get("/me/nearby-airports")).status_code in (401, 403)
