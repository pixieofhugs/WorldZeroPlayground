"""Integration tests for /relationships endpoints."""
import pytest
from httpx import AsyncClient

from models.character import Character


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["friend", "foe"])
async def test_create_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    kind: str,
):
    resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": kind},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["from_character_id"] == character.id
    assert data["to_character_id"] == character2.id
    assert data["type"] == kind
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_relationship_unauthenticated(
    client: AsyncClient,
    character2: Character,
):
    resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_duplicate_relationship_rejected(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_relationships_empty(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    resp = await client.get("/relationships", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_relationships_includes_created(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )

    resp = await client.get("/relationships", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    target_ids = [r["to_character_id"] for r in data]
    assert character2.id in target_ids


@pytest.mark.asyncio
async def test_list_relationships_unauthenticated(client: AsyncClient):
    resp = await client.get("/relationships")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "foe"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/relationships/{relationship_id}", headers=auth_headers
    )
    assert del_resp.status_code == 204
    remaining = await client.get("/relationships", headers=auth_headers)
    assert relationship_id not in [r["id"] for r in remaining.json()]


@pytest.mark.asyncio
async def test_delete_relationship_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/relationships/{relationship_id}", headers=auth_headers2
    )
    assert del_resp.status_code == 403


@pytest.mark.asyncio
async def test_a_block_produces_no_label_for_either_party(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """ADR-0077: no "Blocked" label either side; the blocker reads
    /relationships/blocks."""
    await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    await client.post(
        "/relationships",
        json={"to_character_id": character.id, "type": "friend"},
        headers=auth_headers2,
    )

    pre_block = await client.get("/relationships", headers=auth_headers)
    mutual = next(r for r in pre_block.json() if r["to_character_id"] == character2.id)
    assert mutual["display_status"] == "Mutual Friends"
    # Raw reverse edge not emitted (#1387); one exists here, so a leak shows.
    assert "reverse_type" not in mutual

    blocked = await client.post(
        "/relationships/blocks",
        json={"character_id": character.id},
        headers=auth_headers2,
    )
    assert blocked.status_code == 201

    for headers, counterpart in (
        (auth_headers, character2.id),
        (auth_headers2, character.id),
    ):
        listing = await client.get("/relationships", headers=headers)
        match = next(
            r for r in listing.json() if r["to_character_id"] == counterpart
        )
        assert match["display_status"] == "Mutual Friends"
        assert match["status"] == "active"
