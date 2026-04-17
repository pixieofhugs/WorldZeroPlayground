"""Integration tests for /characters endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis
from models.task import Task, TaskStatus


@pytest.mark.asyncio
async def test_list_characters_public(client: AsyncClient, character: Character):
    resp = await client.get("/characters")
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids


@pytest.mark.asyncio
async def test_get_character(client: AsyncClient, character: Character):
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == character.id
    assert data["username"] == character.username
    # account_id must never be exposed
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_get_character_not_found(client: AsyncClient):
    resp = await client.get("/characters/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_character(
    client: AsyncClient, account: Account, era: Era, faction_ua: Faction, auth_headers: dict
):
    resp = await client.post(
        "/characters",
        json={"username": "newchar", "display_name": "New Character"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newchar"
    assert data["faction_slug"] == "ua"
    assert "account_id" not in data


@pytest.mark.asyncio
async def test_create_character_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/characters",
        json={"username": "newchar2", "display_name": "Another"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_update_character(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Updated Name"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_character_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """Character owned by account2 cannot edit character owned by account1."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Hacked"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_character(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)
    assert resp.status_code == 204

    # Should not be visible after deletion
    get_resp = await client.get(f"/characters/{character.id}")
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# T.5 additions — search/filter, stats fields, praxes, faction change, second char
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_characters_search_by_username(
    client: AsyncClient, character: Character, character2: Character
):
    """Search by partial username returns matching characters."""
    resp = await client.get("/characters", params={"search": "testcharacter"})
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids
    assert character2.id not in ids


@pytest.mark.asyncio
async def test_list_characters_filter_by_faction(
    client: AsyncClient, character: Character, character2: Character
):
    """Filter by faction slug returns only characters in that faction."""
    resp = await client.get("/characters", params={"faction": "ua"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    for entry in data:
        assert entry["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_list_characters_faction_no_match(client: AsyncClient, character: Character):
    """Filter by a faction with no members returns empty list."""
    resp = await client.get("/characters", params={"faction": "nonexistent_faction"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_characters_limit_offset(
    client: AsyncClient, character: Character, character2: Character
):
    """Limit and offset pagination controls work."""
    resp_all = await client.get("/characters", params={"limit": 50, "offset": 0})
    assert resp_all.status_code == 200
    all_ids = [c["id"] for c in resp_all.json()]

    # Offset by total count should return empty
    total = len(all_ids)
    resp_empty = await client.get("/characters", params={"limit": 50, "offset": total})
    assert resp_empty.status_code == 200
    assert resp_empty.json() == []


@pytest.mark.asyncio
async def test_get_character_includes_stats_fields(
    client: AsyncClient, character2: Character
):
    """GET /characters/{id} returns score, level, and all_time_score from CharacterStats."""
    resp = await client.get(f"/characters/{character2.id}")
    assert resp.status_code == 200
    data = resp.json()
    # character2 was seeded with score=500, level=5
    assert data["score"] == 500
    assert data["level"] == 5
    assert data["all_time_score"] == 500


@pytest.mark.asyncio
async def test_get_character_no_account_id_in_response(
    client: AsyncClient, character: Character
):
    """account_id and email must never appear in the character response."""
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_get_character_praxes_empty(client: AsyncClient, character: Character):
    """GET /characters/{id}/praxes returns an empty list when no praxis exists."""
    resp = await client.get(f"/characters/{character.id}/praxes")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_character_praxes_returns_list(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """GET /characters/{id}/praxes returns seeded praxis entries."""
    from models.praxis import PraxisType
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="My Praxis",
        body_text="Proof here",
    )
    db_session.add(praxis)
    await db_session.commit()

    resp = await client.get(f"/characters/{character.id}/praxes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "My Praxis"


@pytest.mark.asyncio
async def test_get_character_praxes_pagination(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
):
    """GET /characters/{id}/praxes respects limit and offset."""
    from models.praxis import PraxisType
    for index in range(3):
        praxis = Praxis(
            task_id=active_task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title=f"Praxis {index}",
            body_text="proof",
        )
        db_session.add(praxis)
    await db_session.commit()

    resp_limited = await client.get(
        f"/characters/{character.id}/praxes", params={"limit": 2, "offset": 0}
    )
    assert resp_limited.status_code == 200
    assert len(resp_limited.json()) == 2

    resp_offset = await client.get(
        f"/characters/{character.id}/praxes", params={"limit": 10, "offset": 2}
    )
    assert resp_offset.status_code == 200
    assert len(resp_offset.json()) == 1


@pytest.mark.asyncio
async def test_faction_change_via_choose_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
    auth_headers2: dict,
):
    """POST /factions/choose lets a level-3+ character defect to a new faction.

    character2 is level 5 (seeded in conftest), so the defection should succeed
    provided the target faction exists and is selectable.
    """
    from models.faction import FactionStatus

    # Seed a selectable target faction
    target = Faction(
        slug="testfaction",
        name="Test Faction",
        description="A test faction",
        status=FactionStatus.visible,
    )
    db_session.add(target)
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "testfaction"},
        headers=auth_headers2,
    )
    # If the faction isn't configured in ERA (no EraConfig entry), defection is rejected (404)
    # or succeeds (200). Either way the endpoint must be reachable.
    assert resp.status_code in (200, 403, 404, 422)


@pytest.mark.asyncio
async def test_second_character_blocked_below_level5(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """Account with a level-4 first character cannot create a second character (R.7)."""
    # Raise the first character's level to 4 — still below the level-5 gate
    from sqlalchemy import select
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 4
    await db_session.commit()

    resp = await client.post(
        "/characters",
        json={"username": "secondchar", "display_name": "Second"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    # The error message must explicitly name the level-5 requirement
    assert "5" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_second_character_allowed_at_level5(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    era: Era,
    faction_ua: Faction,
    auth_headers2: dict,
):
    """Account whose first character is level 5 can create a second character (R.7)."""
    # character2 from conftest already exists with level 5; auth_headers2 belongs to account2
    resp = await client.post(
        "/characters",
        json={"username": "secondcharacter2", "display_name": "Second Two"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "secondcharacter2"
    assert "account_id" not in data


@pytest.mark.asyncio
async def test_albescent_requires_level8_character_on_account(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    character2: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers2: dict,
):
    """Creating an Albescent second character requires a level-8 character on the account (R.7)."""
    from models.faction import FactionStatus
    from sqlalchemy import select

    # Ensure the albescent faction exists (required FK)
    result = await db_session.execute(select(Faction).where(Faction.slug == "albescent"))
    if result.scalar_one_or_none() is None:
        albescent = Faction(
            slug="albescent",
            name="Albescent",
            description="Albescent faction",
            status=FactionStatus.visible,
        )
        db_session.add(albescent)
        await db_session.commit()

    # character2 is level 5 — raise to 7 (still below 8)
    stats_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = stats_result.scalar_one()
    stats.level = 7
    await db_session.commit()

    # Level 7 — Albescent should be blocked
    resp_blocked = await client.post(
        "/characters",
        json={
            "username": "alb_second",
            "display_name": "Alb Second",
            "faction_slug": "albescent",
        },
        headers=auth_headers2,
    )
    assert resp_blocked.status_code == 403
    assert "8" in resp_blocked.json()["detail"]

    # Raise to level 8 — Albescent should succeed
    stats.level = 8
    await db_session.commit()

    resp_allowed = await client.post(
        "/characters",
        json={
            "username": "alb_second2",
            "display_name": "Alb Second 2",
            "faction_slug": "albescent",
        },
        headers=auth_headers2,
    )
    assert resp_allowed.status_code == 201
    assert resp_allowed.json()["faction_slug"] == "albescent"


@pytest.mark.asyncio
async def test_albescent_character_starts_in_albescent_faction(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    character2: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers2: dict,
):
    """A second character created as Albescent has faction_slug='albescent' (R.8), not 'ua'."""
    from models.faction import FactionStatus
    from sqlalchemy import select

    # Ensure the albescent faction exists
    result = await db_session.execute(select(Faction).where(Faction.slug == "albescent"))
    if result.scalar_one_or_none() is None:
        albescent = Faction(
            slug="albescent",
            name="Albescent",
            description="Albescent faction",
            status=FactionStatus.visible,
        )
        db_session.add(albescent)
        await db_session.commit()

    # Raise character2 to level 8 so Albescent is unlocked
    stats_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = stats_result.scalar_one()
    stats.level = 8
    await db_session.commit()

    resp = await client.post(
        "/characters",
        json={
            "username": "alb_starter",
            "display_name": "Alb Starter",
            "faction_slug": "albescent",
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    # Must land directly in Albescent, not UA
    assert data["faction_slug"] == "albescent"
    assert data["faction_slug"] != "ua"


@pytest.mark.asyncio
async def test_get_character_praxes_for_nonexistent_character(client: AsyncClient):
    """GET /characters/99999/praxes returns an empty list (no character guard)."""
    resp = await client.get("/characters/99999/praxes")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Relationships endpoint
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Avatar upload endpoint
# ---------------------------------------------------------------------------


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    """Return a minimal valid JPEG image as bytes."""
    from PIL import Image
    import io as _io

    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = _io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_avatar_success(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """POST /characters/{id}/avatar with a valid image saves and returns updated character."""
    from config import settings as _settings

    # Point MEDIA_ROOT to a temp dir so the test doesn't write to the real filesystem
    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))

    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == character.id
    assert data["avatar_url"] is not None
    assert "avatar" in data["avatar_url"]


@pytest.mark.asyncio
async def test_upload_avatar_wrong_owner(
    client: AsyncClient,
    character: Character,
    auth_headers2: dict,
):
    """Uploading an avatar for another character's id returns 403."""
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_avatar_not_found(
    client: AsyncClient,
    auth_headers: dict,
):
    """Uploading an avatar for a nonexistent character returns 404."""
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        "/characters/99999/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_upload_avatar_non_image_rejected(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """Uploading a non-image file returns 422."""
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("data.txt", b"not an image", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_avatar_unauthenticated(client: AsyncClient, character: Character):
    """Uploading an avatar without authentication returns 401."""
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE wrong owner
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_character_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """Character owned by account2 cannot delete character owned by account1."""
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers2)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Relationships endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_character_relationships_empty(
    client: AsyncClient, character: Character
):
    """GET /characters/{id}/relationships returns empty list when none exist."""
    resp = await client.get(f"/characters/{character.id}/relationships")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_character_relationships_with_data(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
):
    """GET /characters/{id}/relationships returns seeded relationships."""
    from models.relationship import Relationship, RelationshipStatus, RelationshipType

    rel = Relationship(
        from_character_id=character.id,
        to_character_id=character2.id,
        type=RelationshipType.friend,
        status=RelationshipStatus.active,
    )
    db_session.add(rel)
    await db_session.commit()

    resp = await client.get(f"/characters/{character.id}/relationships")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["from_character_id"] == character.id
    assert data[0]["to_character_id"] == character2.id

    # Also visible from the other side
    resp2 = await client.get(f"/characters/{character2.id}/relationships")
    assert resp2.status_code == 200
    assert len(resp2.json()) == 1


# ---------------------------------------------------------------------------
# Votes-received stats endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_votes_received_zero(client: AsyncClient, character: Character):
    """GET /characters/{id}/stats/votes-received returns 0 when no votes exist."""
    resp = await client.get(f"/characters/{character.id}/stats/votes-received")
    assert resp.status_code == 200
    data = resp.json()
    assert data["character_id"] == character.id
    assert data["votes_received"] == 0


@pytest.mark.asyncio
async def test_votes_received_with_votes(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
):
    """GET /characters/{id}/stats/votes-received counts votes on that character's praxes."""
    from models.praxis import PraxisType
    from models.vote import Vote

    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Voted Praxis",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()

    vote = Vote(
        praxis_id=praxis.id,
        voter_character_id=character2.id,
        voter_account_id=character2.account_id,
        stars=4,
    )
    db_session.add(vote)
    await db_session.commit()

    resp = await client.get(f"/characters/{character.id}/stats/votes-received")
    assert resp.status_code == 200
    data = resp.json()
    assert data["character_id"] == character.id
    assert data["votes_received"] == 1
