"""#2216 — an outstanding collab invitation counts as ownership for the VOTE GATE.

An invited-but-not-yet-accepted character has no ``PraxisMember`` row, so
``services.vote._voter_account_owns_praxis`` — which builds its blocklist from
``praxis.members``, current members only (ADR-0013) — never saw them, and they
could rate a praxis they were one click from co-owning.

The reachable shape, and why the bug is not academic: sealing a collab does NOT
rescind its pending invites (only the collab→solo conversion does, in
``services.collab_consensus``). So a praxis can be Live and public — votable by
anyone — while an invitation to co-own it is still outstanding.

The ruling is narrow: a pending invite blocks the vote and nothing else. It is
not membership, it earns no points, it puts nobody on the roster.

Two halves, and the second is why the gate alone is not enough:
  1. A pending invitee cannot cast, and the UI predicate agrees (detail + card).
  2. A vote cast BEFORE the invitation arrived is deleted and re-tallied at the
     moment they accept — otherwise it is grandfathered into exactly the state
     the gate exists to prevent. The accept itself is never blocked: the
     invitee could not have known the rule when they voted.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.task import Task
from models.vote import Vote


async def _open_collab(
    client: AsyncClient, active_task: Task, owner_headers: dict
) -> int:
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared"},
        headers=owner_headers,
    )
    assert create.status_code == 201, create.text
    return create.json()["id"]


async def _invite(
    client: AsyncClient, praxis_id: int, invitee: Character, owner_headers: dict
) -> int:
    resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": invitee.id},
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


async def _seal(client: AsyncClient, praxis_id: int, owner_headers: dict) -> None:
    """The sole member proposes, which is unanimity, so the praxis goes Live."""
    resp = await client.post(f"/praxes/{praxis_id}/submit", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "submitted", resp.text


async def _respond(
    client: AsyncClient,
    praxis_id: int,
    invite_id: int,
    accept: bool,
    invitee_headers: dict,
) -> None:
    resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": accept},
        headers=invitee_headers,
    )
    assert resp.status_code == 200, resp.text


async def _card_for(client: AsyncClient, task_id: int, praxis_id: int, headers: dict):
    resp = await client.get(f"/praxes?task_id={task_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    cards = [c for c in resp.json() if c["id"] == praxis_id]
    assert cards, f"praxis {praxis_id} not in feed"
    return cards[0]


# ---------------------------------------------------------------------------
# 1. The gate.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pending_invitee_cannot_vote(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Invited, not yet accepted → 403 on cast, and the module is hidden."""
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _invite(client, praxis_id, character, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["viewer_can_vote"] is False

    # The page-wide precompute has to agree with the per-praxis predicate, or the
    # feed offers a control the cast will refuse.
    card = await _card_for(client, active_task.id, praxis_id, auth_headers)
    assert card["viewer_can_vote"] is False

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert vote.status_code == 403, vote.text


@pytest.mark.asyncio
async def test_pending_invite_blocks_the_whole_account(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The invite reaches one life; the gate closes on the ACCOUNT (ADR-0041).

    Every other rule in this module is account-level — an alt cannot vote on a
    sibling's praxis, nor rate a duel a sibling is in — so an alt rating the
    collab the account is one click from co-owning is the same hole.
    """
    alt = Character(
        account_id=character.account_id,
        username="testalt",
        display_name="Test Alt",
        faction_slug=character.faction_slug,
    )
    db_session.add(alt)
    await db_session.commit()
    await db_session.refresh(alt)

    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _invite(client, praxis_id, alt, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["viewer_can_vote"] is False

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert vote.status_code == 403, vote.text


@pytest.mark.asyncio
async def test_declined_invite_does_not_block(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Only a PENDING invite is ownership. Declining hands the vote back."""
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    invite_id = await _invite(client, praxis_id, character, auth_headers2)
    await _respond(client, praxis_id, invite_id, False, auth_headers)
    await _seal(client, praxis_id, auth_headers2)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.json()["viewer_can_vote"] is True

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers
    )
    assert vote.status_code == 200, vote.text


@pytest.mark.asyncio
async def test_uninvited_third_party_still_votes(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """The gate is scoped to the invited account — nobody else loses the vote."""
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _invite(client, praxis_id, character, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers3)
    assert detail.json()["viewer_can_vote"] is True

    card = await _card_for(client, active_task.id, praxis_id, auth_headers3)
    assert card["viewer_can_vote"] is True

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 2}, headers=auth_headers3
    )
    assert vote.status_code == 200, vote.text


# ---------------------------------------------------------------------------
# 2. The vote already cast — deleted and re-tallied on accept.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_vote_cast_before_the_invite_is_voided_on_accept(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Vote first, get invited second, accept → the vote is gone and re-tallied.

    A third party's vote on the same praxis is untouched: only the joiner's own
    row is voided, and the tally that remains is the honest one.

    The reopen in the middle is not decoration — ``respond_to_invite`` refuses a
    submitted praxis, so this is the shape in which an already-cast vote can meet
    an accept at all.
    """
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    # Both outsiders rate it while no invitation exists.
    for headers in (auth_headers, auth_headers3):
        cast = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=headers
        )
        assert cast.status_code == 200, cast.text

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.json()["voter_count"] == 2

    reopen = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert reopen.status_code == 200, reopen.text
    invite_id = await _invite(client, praxis_id, character, auth_headers2)

    # The accept is NEVER blocked — the invitee could not have known the rule.
    await _respond(client, praxis_id, invite_id, True, auth_headers)

    rows = (
        (await db_session.execute(select(Vote).where(Vote.praxis_id == praxis_id)))
        .scalars()
        .all()
    )
    assert [row.voter_account_id for row in rows] == [character3.account_id]

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.json()["voter_count"] == 1


@pytest.mark.asyncio
async def test_declining_keeps_the_vote(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A decline is not a join, so the vote it never conflicted with stands."""
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    cast = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert cast.status_code == 200, cast.text

    reopen = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert reopen.status_code == 200, reopen.text
    invite_id = await _invite(client, praxis_id, character, auth_headers2)
    await _respond(client, praxis_id, invite_id, False, auth_headers)

    rows = (
        (await db_session.execute(select(Vote).where(Vote.praxis_id == praxis_id)))
        .scalars()
        .all()
    )
    assert [row.voter_account_id for row in rows] == [character.account_id]


@pytest.mark.asyncio
async def test_voiding_a_vote_hands_the_budget_back(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """``votes_spent_this_era`` follows the row out.

    ``services.character_stats.recompute_votes_spent_this_era`` rests on the
    identity *counter == that character's vote rows inside the era window*, and
    says in as many words that nothing in the application deletes a vote. A void
    that left the counter charged would break that identity, and the operator
    repair would silently hand the vote back later anyway.
    """
    praxis_id = await _open_collab(client, active_task, auth_headers2)
    await _seal(client, praxis_id, auth_headers2)

    cast = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert cast.status_code == 200, cast.text

    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    await db_session.refresh(stats)
    assert stats.votes_spent_this_era == 1

    reopen = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2)
    assert reopen.status_code == 200, reopen.text
    invite_id = await _invite(client, praxis_id, character, auth_headers2)
    await _respond(client, praxis_id, invite_id, True, auth_headers)

    await db_session.refresh(stats)
    assert stats.votes_spent_this_era == 0
