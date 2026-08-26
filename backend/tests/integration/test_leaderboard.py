"""Integration tests for /leaderboard endpoints."""
import pytest
from httpx import AsyncClient

from models.character import Character
from models.era import Era
from models.faction import Faction


# ---------------------------------------------------------------------------
# Global leaderboard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_leaderboard_returns_characters(
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
):
    """GET /leaderboard returns active characters ordered by score."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [c["id"] for c in data]
    # Both characters are seeded and active
    assert character.id in ids
    assert character2.id in ids


@pytest.mark.asyncio
async def test_leaderboard_ordering(
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
):
    """character2 (score=500) should appear before character (score=0)."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    if character2.id in ids and character.id in ids:
        assert ids.index(character2.id) < ids.index(character.id)


@pytest.mark.asyncio
async def test_leaderboard_faction_filter(
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
):
    """GET /leaderboard?faction=ua returns only ua-faction characters."""
    resp = await client.get("/leaderboard?faction=ua")
    assert resp.status_code == 200
    data = resp.json()
    for char in data:
        assert char["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_leaderboard_faction_filter_no_results(
    client: AsyncClient,
    era: Era,
    some_faction: Faction,
):
    """Filtering by a faction with no members returns an empty list."""
    resp = await client.get("/leaderboard?faction=nonexistent_faction")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_leaderboard_pagination(
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
):
    """limit and offset parameters are respected."""
    resp = await client.get("/leaderboard?limit=1&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 1


@pytest.mark.asyncio
async def test_leaderboard_no_era(
    client: AsyncClient,
):
    """Leaderboard with no era seeded still returns 200 (empty list)."""
    # This test verifies the graceful degradation path when era_id is None
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_leaderboard_response_structure(
    client: AsyncClient,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """Each character in the leaderboard has expected fields and no account_id."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200
    for char in resp.json():
        assert "id" in char
        assert "username" in char
        assert "display_name" in char
        assert "faction_slug" in char
        # account_id must never be exposed
        assert "account_id" not in char
        assert "email" not in char


# ---------------------------------------------------------------------------
# Stable ordering (#655) — score alone is not a total order
# ---------------------------------------------------------------------------


async def _seed_tied_characters(db_session, era: Era, count: int) -> list[int]:
    """``count`` characters, all on score 0 — the shape most of the roster has."""
    from models.account import Account
    from models.character import Character
    from models.character_stats import CharacterStats

    ids: list[int] = []
    for index in range(count):
        account = Account(email=f"tied{index}@example.com")
        db_session.add(account)
        await db_session.flush()
        character = Character(
            account_id=account.id,
            username=f"tied{index}",
            display_name=f"Tied {index}",
            faction_slug="na",
        )
        db_session.add(character)
        await db_session.flush()
        db_session.add(
            CharacterStats(
                character_id=character.id,
                era_id=era.id,
                score=0,
                all_time_score=0,
                level=0,
                votes_spent_this_era=0,
            )
        )
        ids.append(character.id)
    await db_session.commit()
    return ids


@pytest.mark.asyncio
async def test_tied_scores_order_identically_across_calls(
    client: AsyncClient,
    db_session,
    era: Era,
    some_faction: Faction,
):
    """Characters tied at zero come back in the same order every request.

    Without the id tiebreak Postgres is free to reshuffle equal-score rows, which
    flickers the sky's top-N membership and its crown.
    """
    await _seed_tied_characters(db_session, era, count=5)

    orders = []
    for _ in range(3):
        resp = await client.get("/leaderboard")
        assert resp.status_code == 200
        orders.append([row["id"] for row in resp.json()])

    assert orders[0] == orders[1] == orders[2]
    assert orders[0] == sorted(orders[0]), "tied rows sort by id ascending"


@pytest.mark.asyncio
async def test_paging_tied_scores_partitions_without_overlap_or_gaps(
    client: AsyncClient,
    db_session,
    era: Era,
    some_faction: Faction,
):
    """limit/offset over a tied set slices it cleanly — no duplicates, no drops."""
    seeded_ids = await _seed_tied_characters(db_session, era, count=6)

    paged: list[int] = []
    for offset in (0, 2, 4):
        resp = await client.get(f"/leaderboard?limit=2&offset={offset}")
        assert resp.status_code == 200
        page = [row["id"] for row in resp.json()]
        assert len(page) == 2
        paged.extend(page)

    assert len(set(paged)) == len(paged), "no character appears on two pages"
    assert set(paged) == set(seeded_ids), "every character appears on exactly one page"
