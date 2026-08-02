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

    # Pending-publish silence-is-consent window (ADR-0012): duration only,
    # since submit_proposed_at (the start) is already on PraxisOut.
    assert data["collab_auto_submit_days"] == CURRENT_ERA.collab_auto_submit_days

    # Every configured faction is present with its scoring modifiers.
    assert len(data["factions"]) == len(CURRENT_ERA.factions)
    slugs = {faction["slug"] for faction in data["factions"]}
    assert slugs == set(CURRENT_ERA.factions.keys())

    # level_profiles serialized index-aligned with level_thresholds, emitting
    # copy KEYS not prose (ADR-0031).
    assert len(data["level_profiles"]) == len(CURRENT_ERA.level_profiles)
    served_level_1 = data["level_profiles"][1]
    assert served_level_1["rank_key"] == CURRENT_ERA.level_profiles[1].rank_key
    assert "rank" not in served_level_1
    first_unlock = served_level_1["unlocks"][0]
    assert first_unlock["kind"] in {"ability", "sense"}
    assert first_unlock["key"] == CURRENT_ERA.level_profiles[1].unlocks[0].key
    assert "name" not in first_unlock and "desc" not in first_unlock


@pytest.mark.asyncio
async def test_game_config_omits_rules_no_client_reads(client: AsyncClient):
    """Four dead wire fields are gone from /game-config (#1387).

    All four stay LIVE rules on ``EraConfig``: the server enforces the
    collaboration gate, ``services.faction_service`` branches on
    ``can_always_rejoin``, and the vote budget is computed on read (ADR-0043).
    Only the projection onto the public config payload went.

    Albescent is named explicitly because it is the one faction whose
    ``can_always_rejoin`` is True — a leftover serializer would emit ``true``
    there rather than a defaulted false.
    """
    data = (await client.get("/game-config")).json()

    for field in (
        "collaboration_level_required",
        "vote_budget_base",
        "vote_budget_multiplier",
    ):
        assert field not in data

    assert CURRENT_ERA.factions["albescent"].can_always_rejoin is True
    for faction in data["factions"]:
        assert "can_always_rejoin" not in faction
