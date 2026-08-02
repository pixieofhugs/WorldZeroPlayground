"""Integration tests for /relationships endpoints."""
import pytest
from httpx import AsyncClient

from models.character import Character


# ---------------------------------------------------------------------------
# Create relationship
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_friend_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """character can declare character2 as a friend."""
    resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["from_character_id"] == character.id
    assert data["to_character_id"] == character2.id
    assert data["type"] == "friend"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_foe_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """character can declare character2 as a foe."""
    resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "foe"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["type"] == "foe"


@pytest.mark.asyncio
async def test_create_relationship_unauthenticated(
    client: AsyncClient,
    character2: Character,
):
    """Unauthenticated requests return 401."""
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
    """Creating the same relationship twice returns a 409 conflict."""
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


# ---------------------------------------------------------------------------
# List relationships
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_relationships_empty(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """A new character has no relationships."""
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
    """Created relationship appears in the list."""
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
    """GET /relationships without auth returns 401."""
    resp = await client.get("/relationships")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Block relationship
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_block_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """A relationship can be blocked."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    block_resp = await client.put(
        f"/relationships/{relationship_id}",
        headers=auth_headers,
    )
    assert block_resp.status_code == 200
    assert block_resp.json()["status"] == "blocked"


@pytest.mark.asyncio
async def test_unblock_relationship_restores_active(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Unblock reverses a block (ADR-0009): the edge returns to active and its
    display status re-derives from the type."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]
    await client.put(f"/relationships/{relationship_id}", headers=auth_headers)

    unblock_resp = await client.post(
        f"/relationships/{relationship_id}/unblock",
        headers=auth_headers,
    )
    assert unblock_resp.status_code == 200
    assert unblock_resp.json()["status"] == "active"

    # Display status reverts from "Blocked" to the type-derived label.
    list_resp = await client.get("/relationships", headers=auth_headers)
    item = next(r for r in list_resp.json() if r["id"] == relationship_id)
    assert item["display_status"] != "Blocked"


@pytest.mark.asyncio
async def test_unblock_relationship_by_target(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Either party can unblock — the target (who did not declare the edge) may
    reverse a block too, symmetric with block."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]
    await client.put(f"/relationships/{relationship_id}", headers=auth_headers)

    # character2 is the target, not the declarer — they can still unblock.
    unblock_resp = await client.post(
        f"/relationships/{relationship_id}/unblock",
        headers=auth_headers2,
    )
    assert unblock_resp.status_code == 200
    assert unblock_resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_unblock_relationship_non_party_forbidden(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """A non-existent relationship returns 404 (no edge to unblock)."""
    resp = await client.post(
        "/relationships/999999/unblock",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete relationship
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_relationship(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """The declaring character can delete their own relationship."""
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


@pytest.mark.asyncio
async def test_delete_relationship_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Only the declaring party can delete the relationship; others get 403."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    # character2 tries to delete character's relationship declaration
    del_resp = await client.delete(
        f"/relationships/{relationship_id}", headers=auth_headers2
    )
    assert del_resp.status_code == 403


# ---------------------------------------------------------------------------
# Blocked display status (ADR-0009)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_display_status_blocked_outgoing(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """An outgoing edge with status=blocked reports display_status='Blocked'."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "foe"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    await client.put(f"/relationships/{relationship_id}", headers=auth_headers)

    list_resp = await client.get("/relationships", headers=auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    match = next(r for r in items if r["to_character_id"] == character2.id)
    assert match["display_status"] == "Blocked"


@pytest.mark.asyncio
async def test_display_status_blocked_incoming(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A blocked incoming edge overrides the outgoing type label to 'Blocked'."""
    # character declares character2 a friend
    await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    # character2 declares character a friend — now Mutual Friends
    create_resp2 = await client.post(
        "/relationships",
        json={"to_character_id": character.id, "type": "friend"},
        headers=auth_headers2,
    )
    # character2 blocks their own outgoing edge
    rel2_id = create_resp2.json()["id"]
    await client.put(f"/relationships/{rel2_id}", headers=auth_headers2)

    # character's list should now show Blocked (incoming edge is blocked)
    list_resp = await client.get("/relationships", headers=auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    match = next(r for r in items if r["to_character_id"] == character2.id)
    assert match["display_status"] == "Blocked"


@pytest.mark.asyncio
async def test_display_status_blocked_overrides_mutual_friends(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Blocked status overrides a Mutual Friends label for both parties."""
    # Establish Mutual Friends
    await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    create_resp2 = await client.post(
        "/relationships",
        json={"to_character_id": character.id, "type": "friend"},
        headers=auth_headers2,
    )

    # Verify Mutual Friends before block
    pre_block = await client.get("/relationships", headers=auth_headers)
    pre_items = pre_block.json()
    mutual = next(r for r in pre_items if r["to_character_id"] == character2.id)
    assert mutual["display_status"] == "Mutual Friends"
    # The raw reverse edge is NOT emitted (#1387). A reverse edge exists here —
    # that is what makes the pair Mutual Friends — so a leftover serializer
    # would put a non-null "friend" in the payload, not a defaulted null.
    assert "reverse_type" not in mutual

    # character2 blocks their own outgoing edge → both should see Blocked
    rel2_id = create_resp2.json()["id"]
    await client.put(f"/relationships/{rel2_id}", headers=auth_headers2)

    # character sees Blocked
    list_char = await client.get("/relationships", headers=auth_headers)
    match_char = next(r for r in list_char.json() if r["to_character_id"] == character2.id)
    assert match_char["display_status"] == "Blocked"

    # character2 sees Blocked (their own outgoing is blocked)
    list_char2 = await client.get("/relationships", headers=auth_headers2)
    match_char2 = next(r for r in list_char2.json() if r["to_character_id"] == character.id)
    assert match_char2["display_status"] == "Blocked"
