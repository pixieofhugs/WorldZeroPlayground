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
# The retired edge-addressed block shims (#2021)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_edge_addressed_block_doors_are_gone(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """``PUT /relationships/{id}`` and ``POST /relationships/{id}/unblock`` were
    the ADR-0009 shape. #1906 reimplemented them over the new record and #1907
    moved the client off them; they were then held one release so a browser on
    the pre-deploy bundle still had a door, because `main` auto-deploys. That
    window has passed and #2021 closed them — a block is addressed by character
    now, never by edge (ADR-0077), and `/relationships/blocks` is the only door.

    The PUT answers 405 because ``DELETE /relationships/{relationship_id}``
    still occupies that path; the unblock path matches no route at all.
    """
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    blocked = await client.put(
        f"/relationships/{relationship_id}", headers=auth_headers
    )
    unblocked = await client.post(
        f"/relationships/{relationship_id}/unblock", headers=auth_headers
    )

    assert blocked.status_code == 405
    assert unblocked.status_code == 404


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
# The retired "Blocked" display status (ADR-0009, reversed by ADR-0077)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_block_produces_no_label_for_either_party(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """ADR-0009 surfaced "Blocked" on both sides of the pair, and ADR-0077
    reverses it: the blocker reads their own block from /relationships/blocks,
    and the blocked party reads nothing anywhere.

    Mutual Friends is the strongest case for the old label — it is the one the
    block used to overwrite — so it is the one asserted here.
    """
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
    # The raw reverse edge is NOT emitted (#1387). A reverse edge exists here —
    # that is what makes the pair Mutual Friends — so a leftover serializer
    # would put a non-null "friend" in the payload, not a defaulted null.
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
