"""``viewer_can_vote`` (#998): False only for permanent, account-level reasons
(A. owns the praxis, B. is in its duel). Budget exhaustion and anonymous viewers
read True. Same predicate ``cast_or_update_vote`` enforces.
"""

import inspect

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.task import Task
from tests.integration.factories import make_admin


async def _create_and_submit_solo(
    client: AsyncClient, task: Task, headers: dict
) -> int:
    create = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Praxis"},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    submit = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submit.status_code == 200, submit.text
    return praxis_id


async def _card_for(client: AsyncClient, task_id: int, praxis_id: int, headers: dict):
    """Via the list route, exercising the page-wide ``viewer_can_vote_map``."""
    resp = await client.get(f"/praxes?task_id={task_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    cards = [c for c in resp.json() if c["id"] == praxis_id]
    assert cards, f"praxis {praxis_id} not in feed"
    return cards[0]


@pytest.mark.asyncio
async def test_author_cannot_vote_detail_and_card(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["viewer_can_vote"] is False

    card = await _card_for(client, active_task.id, praxis_id, auth_headers)
    assert card["viewer_can_vote"] is False


@pytest.mark.asyncio
async def test_collab_co_owner_cannot_vote(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Not ``created_by``, still an owner (ADR-0013)."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Shared"},
        headers=auth_headers2,
    )
    assert create.status_code == 201
    praxis_id = create.json()["id"]

    invite = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite.status_code == 200
    respond = await client.post(
        f"/praxes/{praxis_id}/invite/{invite.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert respond.status_code == 200

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["viewer_can_vote"] is False


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

    for pid in (challenger_pid, opponent_pid):
        body = (await client.get(f"/praxes/{pid}", headers=auth_headers)).json()
        assert body["viewer_can_vote"] is False, f"challenger on {pid}"

    for pid in (challenger_pid, opponent_pid):
        body = (await client.get(f"/praxes/{pid}", headers=auth_headers2)).json()
        assert body["viewer_can_vote"] is False, f"opponent on {pid}"

    card = await _card_for(client, active_task.id, challenger_pid, auth_headers)
    assert card["viewer_can_vote"] is False


@pytest.mark.asyncio
async def test_eligible_third_party_can_vote_detail_and_card(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.json()["viewer_can_vote"] is True
    card = await _card_for(client, active_task.id, praxis_id, auth_headers2)
    assert card["viewer_can_vote"] is True

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers2
    )
    assert vote.status_code == 200


@pytest.mark.asyncio
async def test_anonymous_viewer_gets_true(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The client shows its own login gate."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    detail = await client.get(f"/praxes/{praxis_id}")
    assert detail.status_code == 200
    assert detail.json()["viewer_can_vote"] is True

    card = await _card_for(client, active_task.id, praxis_id, {})
    assert card["viewer_can_vote"] is True


@pytest.mark.asyncio
async def test_out_of_budget_viewer_still_shows_module(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    era: Era,
):
    """Re-rating is free, so the module stays even though a new vote 403s."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character2.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.score = 0
    stats.votes_spent_this_era = 9999
    await db_session.commit()

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.json()["viewer_can_vote"] is True

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers2
    )
    assert vote.status_code == 403
    detail = vote.json()["detail"]
    assert detail["code"] == ErrorCode.vote_budget_exhausted.value
    assert "budget" in detail["message"].lower()


@pytest.mark.asyncio
async def test_predicate_matches_cast_or_update_vote_for_owner_and_third_party(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    from services.praxis import get_praxis
    from services.vote import viewer_can_vote

    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)
    praxis = await get_praxis(praxis_id, db_session)

    assert await viewer_can_vote(character, praxis, db_session) is False
    owner_vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert owner_vote.status_code == 403
    assert owner_vote.json()["detail"] == "Cannot vote on your own praxis."

    assert await viewer_can_vote(character2, praxis, db_session) is True
    assert await viewer_can_vote(None, praxis, db_session) is True


# Every route shipping a praxis payload (#1974): a service test cannot see a
# caller that never passes the viewer, so these go through HTTP.


@pytest.mark.asyncio
async def test_admin_moderate_response_is_viewer_relative(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The detail page feeds this response back into its praxis state."""
    await make_admin(db_session, account)
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    resp = await client.patch(
        f"/admin/praxes/{praxis_id}/moderate",
        json={"status": "hidden"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["viewer_can_vote"] is False


@pytest.mark.asyncio
async def test_admin_flagged_queue_is_viewer_relative(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Both sides in one response: an over-firing gate would pass one side."""
    from models.praxis import ModerationStatus, Praxis

    await make_admin(db_session, account)
    mine = await _create_and_submit_solo(client, active_task, auth_headers)
    theirs = await _create_and_submit_solo(client, active_task, auth_headers2)

    # Flag on the row; `POST /flag` would drag in unrelated gates.
    for praxis_id in (mine, theirs):
        row = await db_session.get(Praxis, praxis_id)
        row.moderation_status = ModerationStatus.flagged
    await db_session.commit()

    resp = await client.get("/admin/praxes/flagged", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    by_id = {row["id"]: row for row in resp.json()}
    assert by_id[mine]["viewer_can_vote"] is False
    assert by_id[theirs]["viewer_can_vote"] is True


@pytest.mark.asyncio
async def test_sidebar_active_praxes_are_viewer_relative(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Every ``active_praxes`` row is the viewer's own, so all read False."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Still going"},
        headers=auth_headers,
    )
    assert create.status_code == 201, create.text

    resp = await client.get("/me/sidebar", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    cards = resp.json()["active_praxes"]
    assert cards, "sidebar carried no active praxes to check"
    assert all(card["viewer_can_vote"] is False for card in cards)


def test_wire_field_has_no_permissive_default():
    """#1974: a hand-built payload must not default to "yes, vote here"."""
    from schemas.praxis import PraxisCardOut, PraxisOut

    for model in (PraxisOut, PraxisCardOut):
        assert model.model_fields["viewer_can_vote"].is_required(), model.__name__


def test_praxis_builders_demand_a_viewer():
    """``viewer=None`` must be typed out: "I forgot" becomes "I meant anonymous"."""
    from services.praxis_out import build_praxis_card_out, build_praxis_out

    for builder in (build_praxis_out, build_praxis_card_out):
        parameter = inspect.signature(builder).parameters["viewer"]
        assert parameter.default is inspect.Parameter.empty, builder.__name__
        assert parameter.kind is inspect.Parameter.KEYWORD_ONLY, builder.__name__
