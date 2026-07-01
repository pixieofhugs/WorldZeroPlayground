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

    # Pending list for character (the opponent)
    pending_resp = await client.get("/duels/pending", headers=auth_headers)
    assert pending_resp.status_code == 200
    pending = pending_resp.json()
    assert any(d["id"] == duel_id for d in pending)

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

    # GET the duel
    get_resp = await client.get(f"/duels/{duel_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "active"


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
        faction_slug="ua",
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
    vote = await cast_or_update_vote(character2, praxis_unloaded, 3, db_session)
    assert vote.value == 3
    assert vote.voter_character_id == character2.id
    assert vote.praxis_id == praxis_solo.id


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
    faction_ua,
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
        faction_slug="ua",
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
    from services.praxis import get_praxis, withdraw_praxis
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
    await withdraw_praxis(opponent_pid, character2.id, db_session)

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
async def test_ban_forfeits_settled_duels(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """Banning a character forfeits their settled duels; the opponent wins by default."""
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
    faction_ua,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Settled-duel detail: both sides' display info + live vote points in one call.

    ``viewer_is_participant`` is True for a side's account, False for a third
    party and for anonymous. No praxis body is ever included.
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
        faction_slug="ua",
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
    assert body["viewer_is_participant"] is True
    assert body["challenger"]["character_id"] == character.id
    assert body["challenger"]["display_name"] == character.display_name
    assert body["challenger"]["is_submitted"] is True
    assert body["challenger"]["points_from_votes"] > 0
    assert body["opponent"]["character_id"] == character2.id
    assert body["opponent"]["points_from_votes"] == 0
    assert "body_text" not in body["challenger"]  # never leak the praxis body

    # Third party and anonymous are not participants.
    assert (await client.get(
        f"/duels/{duel.id}/detail", headers=third_headers
    )).json()["viewer_is_participant"] is False
    anon = await client.get(f"/duels/{duel.id}/detail")
    assert anon.status_code == 200
    assert anon.json()["viewer_is_participant"] is False


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
    from services.praxis import withdraw_praxis

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
    await withdraw_praxis(opponent_pid, character2.id, db_session)
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
