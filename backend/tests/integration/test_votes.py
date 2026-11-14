"""Integration tests for praxis votes and duels."""

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
from tests.integration.conftest import CURRENT_ERA_VOTE_LEVEL as VOTER_PEAK_LEVEL
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
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Vote me"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

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
    """#515: a co-owner who is not ``created_by`` still can't vote (ADR-0013)."""
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

    coowner_vote = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 5},
        headers=auth_headers,
    )
    assert coowner_vote.status_code == 403

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
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Update vote test"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    budget_before = compute_votes_available(stats)

    resp1 = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert resp1.status_code == 200

    await db_session.refresh(stats)
    budget_after_first = compute_votes_available(stats)
    assert budget_after_first == budget_before - 1

    resp2 = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert resp2.status_code == 200
    assert resp2.json()["value"] == 5

    await db_session.refresh(stats)
    assert compute_votes_available(stats) == budget_after_first


# One vote per praxis per ACCOUNT (#1150); the budget stays per character.


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
        peak_level=VOTER_PEAK_LEVEL,
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
    """``voter_character_id`` follows the life that set the standing value."""
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

    second = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 1}, headers=auth_headers
    )
    assert second.status_code == 200, second.text
    assert second.json()["value"] == 1
    assert second.json()["voter_character_id"] == alt.id
    assert second.json()["id"] == first.json()["id"]

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
    """The first life keeps the point it spent; the alt's update is free (#1150)."""
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
    """``uq_vote_praxis_account`` backstops raw inserts the API can't reach."""
    from sqlalchemy.exc import IntegrityError

    from models.vote import Vote

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
        peak_level=VOTER_PEAK_LEVEL,
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
    """create_praxis does not recalculate stats; the first vote does."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Score via vote"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit_resp.status_code == 200

    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers,
    )
    assert vote_resp.status_code == 200

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character2.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    await db_session.refresh(stats)
    assert stats.score == active_task.point_value + 4


# Duel challenge flow (ADR-0011)


async def _challenge_from_new_praxis(client, headers, task_id, opponent_id):
    """Returns ``(challenger_praxis_id, challenge_response)``."""
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
    _challenger_praxis_id, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel = challenge_resp.json()
    assert duel["status"] == "pending"
    assert duel["opponent_character_id"] == character.id
    assert duel["task_id"] == active_task.id
    duel_id = duel["id"]

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
    from models.character_stats import CharacterStats

    # duel level gate
    stats_result = await db_session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats = stats_result.scalar_one()
    stats.level = 2
    await db_session.commit()

    _challenger_praxis_id, challenge_resp = await _challenge_from_new_praxis(
        client, auth_headers2, active_task.id, character.id
    )
    assert challenge_resp.status_code == 201
    duel_id = challenge_resp.json()["id"]

    accept_resp = await client.post(
        f"/duels/{duel_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept_resp.status_code == 200
    duel = accept_resp.json()
    assert duel["status"] == "active"
    assert duel["opponent_praxis_id"] is not None
    # Respond timestamps are DB-only (#1387); this request writes `accepted_at`.
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
    from models.account import Account as AccountModel
    from models.character import Character as CharacterModel
    from models.character_stats import CharacterStats
    from services.auth import create_jwt

    stats_result = await db_session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats = stats_result.scalar_one()
    stats.level = 2
    await db_session.commit()

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

    account_c = AccountModel(email="duel_side_voter@example.com")
    db_session.add(account_c)
    await db_session.flush()
    voter_c = CharacterModel(
        account_id=account_c.id,
        username="duel_side_voter_c",
        display_name="Duel Voter C",
        faction_slug=DEFAULT_FACTION_SLUG,
        peak_level=VOTER_PEAK_LEVEL,
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
    """R.5: the budget is computed on read."""
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


# S.3: anti-self-vote fallback when praxis.created_by is unloaded


@pytest.mark.asyncio
async def test_anti_self_vote_fallback_blocks_when_created_by_unloaded(
    db_session: AsyncSession,
    character: Character,
    praxis_solo,
):
    """Route tests always hit the selectin path; this covers the
    ``session.get(Character, praxis.created_by_id)`` fallback."""
    from fastapi import HTTPException
    from sqlalchemy.orm import noload

    from models.praxis import Praxis
    from services.vote import cast_or_update_vote

    # Evict from the identity map, or noload has no effect.
    db_session.expunge(praxis_solo)

    result = await db_session.execute(
        select(Praxis).options(noload(Praxis.created_by)).where(Praxis.id == praxis_solo.id)
    )
    praxis_unloaded = result.scalar_one()
    assert praxis_unloaded.created_by is None
    assert praxis_unloaded.created_by_id == character.id

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
    """S.3: the fallback must not over-block."""
    from sqlalchemy.orm import noload

    from models.praxis import Praxis
    from services.vote import cast_or_update_vote

    db_session.expunge(praxis_solo)
    result = await db_session.execute(
        select(Praxis).options(noload(Praxis.created_by)).where(Praxis.id == praxis_solo.id)
    )
    praxis_unloaded = result.scalar_one()
    assert praxis_unloaded.created_by is None

    cast = await cast_or_update_vote(character2, praxis_unloaded, 3, db_session)
    assert cast.vote.value == 3
    assert cast.vote.voter_character_id == character2.id
    assert cast.vote.praxis_id == praxis_solo.id


# Duel anti-participation (#309)


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
    """Any life on a participant's account is blocked on both sides."""
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

    on_opponent = await client.post(
        f"/praxes/{opponent_pid}/vote", json={"value": 1}, headers=auth_headers
    )
    assert on_opponent.status_code == 403

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

    third = Account(email="third@example.com")
    db_session.add(third)
    await db_session.flush()
    third_char = Character(
        account_id=third.id,
        username="thirdchar",
        display_name="Third Char",
        faction_slug=DEFAULT_FACTION_SLUG,
        peak_level=VOTER_PEAK_LEVEL,
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


# Duel forfeit (#307, ADR-0011)


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
    """Votes ignored; resubmitting does not restore the contest (ADR-0011)."""
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

    # No votes: without the forfeit this would be a 1.0x tie.
    await unsubmit_praxis(opponent_pid, character2.id, db_session)

    challenger_praxis = await get_praxis(challenger_pid, db_session)
    contribs = await compute_contributions(
        [challenger_praxis], character, CURRENT_ERA, db_session
    )
    assert contribs[challenger_pid].duel_multiplier == win

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
    """``DELETE /characters/{id}`` path; the ban leg is in test_ban_and_departure.py."""
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

    await soft_delete_character(character2.id, db_session)
    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled
    assert duel.forfeited_by_character_id == character2.id

    win = CURRENT_ERA.factions[character.faction_slug].duel_win_modifier
    challenger_praxis = await get_praxis(challenger_pid, db_session)
    contribs = await compute_contributions(
        [challenger_praxis], character, CURRENT_ERA, db_session
    )
    assert contribs[challenger_pid].duel_multiplier == win


# GET /duels/{id}/detail (#308)


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
    """No praxis body, and no ``viewer_is_participant`` for any viewer (#1387)."""
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

    third = Account(email="duel_detail_voter@example.com")
    db_session.add(third)
    await db_session.flush()
    third_char = Character(
        account_id=third.id,
        username="duel_detail_voter",
        display_name="DD Voter",
        faction_slug=DEFAULT_FACTION_SLUG,
        peak_level=VOTER_PEAK_LEVEL,
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
    assert "body_text" not in body["challenger"]

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
    """Both sides revert to plain solo, no penalty."""
    from models.character_stats import CharacterStats

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

    # the opponent, not the challenger
    dissolve = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers)
    assert dissolve.status_code == 200
    assert dissolve.json()["status"] == "declined"

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

    # commit so the API view sees it
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
    """A ``resolved`` duel exposes its era-close snapshot (ADR-0052)."""
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
    """Frozen fields stay null until era close writes the snapshot."""
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


# The vote POST response is the client's sole post-cast truth (#1382).


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
    """The cast response's tally equals ``tally_votes`` for that praxis."""
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
    """Re-rating moves the points, not the voter count (#626)."""
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
    """``viewer_stats`` spares the client a ``/auth/me`` refetch."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    before = (await client.get("/auth/me", headers=auth_headers)).json()
    # budget is not on CharacterOut (#1387)
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
    # A vote recalculates praxis members; the voter is never one.
    assert body["viewer_stats"]["score"] == before["character"]["score"]
    assert body["viewer_stats"]["level"] == before["character"]["level"]


@pytest.mark.asyncio
async def test_vote_summary_route_is_gone(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """PraxisOut carries the tally instead (#1382)."""
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
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers2)

    unvoted = (await client.get(f"/praxes/{praxis_id}", headers=auth_headers)).json()
    assert unvoted["viewer_vote"] is None

    await client.post(f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers)

    voted = (await client.get(f"/praxes/{praxis_id}", headers=auth_headers)).json()
    assert voted["viewer_vote"] == 5
    # author and anonymous reader
    assert (await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)).json()["viewer_vote"] is None
    assert (await client.get(f"/praxes/{praxis_id}")).json()["viewer_vote"] is None
