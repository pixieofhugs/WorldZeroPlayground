"""Integration tests for /messages endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character


# ---------------------------------------------------------------------------
# Send message
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_message(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """character can send a message to character2."""
    resp = await client.post(
        "/messages",
        json={"to_character_id": character2.id, "body": "Hello there!"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["body"] == "Hello there!"
    assert data["from_character_id"] == character.id
    assert data["to_character_id"] == character2.id
    assert data["read_at"] is None


@pytest.mark.asyncio
async def test_send_message_to_self_rejected(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """Sending a message to yourself returns 422."""
    resp = await client.post(
        "/messages",
        json={"to_character_id": character.id, "body": "Talking to myself"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_send_message_unauthenticated(
    client: AsyncClient,
    character2: Character,
):
    """Unauthenticated send returns 401."""
    resp = await client.post(
        "/messages",
        json={"to_character_id": character2.id, "body": "Anonymous"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Inbox
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_messages_empty(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """A character with no messages gets an empty inbox."""
    resp = await client.get("/messages", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_messages_includes_sent_and_received(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /messages returns both sent and received messages for the character."""
    # character sends to character2
    await client.post(
        "/messages",
        json={"to_character_id": character2.id, "body": "Sent message"},
        headers=auth_headers,
    )
    # character2 sends to character
    await client.post(
        "/messages",
        json={"to_character_id": character.id, "body": "Received message"},
        headers=auth_headers2,
    )

    # character's inbox should contain both
    resp = await client.get("/messages", headers=auth_headers)
    assert resp.status_code == 200
    bodies = [m["body"] for m in resp.json()]
    assert "Sent message" in bodies
    assert "Received message" in bodies


@pytest.mark.asyncio
async def test_list_messages_unauthenticated(client: AsyncClient):
    """GET /messages without auth returns 401."""
    resp = await client.get("/messages")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Read message
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_read_message_marks_as_read(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Reading a received message marks it read_at for the recipient."""
    # character sends to character2
    send_resp = await client.post(
        "/messages",
        json={"to_character_id": character2.id, "body": "Read me"},
        headers=auth_headers,
    )
    msg_id = send_resp.json()["id"]

    # character2 reads it
    read_resp = await client.get(f"/messages/{msg_id}", headers=auth_headers2)
    assert read_resp.status_code == 200
    assert read_resp.json()["read_at"] is not None


@pytest.mark.asyncio
async def test_read_message_not_party(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """A third party cannot read someone else's message."""
    from models.account import Account
    from models.character_stats import CharacterStats
    from models.era import Era
    from sqlalchemy import select

    # Create a third account and character
    acc3 = Account(email="third@example.com")
    db_session.add(acc3)
    await db_session.flush()

    result = await db_session.execute(select(Era))
    era_row = result.scalars().first()

    from models.faction import Faction as FactionModel
    result2 = await db_session.execute(
        select(FactionModel).where(FactionModel.slug == "ua")
    )
    faction = result2.scalar_one()

    from models.character import Character as CharacterModel
    ch3 = CharacterModel(
        account_id=acc3.id,
        username="thirdchar",
        display_name="Third Character",
        faction_slug="ua",
    )
    db_session.add(ch3)
    await db_session.flush()

    stats3 = CharacterStats(
        character_id=ch3.id,
        era_id=era_row.id,
        score=0,
        all_time_score=0,
        level=0,
        votes_spent_this_era=0,
    )
    db_session.add(stats3)
    await db_session.commit()

    from services.auth import create_jwt
    token3 = create_jwt(acc3.id)
    headers3 = {"Authorization": f"Bearer {token3}"}

    # character sends to character2
    send_resp = await client.post(
        "/messages",
        json={"to_character_id": character2.id, "body": "Private message"},
        headers=auth_headers,
    )
    msg_id = send_resp.json()["id"]

    # ch3 tries to read it — should get 403
    read_resp = await client.get(f"/messages/{msg_id}", headers=headers3)
    assert read_resp.status_code == 403


@pytest.mark.asyncio
async def test_read_message_not_found(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """Reading a nonexistent message returns 404."""
    resp = await client.get("/messages/99999", headers=auth_headers)
    assert resp.status_code == 404
