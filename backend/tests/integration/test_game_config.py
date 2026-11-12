"""Tests for the public /game-config endpoint."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from services.progression import HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
from services.scoring import sole_tie_taker_slug


@pytest.mark.asyncio
async def test_get_game_config_returns_current_era(client: AsyncClient):
    resp = await client.get("/game-config")
    assert resp.status_code == 200
    data = resp.json()

    assert data["era_name"] == CURRENT_ERA.name
    assert data["level_thresholds"] == list(CURRENT_ERA.level_thresholds)
    assert data["max_task_signups"] == CURRENT_ERA.max_task_signups

    # ADR-0012: duration only; the start is on PraxisOut.
    assert data["collab_auto_submit_days"] == CURRENT_ERA.collab_auto_submit_days

    assert len(data["factions"]) == len(CURRENT_ERA.factions)
    slugs = {faction["slug"] for faction in data["factions"]}
    assert slugs == set(CURRENT_ERA.factions.keys())

    # Keys, not prose (ADR-0031).
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
    """#1387: still live server-side rules, just not on the wire.

    Albescent is the one ``can_always_rejoin=True``: a leftover serializer shows.
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


@pytest.mark.asyncio
async def test_game_config_carries_the_array_flag(client: AsyncClient):
    """The client is the gate for this browser-side perk (#1869)."""
    data = (await client.get("/game-config")).json()
    served = {faction["slug"]: faction["reads_the_array"] for faction in data["factions"]}

    assert served == {
        slug: faction.reads_the_array for slug, faction in CURRENT_ERA.factions.items()
    }

    # Non-vacuity: a constant-False serializer passes above. By perk (#2708).
    holders = {
        slug
        for slug, faction in CURRENT_ERA.factions.items()
        if faction.reads_the_array
    }
    if not holders:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} reads the array")
    assert {slug for slug, value in served.items() if value} == holders


@pytest.mark.asyncio
async def test_game_config_carries_the_tie_taking_flag(client: AsyncClient):
    """#2664: the served flag picks exactly the factions ``sole_tie_taker_slug`` does,
    so the client's ``duelStakes`` and server scoring share one rule."""
    data = (await client.get("/game-config")).json()
    served = {
        faction["slug"]: faction["takes_duel_ties"] for faction in data["factions"]
    }

    assert served == {
        slug: faction.takes_duel_ties
        for slug, faction in CURRENT_ERA.factions.items()
    }

    holders = {slug for slug, value in served.items() if value}
    if not holders:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} takes duel ties")
    a_non_holder = next(slug for slug, value in served.items() if not value)
    scored = {
        slug
        for slug in served
        if sole_tie_taker_slug(slug, a_non_holder, CURRENT_ERA) == slug
    }
    assert scored == holders

    # Self-cancelling, so inheritors must not pick it up (#2664).
    for slug in holders:
        assert sole_tie_taker_slug(slug, slug, CURRENT_ERA) is None
    inheritors = {
        slug
        for slug, faction in CURRENT_ERA.factions.items()
        if faction.inherits_faction_perks
    }
    assert not (inheritors & holders), (
        "an inheritor holding the tie-taking perk would DESTROY the sole "
        "holder's ability, not gain one"
    )


# The secret-society rung (#1891).


def _ladder_unlock_keys(data: dict) -> set[str]:
    return {
        unlock["key"]
        for profile in data["level_profiles"]
        for unlock in profile["unlocks"]
    }


@pytest.mark.asyncio
async def test_join_albescent_rung_hidden_from_anonymous(client: AsyncClient):
    data = (await client.get("/game-config")).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_join_albescent_rung_hidden_from_unrevealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    assert account.albescent_revealed is False
    data = (await client.get("/game-config", headers=auth_headers)).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_join_albescent_rung_shown_to_revealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    account.albescent_revealed = True
    await db_session.flush()

    data = (await client.get("/game-config", headers=auth_headers)).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_hiding_the_rung_keeps_every_level_in_place(client: AsyncClient):
    """``LevelUpWatcher`` indexes profiles by level: drop the rung, not the profile."""
    data = (await client.get("/game-config")).json()

    assert len(data["level_profiles"]) == len(CURRENT_ERA.level_profiles)
    for served, configured in zip(data["level_profiles"], CURRENT_ERA.level_profiles):
        assert served["rank_key"] == configured.rank_key
        assert [unlock["key"] for unlock in served["unlocks"]] == [
            unlock.key
            for unlock in configured.unlocks
            if unlock.key != HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
        ]
