"""Integration tests for /relationships endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_block import CharacterBlock


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


# The two edge-addressed routes below are the ADR-0009 shape, kept for one
# release while the client moves to /relationships/blocks (#1907). They write
# the ADR-0077 record like everything else — what is asserted here is that they
# still answer, that they no longer touch the edge, and that the guards on the
# path (404, 403) survive the reimplementation.


@pytest.mark.asyncio
async def test_block_by_edge_id_writes_the_record_and_leaves_the_edge_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """A block outranks an active edge; it does not consume one (ADR-0077)."""
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
    assert block_resp.json()["status"] == "active"
    assert block_resp.json()["display_status"] == "One-sided Friend"
    blocks = (await db_session.execute(select(CharacterBlock))).scalars().all()
    assert [(b.blocker_character_id, b.blocked_character_id) for b in blocks] == [
        (character.id, character2.id)
    ]


@pytest.mark.asyncio
async def test_unblock_by_edge_id_deletes_the_record(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
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
    assert (await db_session.execute(select(CharacterBlock))).scalars().all() == []


@pytest.mark.asyncio
async def test_the_target_cannot_lift_the_declarers_block(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """ADR-0009 let either party unblock, because they shared one row. ADR-0077
    gives the record's authorship to the blocker alone — and the target's call
    still answers 200, because a refusal here would name the block."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]
    await client.put(f"/relationships/{relationship_id}", headers=auth_headers)

    unblock_resp = await client.post(
        f"/relationships/{relationship_id}/unblock",
        headers=auth_headers2,
    )

    assert unblock_resp.status_code == 200
    assert len((await db_session.execute(select(CharacterBlock))).scalars().all()) == 1


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


@pytest.mark.asyncio
async def test_a_third_party_cannot_act_on_someone_elses_edge(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
    auth_headers3: dict,
):
    """The 403 guard on the dyad still holds: character3 is not a party to it."""
    create_resp = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = create_resp.json()["id"]

    blocked = await client.put(
        f"/relationships/{relationship_id}", headers=auth_headers3
    )
    unblocked = await client.post(
        f"/relationships/{relationship_id}/unblock", headers=auth_headers3
    )

    assert blocked.status_code == 403
    assert unblocked.status_code == 403


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
