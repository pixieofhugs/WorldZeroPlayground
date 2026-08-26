"""Integration tests for vote endpoints — praxis model (P.8).

Tests casting votes on solo/collab praxes via POST /praxes/{id}/vote,
anti-self-vote enforcement, vote updates, and the duel vote summary endpoint.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.task import Task
from services.scoring import compute_votes_available
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_cast_vote_on_solo_praxis(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """character2 creates a solo praxis; character votes on it."""
    # character2 creates and submits a praxis
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Vote me"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # character votes
    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 200
    data = vote_resp.json()
    assert data["value"] == 4
    assert data["praxis_id"] == praxis_id
    assert data["voter_character_id"] == character.id


@pytest.mark.asyncio
async def test_cast_vote_self_blocked(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Cannot vote on own praxis — account-level anti-self-vote check."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Own praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 5},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 403


@pytest.mark.asyncio
async def test_collab_co_owner_cannot_vote(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """#515: a collab co-owner who is NOT ``created_by`` still cannot vote on
    the praxis they co-own (ADR-0013). Sanity: an unrelated account still can.
    """
    # character2 (created_by) creates a collab and invites character
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared work"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code == 200
    invite_id = invite_resp.json()["id"]

    respond_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert respond_resp.status_code == 200

    # character is now a co-owner but NOT created_by — must be blocked (403)
    coowner_vote = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 5},
        headers=auth_headers,
    )
    assert coowner_vote.status_code == 403

    # Sanity: an unrelated account (character3) can still vote
    unrelated_vote = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers3,
    )
    assert unrelated_vote.status_code == 200
    assert unrelated_vote.json()["value"] == 4


@pytest.mark.asyncio
async def test_update_vote_is_free(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Updating an existing vote does not deduct additional budget."""
    # character2 creates a praxis
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Update vote test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # Record vote budget before
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    budget_before = compute_votes_available(stats)

    # Initial vote
    resp1 = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert resp1.status_code == 200

    await db_session.refresh(stats)
    budget_after_first = compute_votes_available(stats)
    assert budget_after_first == budget_before - 1

    # Update vote (no additional cost)
    resp2 = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert resp2.status_code == 200
    assert resp2.json()["value"] == 5

    await db_session.refresh(stats)
    assert compute_votes_available(stats) == budget_after_first  # unchanged


# ---------------------------------------------------------------------------
# One vote per praxis per ACCOUNT (#1150) — the alt-character gap.
#
# Before this, uniqueness was (praxis_id, voter_character_id) and the
# existing-vote lookup matched the character, so switching life let one account
# stack several votes onto one praxis. The budget stays per character by owner
# ruling; only the concentrated case is closed.
# ---------------------------------------------------------------------------


async def _add_second_life(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    *,
    username: str,
) -> Character:
    """Seed a second character (with current-era stats) on ``account``."""
    alt = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(alt)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=alt.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(alt)
    return alt


@pytest.mark.asyncio
async def test_alt_life_re_rates_the_accounts_vote_instead_of_adding_one(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Switching life and voting again UPDATES the account's one vote (#1150).

    The regression: two rows, two lots of vote points on one praxis. Now the
    single row's value moves, and its ``voter_character_id`` follows the life
    that set the value that stands.
    """
    from models.vote import Vote

    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Alt vote test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    first = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert first.status_code == 200
    assert first.json()["voter_character_id"] == character.id

    alt = await _add_second_life(db_session, account, era, username="altlife")
    switch = await client.post(
        "/me/active-character", json={"character_id": alt.id}, headers=auth_headers
    )
    assert switch.status_code == 200, switch.text
    assert switch.json()["character"]["id"] == alt.id

    # Same account, different life, same praxis — accepted, but as an update.
    second = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 1}, headers=auth_headers
    )
    assert second.status_code == 200, second.text
    assert second.json()["value"] == 1
    assert second.json()["voter_character_id"] == alt.id
    assert second.json()["id"] == first.json()["id"]  # the same row, re-rated

    rows = (
        (await db_session.execute(select(Vote).where(Vote.praxis_id == praxis_id)))
        .scalars()
        .all()
    )
    assert len(rows) == 1
    assert rows[0].value == 1
    assert rows[0].voter_account_id == account.id


@pytest.mark.asyncio
async def test_alt_re_rating_is_free_and_leaves_both_budgets_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Re-rating across lives spends nothing, and the budget stays per character.

    The owner ruling on #1150 keeps ``votes_spent_this_era`` on
    ``CharacterStats`` per (character, era). So the first life keeps the one
    point it spent and the alt spends none — it updated an existing vote, which
    is free for any life.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Alt budget test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    assert (
        await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers
        )
    ).status_code == 200

    alt = await _add_second_life(db_session, account, era, username="altbudget")
    assert (
        await client.post(
            "/me/active-character", json={"character_id": alt.id}, headers=auth_headers
        )
    ).status_code == 200
    assert (
        await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 2}, headers=auth_headers
        )
    ).status_code == 200

    spent = {
        stats.character_id: stats.votes_spent_this_era
        for stats in (
            await db_session.execute(
                select(CharacterStats).where(
                    CharacterStats.character_id.in_([character.id, alt.id]),
                    CharacterStats.era_id == era.id,
                )
            )
        )
        .scalars()
        .all()
    }
    assert spent[character.id] == 1
    assert spent[alt.id] == 0


@pytest.mark.asyncio
async def test_unique_constraint_rejects_a_second_vote_from_one_account(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction,
    praxis_solo,
    character3: Character,
):
    """``uq_vote_praxis_account`` is the backstop under the service's lookup.

    The lookup in ``cast_or_update_vote`` routes a second rating into an update,
    so this state is unreachable through the API. Asserted directly at the DB so
    the constraint cannot be dropped without a failing test — a raw insert path
    (a script, a future service) still cannot stack two votes on one account.
    """
    from sqlalchemy.exc import IntegrityError

    from models.vote import Vote

    # praxis_solo is authored by ``character``; ``character3`` (its own account)
    # votes on it, then a second life on character3's account tries to add one.
    db_session.add(
        Vote(
            praxis_id=praxis_solo.id,
            voter_character_id=character3.id,
            voter_account_id=character3.account_id,
            value=4,
        )
    )
    await db_session.flush()

    alt = Character(
        account_id=character3.account_id,
        username="constraintalt",
        display_name="Constraint Alt",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(alt)
    await db_session.flush()

    db_session.add(
        Vote(
            praxis_id=praxis_solo.id,
            voter_character_id=alt.id,
            voter_account_id=character3.account_id,
            value=1,
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_invalid_stars_returns_422(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Voting with stars=6 returns 422."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Star test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    resp = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 6}, headers=auth_headers
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_vote_updates_author_stats(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Voting on a praxis triggers score recalculation for the praxis author.

    create_praxis does not recalculate stats; the first vote does.
    After character casts 4 stars on character2's praxis, the recalculated
    score should include task.point_value + 4 stars.
    """
    # character2 creates and submits a praxis (only submitted praxes count toward score)
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Score via vote"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit_resp.status_code == 200

    # character votes 4 — triggers recalculate_character_stats for character2
    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 200

    # After the vote, character2's score should reflect task.point_value + star contribution
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    # Score = task.point_value (10) + 4 stars = 14 (no faction bonus for same faction)
    assert stats.score >= active_task.point_value


# ---------------------------------------------------------------------------
# Duel challenge flow (ADR-0011) — two linked solo praxes
# ---------------------------------------------------------------------------


async def _challenge_from_new_praxis(client, headers, task_id, opponent_id):
    """Sign up solo, then attach a duel to that praxis (ADR-0011 challenge flow).

    Returns ``(challenger_praxis_id, challenge_response)``.
    """
    create = await client.post(
        "/praxes", json={"task_id": task_id, "type": "solo"}, headers=headers
    )
    assert create.status_code == 201
    praxis_id = create.json()["id"]
    resp = await client.post(
        "/duels/challenge",
        json={"challenger_praxis_id": praxis_id, "opponent_character_id": opponent_id},
        headers=headers,
    )
    return praxis_id, resp


@pytest.mark.asyncio
async def test_creating_type_duel_praxis_is_rejected(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """POST /praxes with type=duel is now rejected — use POST /duels/challenge."""
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "duel", "title": "Old flow"},
        headers=auth_headers2,
    )
    assert resp.status_code == 400
    assert "challenge" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_duel_challenge_issue_and_cancel(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """character2 issues a duel challenge to character; character2 then cancels it."""
    from models.character_stats import CharacterStats

    # character2 already has level 5 from fixture — meets duel level gate
    # Issue challenge
    _challenger_praxis_id, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel = challenge_resp.json()
    assert duel["status"] == "pending"
    assert duel["opponent_character_id"] == character.id
    assert duel["task_id"] == active_task.id
    duel_id = duel["id"]

    # Challenger (character2) cancels
    cancel_resp = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers2)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "declined"


@pytest.mark.asyncio
async def test_duel_challenge_accept_creates_opponent_praxis(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Accepting a duel challenge creates the opponent's solo praxis and activates the duel."""
    from models.character_stats import CharacterStats

    # Raise character's level to meet duel gate
    stats_result = await db_session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats = stats_result.scalar_one()
    stats.level = 2
    await db_session.commit()

    # Issue challenge from character2
    _challenger_praxis_id, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel_id = challenge_resp.json()["id"]

    # character accepts
    accept_resp = await client.post(
        f"/duels/{duel_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept_resp.status_code == 200
    duel = accept_resp.json()
    assert duel["status"] == "active"
    assert duel["opponent_praxis_id"] is not None
    # The respond timestamps are DB history, not wire fields (#1387). This is
    # the request that WRITES `accepted_at`, so a leftover serializer would emit
    # a real timestamp here rather than a null; `status` is what clients read.
    assert "accepted_at" not in duel and "declined_at" not in duel


@pytest.mark.asyncio
async def test_duel_challenge_from_praxis_you_do_not_own_is_forbidden(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Attaching a duel to a praxis you don't own → 403."""
    # character owns this praxis; character2 tries to duel with it.
    create = await client.post(
        "/praxes", json={"task_id": active_task.id, "type": "solo"}, headers=auth_headers
    )
    assert create.status_code == 201
    resp = await client.post(
        "/duels/challenge",
        json={
            "challenger_praxis_id": create.json()["id"],
            "opponent_character_id": character.id,
        },
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_duel_challenge_from_submitted_praxis_is_unprocessable(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A duel can only start from an in_progress praxis → submitted gives 422."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "body_text": "done"},
        headers=auth_headers2,
    )
    assert create.status_code == 201
    praxis_id = create.json()["id"]
    submit = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit.status_code == 200
    resp = await client.post(
        "/duels/challenge",
        json={"challenger_praxis_id": praxis_id, "opponent_character_id": character.id},
        headers=auth_headers2,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_duel_challenge_on_already_dueled_praxis_conflicts(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A second challenge on a praxis already linked to a Duel → 409."""
    praxis_id, first = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert first.status_code == 201
    resp = await client.post(
        "/duels/challenge",
        json={"challenger_praxis_id": praxis_id, "opponent_character_id": character.id},
        headers=auth_headers2,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_vote_on_duel_side_praxis(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Voting on a duel side praxis works like any solo praxis (no praxis_member_id)."""
    from models.account import Account as AccountModel
    from models.character import Character as CharacterModel
    from models.character_stats import CharacterStats
    from services.auth import create_jwt

    # Raise character's level to meet duel gate
    stats_result = await db_session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats = stats_result.scalar_one()
    stats.level = 2
    await db_session.commit()

    # Issue and accept the duel
    _challenger_praxis_id, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel_data = challenge_resp.json()
    duel_id = duel_data["id"]
    challenger_praxis_id = duel_data["challenger_praxis_id"]

    accept_resp = await client.post(
        f"/duels/{duel_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept_resp.status_code == 200
    opponent_praxis_id = accept_resp.json()["opponent_praxis_id"]

    # Create an unrelated voter on a third account
    account_c = AccountModel(email="duel_side_voter@example.com")
    db_session.add(account_c)
    await db_session.flush()
    voter_c = CharacterModel(
        account_id=account_c.id,
        username="duel_side_voter_c",
        display_name="Duel Voter C",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(voter_c)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=voter_c.id,
            era_id=era.id,
            score=100,
            all_time_score=100,
            level=3,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    c_headers = {"Authorization": f"Bearer {create_jwt(account_c.id)}"}

    # Vote on each side praxis — no praxis_member_id needed
    vote1 = await client.post(
        f"/praxes/{challenger_praxis_id}/vote",
        json={"value": 4},
        headers=c_headers,
    )
    assert vote1.status_code == 200
    assert vote1.json()["value"] == 4

    vote2 = await client.post(
        f"/praxes/{opponent_praxis_id}/vote",
        json={"value": 3},
        headers=c_headers,
    )
    assert vote2.status_code == 200
    assert vote2.json()["value"] == 3


@pytest.mark.asyncio
async def test_vote_budget_increases_when_score_grows(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    """R.5: Vote budget grows with score since it is computed on-read."""
    from math import floor
    from sqlalchemy import select

    from game_config import CURRENT_ERA

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.score = 0
    stats.votes_spent_this_era = 0
    await db_session.commit()
    await db_session.refresh(stats)

    budget_zero_score = compute_votes_available(stats)
    assert budget_zero_score == CURRENT_ERA.vote_budget_base

    # Raise score to 100 — budget must reflect new formula
    stats.score = 100
    await db_session.commit()
    await db_session.refresh(stats)

    budget_hundred = compute_votes_available(stats)
    expected = CURRENT_ERA.vote_budget_base + floor(
        CURRENT_ERA.vote_budget_multiplier * 100
    )
    assert budget_hundred == expected
    assert budget_hundred > budget_zero_score


@pytest.mark.asyncio
async def test_vote_budget_reflects_votes_spent(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    """R.5: votes_available = base + floor(multiplier * score) - votes_spent_this_era."""
    from math import floor
    from sqlalchemy import select

    from game_config import CURRENT_ERA

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.score = 500
    stats.votes_spent_this_era = 2
    await db_session.commit()
    await db_session.refresh(stats)

    expected = (
        CURRENT_ERA.vote_budget_base
        + floor(CURRENT_ERA.vote_budget_multiplier * 500)
        - 2
    )
    assert compute_votes_available(stats) == expected


# ---------------------------------------------------------------------------
# S.3 SESSION S — anti-self-vote fallback when praxis.created_by is unloaded
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_anti_self_vote_fallback_blocks_when_created_by_unloaded(
    db_session: AsyncSession,
    character: Character,
    praxis_solo,
):
    """S.3: When ``praxis.created_by`` is not selectin-loaded, the service
    falls back to ``session.get(Character, praxis.created_by_id)`` to enforce
    account-level anti-self-vote. The existing route-level tests always hit
    the selectin path via ``get_praxis``; this covers the fallback branch.

    The voter's account owns the praxis, so the service must raise 403 with
    the canonical anti-self-vote detail string even when ``created_by`` is
    None on the passed praxis.
    """
    from fastapi import HTTPException
    from sqlalchemy.orm import noload

    from models.praxis import Praxis
    from services.vote import cast_or_update_vote

    # Evict the fixture-loaded praxis from the identity map so the next
    # select actually runs a SELECT — otherwise noload has no effect.
    db_session.expunge(praxis_solo)

    # Re-fetch with noload on created_by so the relationship is unpopulated.
    # This is the state the fallback branch guards against.
    result = await db_session.execute(
        select(Praxis).options(noload(Praxis.created_by)).where(Praxis.id == praxis_solo.id)
    )
    praxis_unloaded = result.scalar_one()
    assert praxis_unloaded.created_by is None
    assert praxis_unloaded.created_by_id == character.id

    # character's account owns the praxis — the fallback must detect this
    with pytest.raises(HTTPException) as exc_info:
        await cast_or_update_vote(character, praxis_unloaded, 5, db_session)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Cannot vote on your own praxis."


@pytest.mark.asyncio
async def test_anti_self_vote_fallback_allows_unrelated_voter(
    db_session: AsyncSession,
    character2: Character,
    praxis_solo,
):
    """S.3: The fallback must not over-block — an unrelated voter (different
    account) must be able to vote when ``praxis.created_by`` is not loaded.
    """
    from sqlalchemy.orm import noload

    from models.praxis import Praxis
    from services.vote import cast_or_update_vote

    db_session.expunge(praxis_solo)
    result = await db_session.execute(
        select(Praxis).options(noload(Praxis.created_by)).where(Praxis.id == praxis_solo.id)
    )
    praxis_unloaded = result.scalar_one()
    assert praxis_unloaded.created_by is None

    # character2 (different account) casts a vote — must succeed
    cast = await cast_or_update_vote(character2, praxis_unloaded, 3, db_session)
    assert cast.vote.value == 3
    assert cast.vote.voter_character_id == character2.id
    assert cast.vote.praxis_id == praxis_solo.id


# ---------------------------------------------------------------------------
# Duel anti-participation (#309) — a participant cannot rate either side.
# ---------------------------------------------------------------------------


async def _create_and_submit_solo(
    client: AsyncClient, task: Task, headers: dict
) -> int:
    create = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Duel side"},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    submit = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submit.status_code == 200, submit.text
    return praxis_id


@pytest.mark.asyncio
async def test_duel_participant_cannot_vote_on_either_side(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A duel participant (any life on their account) cannot rate either side (403)."""
    from models.duel import Duel, DuelStatus

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    db_session.add(
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=challenger_pid,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_pid,
            status=DuelStatus.settled,
        )
    )
    await db_session.commit()

    # Challenger's account voting on the OPPONENT's side — the gap this fixes.
    on_opponent = await client.post(
        f"/praxes/{opponent_pid}/vote", json={"value": 1}, headers=auth_headers
    )
    assert on_opponent.status_code == 403

    # Opponent's account voting on the CHALLENGER's side — symmetric.
    on_challenger = await client.post(
        f"/praxes/{challenger_pid}/vote", json={"value": 1}, headers=auth_headers2
    )
    assert on_challenger.status_code == 403


@pytest.mark.asyncio
async def test_non_participant_can_vote_on_duel_side(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction,
    auth_headers: dict,
):
    """A third party who isn't in the duel can still rate a duel side (200)."""
    from models.duel import Duel, DuelStatus
    from services.auth import create_jwt

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    db_session.add(
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=challenger_pid,
            opponent_character_id=character2.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.commit()

    # A fresh third account/character — not a participant in the duel.
    third = Account(email="third@example.com")
    db_session.add(third)
    await db_session.flush()
    third_char = Character(
        account_id=third.id,
        username="thirdchar",
        display_name="Third Char",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(third_char)
    await db_session.flush()
    db_session.add(
        CharacterStats(character_id=third_char.id, era_id=era.id, votes_spent_this_era=0)
    )
    await db_session.commit()
    third_headers = {"Authorization": f"Bearer {create_jwt(third.id)}"}

    resp = await client.post(
        f"/praxes/{challenger_pid}/vote", json={"value": 4}, headers=third_headers
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Duel forfeit (#307) — unsubmit / ban → opponent wins by default (ADR-0011)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_forfeit_by_unsubmit_gives_opponent_win_regardless_of_votes(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """Unsubmitting a settled duel side forfeits it: the opponent scores the win
    modifier (not the 1.0x tie), the forfeiter the loss modifier, votes ignored;
    resubmitting does not restore the contest (ADR-0011 §Forfeit)."""
    from game_config import CURRENT_ERA
    from models.duel import Duel, DuelStatus
    from services.praxis import get_praxis, unsubmit_praxis
    from services.praxis_scoring import compute_contributions

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    db_session.add(Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.settled,
    ))
    await db_session.commit()

    win = CURRENT_ERA.factions[character.faction_slug].duel_win_modifier
    loss = CURRENT_ERA.factions[character.faction_slug].duel_loss_modifier

    # No votes cast on either side → without forfeit this is a 1.0x tie for both.
    # character2 forfeits by unsubmitting their side.
    await unsubmit_praxis(opponent_pid, character2.id, db_session)

    challenger_praxis = await get_praxis(challenger_pid, db_session)
    contribs = await compute_contributions(
        [challenger_praxis], character, CURRENT_ERA, db_session
    )
    assert contribs[challenger_pid].duel_multiplier == win

    # Resubmit does not restore: the forfeiter keeps the loss modifier and the
    # opponent keeps the win modifier.
    assert (await client.post(f"/praxes/{opponent_pid}/submit", headers=auth_headers2)).status_code == 200
    opponent_praxis = await get_praxis(opponent_pid, db_session)
    contribs_loser = await compute_contributions(
        [opponent_praxis], character2, CURRENT_ERA, db_session
    )
    assert contribs_loser[opponent_pid].duel_multiplier == loss
    contribs_winner = await compute_contributions(
        [challenger_praxis], character, CURRENT_ERA, db_session
    )
    assert contribs_winner[challenger_pid].duel_multiplier == win


@pytest.mark.asyncio
async def test_self_deletion_forfeits_settled_duels(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """Self-deletion forfeits the departing character's settled duels.

    Named for the path it actually drives: it calls ``soft_delete_character``, i.e.
    ``DELETE /characters/{id}``. It used to be called ``test_ban_forfeits_settled_-
    duels``, which was the exact confusion #1577 was filed about — the *moderator*
    ban route did no such thing until #1577, and this test never touched it. The
    ban leg lives in ``test_ban_and_departure.py``.
    """
    from game_config import CURRENT_ERA
    from models.duel import Duel, DuelStatus
    from services.character import soft_delete_character
    from services.praxis import get_praxis
    from services.praxis_scoring import compute_contributions

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    # Ban character2 (the opponent side).
    await soft_delete_character(character2.id, db_session)
    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled
    assert duel.forfeited_by_character_id == character2.id

    # The challenger (still active) wins by default.
    win = CURRENT_ERA.factions[character.faction_slug].duel_win_modifier
    challenger_praxis = await get_praxis(challenger_pid, db_session)
    contribs = await compute_contributions(
        [challenger_praxis], character, CURRENT_ERA, db_session
    )
    assert contribs[challenger_pid].duel_multiplier == win


# ---------------------------------------------------------------------------
# Read-oriented duel detail (#308) — GET /duels/{id}/detail
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_duel_detail_returns_both_sides_with_tallies(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Settled-duel detail: both sides' display info + live vote points in one call.

    No praxis body is ever included, and the payload carries no
    ``viewer_is_participant`` flag (#1387): it had no client reader, and
    anti-self-voting is enforced server-side at the account level (ADR-0041).
    A participant, a third party and an anonymous reader are all checked, since
    the removed flag differed between exactly those three.
    """
    from models.duel import Duel, DuelStatus
    from services.auth import create_jwt

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    # A non-participant third party votes on the challenger side.
    third = Account(email="duel_detail_voter@example.com")
    db_session.add(third)
    await db_session.flush()
    third_char = Character(
        account_id=third.id,
        username="duel_detail_voter",
        display_name="DD Voter",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(third_char)
    await db_session.flush()
    db_session.add(CharacterStats(
        character_id=third_char.id, era_id=era.id, score=100,
        all_time_score=100, level=3, votes_spent_this_era=0,
    ))
    await db_session.commit()
    third_headers = {"Authorization": f"Bearer {create_jwt(third.id)}"}
    assert (await client.post(
        f"/praxes/{challenger_pid}/vote", json={"value": 4}, headers=third_headers
    )).status_code == 200

    resp = await client.get(f"/duels/{duel.id}/detail", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "settled"
    assert body["forfeited_by_character_id"] is None
    assert "viewer_is_participant" not in body
    assert body["challenger"]["character_id"] == character.id
    assert body["challenger"]["display_name"] == character.display_name
    assert body["challenger"]["is_submitted"] is True
    assert body["challenger"]["points_from_votes"] > 0
    assert body["opponent"]["character_id"] == character2.id
    assert body["opponent"]["points_from_votes"] == 0
    assert "body_text" not in body["challenger"]  # never leak the praxis body

    # Neither a third party nor an anonymous reader gets the flag either.
    assert "viewer_is_participant" not in (await client.get(
        f"/duels/{duel.id}/detail", headers=third_headers
    )).json()
    anon = await client.get(f"/duels/{duel.id}/detail")
    assert anon.status_code == 200
    assert "viewer_is_participant" not in anon.json()


@pytest.mark.asyncio
async def test_either_participant_dissolves_active_duel(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """An active (accepted) duel can be dissolved by either participant → declined;
    both sides revert to plain solo, no penalty (grill 2026-07-01)."""
    from models.character_stats import CharacterStats

    # Raise the opponent (character) to the duel level so they can accept.
    stats = (await db_session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )).scalar_one()
    stats.level = 2
    await db_session.commit()

    _pid, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel = challenge_resp.json()
    duel_id = duel["id"]

    accept = await client.post(
        f"/duels/{duel_id}/respond", json={"accept": True}, headers=auth_headers
    )
    assert accept.status_code == 200
    assert accept.json()["status"] == "active"

    # The OPPONENT (not the challenger) dissolves the active duel.
    dissolve = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers)
    assert dissolve.status_code == 200
    assert dissolve.json()["status"] == "declined"

    # Both sides are now plain solo praxes (the Duel is unlinked).
    from services.duel import get_duel_for_praxis

    assert await get_duel_for_praxis(duel["challenger_praxis_id"], db_session) is None
    assert await get_duel_for_praxis(accept.json()["opponent_praxis_id"], db_session) is None


@pytest.mark.asyncio
async def test_duel_detail_marks_forfeited_side(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """A forfeited duel: winner renders fully, thrown side marked unsubmitted, no body leak."""
    from models.duel import Duel, DuelStatus
    from services.praxis import unsubmit_praxis

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    # character2 forfeits by unsubmitting their side; commit so the API view sees it.
    await unsubmit_praxis(opponent_pid, character2.id, db_session)
    await db_session.commit()

    resp = await client.get(f"/duels/{duel.id}/detail")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "settled"
    assert body["forfeited_by_character_id"] == character2.id
    assert body["challenger"]["is_submitted"] is True
    assert body["opponent"]["is_submitted"] is False
    assert body["opponent"]["display_name"] == character2.display_name
    assert "body_text" not in body["opponent"]


@pytest.mark.asyncio
async def test_duel_detail_serializes_frozen_resolved_outcome(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """A ``resolved`` duel exposes its frozen outcome (ADR-0052).

    The detail view must serialize ``winner_character_id`` +
    ``challenger_final_points`` / ``opponent_final_points`` — the snapshot taken
    at era close — so the rail can render the frozen standing instead of a live
    tally that would otherwise keep moving after resolution.
    """
    from models.duel import Duel, DuelStatus

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.resolved,
        winner_character_id=character.id,
        challenger_final_points=7,
        opponent_final_points=3,
    )
    db_session.add(duel)
    await db_session.commit()

    resp = await client.get(f"/duels/{duel.id}/detail")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "resolved"
    assert body["winner_character_id"] == character.id
    assert body["challenger_final_points"] == 7
    assert body["opponent_final_points"] == 3


@pytest.mark.asyncio
async def test_duel_detail_frozen_fields_null_on_live_duel(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """A live (settled) duel leaves the frozen-outcome fields null — the rail
    keeps rendering the live tally until era close writes the snapshot."""
    from models.duel import Duel, DuelStatus

    challenger_pid = await _create_and_submit_solo(client, active_task, auth_headers)
    opponent_pid = await _create_and_submit_solo(client, active_task, auth_headers2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_pid,
        opponent_character_id=character2.id,
        opponent_praxis_id=opponent_pid,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    body = (await client.get(f"/duels/{duel.id}/detail")).json()
    assert body["winner_character_id"] is None
    assert body["challenger_final_points"] is None
    assert body["opponent_final_points"] is None


# ---------------------------------------------------------------------------
# The vote write boundary (#1382) — the POST response is the client's SOLE
# source of post-cast truth. Before this, it returned a bare VoteOut and the
# client faked the new tally in a client-side overlay store.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_vote_post_returns_the_tally_it_computed(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The cast response carries the tally, and it EQUALS ``tally_votes`` for
    that praxis alone — the number the client used to reconstruct by arithmetic.
    """
    from services.vote_tally import tally_votes

    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    body = (
        await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers
        )
    ).json()

    truth = (await tally_votes([praxis_id], db_session))[praxis_id]
    assert truth.points_from_votes == 4
    assert truth.voter_count == 1
    assert body["tally"] == {
        "points_from_votes": truth.points_from_votes,
        "voter_count": truth.voter_count,
    }


@pytest.mark.asyncio
async def test_vote_post_tally_tracks_a_re_rate(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Re-rating moves the points and NOT the voter count — the case the
    overlay store's `prior` bookkeeping existed to get right (#626)."""
    from services.vote_tally import tally_votes

    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    await client.post(f"/praxes/{praxis_id}/vote", json={"value": 2}, headers=auth_headers)
    body = (
        await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
        )
    ).json()

    truth = (await tally_votes([praxis_id], db_session))[praxis_id]
    assert body["tally"] == {
        "points_from_votes": truth.points_from_votes,
        "voter_count": truth.voter_count,
    }
    assert body["tally"] == {"points_from_votes": 5, "voter_count": 1}


@pytest.mark.asyncio
async def test_vote_post_returns_viewer_vote_and_stats(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """``viewer_vote`` is the star that now stands, and ``viewer_stats`` carries
    the budget the client would otherwise refetch ``/auth/me`` for."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    before = (await client.get("/auth/me", headers=auth_headers)).json()
    # The budget is no longer on CharacterOut (#1387), so the pre-cast value
    # comes from the same on-read computation the route uses (ADR-0043).
    voter_stats = (await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )).scalar_one()
    budget_before = compute_votes_available(voter_stats)

    body = (
        await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
        )
    ).json()

    assert body["viewer_vote"] == 3
    assert body["viewer_stats"]["votes_available"] == budget_before - 1
    # The voter's OWN score/level cannot move by casting: a vote recalculates the
    # praxis MEMBERS and anti-self-vote guarantees the voter is never one.
    assert body["viewer_stats"]["score"] == before["character"]["score"]
    assert body["viewer_stats"]["level"] == before["character"]["level"]


@pytest.mark.asyncio
async def test_vote_summary_route_is_gone(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """``GET /praxes/{id}/votes`` is retired — PraxisOut already carries
    ``points_from_votes`` / ``voter_count`` (#1382)."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)
    assert (await client.get(f"/praxes/{praxis_id}/votes")).status_code == 404


@pytest.mark.asyncio
async def test_praxis_out_carries_viewer_vote(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The detail payload knows the viewer's own cast, so the client stops
    recovering it from the voters list via a seeded overlay (#1382)."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    unvoted = (await client.get(f"/praxes/{praxis_id}", headers=auth_headers)).json()
    assert unvoted["viewer_vote"] is None

    await client.post(f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers)

    voted = (await client.get(f"/praxes/{praxis_id}", headers=auth_headers)).json()
    assert voted["viewer_vote"] == 5
    # The author sees no star of their own, and neither does an anonymous reader.
    assert (await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)).json()["viewer_vote"] is None
    assert (await client.get(f"/praxes/{praxis_id}")).json()["viewer_vote"] is None
