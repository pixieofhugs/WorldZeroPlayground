"""Tests for the public /game-config endpoint."""
import pytest
from httpx import AsyncClient

from game_config import CURRENT_ERA


@pytest.mark.asyncio
async def test_get_game_config_returns_current_era(client: AsyncClient):
    """GET /game-config exposes the live era config with no auth required."""
    resp = await client.get("/game-config")
    assert resp.status_code == 200
    data = resp.json()

    assert data["era_name"] == CURRENT_ERA.name
    assert data["level_thresholds"] == list(CURRENT_ERA.level_thresholds)
    assert data["max_task_signups"] == CURRENT_ERA.max_task_signups
    assert data["vote_budget_base"] == CURRENT_ERA.vote_budget_base

    # Every configured faction is present with its scoring modifiers.
    assert len(data["factions"]) == len(CURRENT_ERA.factions)
    slugs = {faction["slug"] for faction in data["factions"]}
    assert slugs == set(CURRENT_ERA.factions.keys())

    # level_profiles serialized index-aligned with level_thresholds.
    assert len(data["level_profiles"]) == len(CURRENT_ERA.level_profiles)
    served_level_1 = data["level_profiles"][1]
    assert served_level_1["rank"] == CURRENT_ERA.level_profiles[1].rank
    assert served_level_1["unlocks"][0]["kind"] in {"ability", "sense"}
