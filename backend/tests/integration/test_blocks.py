"""The block record: its own row, keyed blocker → blocked (ADR-0077, #1906).

The seam under test is the block **record** — ``/relationships/blocks`` and the
two sites that enforce it (taunt subscriptions, the friends-and-foes feed
sources). Not the friend/foe edge: the whole point of ADR-0077 is that a block
neither needs an edge nor creates one.

Two rulings get a test apiece because they are the ones a plausible
implementation gets wrong silently:

* **you can block a stranger** — the bug #1681 exists for, and
* **the blocked party is told nothing**, from any response they can reach.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_block import CharacterBlock
from models.era import Era
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.task import Task
from models.taunt_message import TauntMessage
from services.character_stats import recalculate_character_stats


async def _declare(
    db_session: AsyncSession,
    declarer: Character,
    target: Character,
    rel_type: RelationshipType,
) -> Relationship:
    edge = Relationship(
        from_character_id=declarer.id,
        to_character_id=target.id,
        type=rel_type,
        status=RelationshipStatus.active,
    )
    db_session.add(edge)
    await db_session.flush()
    return edge


async def _blocks(db_session: AsyncSession) -> list[CharacterBlock]:
    return list(
        (
            await db_session.execute(select(CharacterBlock).order_by(CharacterBlock.id))
        ).scalars().all()
    )


# ---------------------------------------------------------------------------
# The bug: a block needs no edge
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_target_of_a_foe_declaration_can_block_with_no_edge_of_their_own(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """ADR-0077's motivating case. A declared character2 a foe; character2 holds
    no edge at all, and could not reach a block under ADR-0009."""
    await _declare(db_session, character, character2, RelationshipType.foe)

    resp = await client.post(
        "/relationships/blocks",
        json={"character_id": character.id},
        headers=auth_headers2,
    )

    assert resp.status_code == 201
    assert resp.json()["character_id"] == character.id
    blocks = await _blocks(db_session)
    assert [(b.blocker_character_id, b.blocked_character_id) for b in blocks] == [
        (character2.id, character.id)
    ]


@pytest.mark.asyncio
async def test_blocking_a_stranger_creates_no_edge(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """No declaration first, and none invented on the player's behalf."""
    resp = await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )

    assert resp.status_code == 201
    edges = (await db_session.execute(select(Relationship))).scalars().all()
    assert list(edges) == []


@pytest.mark.asyncio
async def test_blocking_twice_is_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """One row per ordered pair; a duplicate is not a conflict worth surfacing."""
    body = {"character_id": character2.id}
    first = await client.post("/relationships/blocks", json=body, headers=auth_headers)
    second = await client.post("/relationships/blocks", json=body, headers=auth_headers)

    assert (first.status_code, second.status_code) == (201, 201)
    assert len(await _blocks(db_session)) == 1


@pytest.mark.asyncio
async def test_self_block_is_refused(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    resp = await client.post(
        "/relationships/blocks",
        json={"character_id": character.id},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_blocking_an_unknown_character_is_404(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    resp = await client.post(
        "/relationships/blocks",
        json={"character_id": 999999},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Silent to the blocked party
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_blocked_party_reads_no_trace_of_the_block(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """ADR-0077 ruling 2. character2 holds a friend edge and gets blocked; every
    response character2 can reach looks exactly as it did before."""
    await _declare(db_session, character2, character, RelationshipType.friend)
    before = (await client.get("/relationships", headers=auth_headers2)).json()

    blocked = await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )
    assert blocked.status_code == 201

    after = await client.get("/relationships", headers=auth_headers2)
    assert after.status_code == 200
    assert after.json() == before
    assert "Blocked" not in {item["display_status"] for item in after.json()}
    # The blocked party's own block list is theirs, not a mirror of the blocker's.
    mine = await client.get("/relationships/blocks", headers=auth_headers2)
    assert mine.status_code == 200
    assert mine.json() == []


@pytest.mark.asyncio
async def test_declaring_across_a_block_succeeds_exactly_as_it_always_did(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A write that failed *only* across a block would announce it precisely."""
    await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )

    resp = await client.post(
        "/relationships",
        json={"to_character_id": character.id, "type": "foe"},
        headers=auth_headers2,
    )

    assert resp.status_code == 201
    assert resp.json()["display_status"] == "One-sided Foe"


@pytest.mark.asyncio
async def test_the_blocker_sees_their_own_block(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Or the record would be unreachable once made."""
    await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )

    resp = await client.get("/relationships/blocks", headers=auth_headers)

    assert resp.status_code == 200
    assert [item["character_id"] for item in resp.json()] == [character2.id]
    assert resp.json()[0]["display_name"] == character2.display_name


# ---------------------------------------------------------------------------
# Unblock
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unblock_deletes_the_record_and_resurrects_nothing(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Ruling 5: unblock deletes the record and stops there — in particular the
    edge the migration deleted does not come back."""
    await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )

    resp = await client.delete(
        f"/relationships/blocks/{character2.id}", headers=auth_headers
    )

    assert resp.status_code == 204
    assert await _blocks(db_session) == []
    edges = (await db_session.execute(select(Relationship))).scalars().all()
    assert list(edges) == []


@pytest.mark.asyncio
async def test_only_the_blocker_may_unblock(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The blocked party lifting their own block is the inverse of the bug —
    and it answers 204 like any other no-op, so it reveals nothing."""
    await client.post(
        "/relationships/blocks",
        json={"character_id": character2.id},
        headers=auth_headers,
    )

    resp = await client.delete(
        f"/relationships/blocks/{character.id}", headers=auth_headers2
    )

    assert resp.status_code == 204
    assert len(await _blocks(db_session)) == 1


# ---------------------------------------------------------------------------
# Enforcement: taunts, both ways, with no edge in existence
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("blocker_is_the_subscriber", [True, False])
async def test_a_block_silences_the_pair_in_both_directions(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
    blocker_is_the_subscriber: bool,
):
    """character3 subscribes to character's taunts by declaring them a foe. A
    block by *either* party silences it, and neither party holds a second edge:
    the block is the only thing that can be doing the silencing."""
    from tests.integration.test_taunts import _seed_scored_praxis, _set_score

    await _declare(db_session, character3, character, RelationshipType.foe)
    blocker, blocked = (
        (character3, character) if blocker_is_the_subscriber else (character, character3)
    )
    db_session.add(
        CharacterBlock(
            blocker_character_id=blocker.id, blocked_character_id=blocked.id
        )
    )
    await db_session.flush()

    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "blocked")
    await recalculate_character_stats(character.id, db_session)

    taunts = (await db_session.execute(select(TauntMessage))).scalars().all()
    assert list(taunts) == []


@pytest.mark.asyncio
async def test_a_blocked_counterpart_leaves_the_feed_sources(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
    active_task: Task,
):
    """A block outranks an active edge without consuming it: the friend edge
    survives, and stops feeding the friends-and-foes sources."""
    from services.activity_feed import _get_related_ids

    await _declare(db_session, character, character2, RelationshipType.friend)
    assert await _get_related_ids(
        character.id, RelationshipType.friend, db_session
    ) == [character2.id]

    db_session.add(
        CharacterBlock(
            blocker_character_id=character2.id, blocked_character_id=character.id
        )
    )
    await db_session.flush()

    assert await _get_related_ids(
        character.id, RelationshipType.friend, db_session
    ) == []
    surviving = (await db_session.execute(select(Relationship))).scalars().all()
    assert len(list(surviving)) == 1
