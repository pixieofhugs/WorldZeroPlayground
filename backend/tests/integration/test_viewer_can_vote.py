"""Integration tests for ``viewer_can_vote`` (#998).

The vote module must be hidden for a logged-in viewer who can never vote on a
praxis for a PERMANENT, account-level reason:
  A. Ownership — the viewer's account owns the praxis (author or collab co-owner).
  B. Duel participation — the viewer's account is a participant in its duel.

The backend surfaces this as ``viewer_can_vote`` on ``PraxisOut`` (detail) and
``PraxisCardOut`` (feed card). Budget exhaustion is deliberately excluded (the
module stays visible), and anonymous viewers get ``True`` (client shows its own
login gate). The predicate is the same one ``cast_or_update_vote`` enforces, so
the UI flag can never disagree with a 403.
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
    """Fetch the feed card for ``praxis_id`` from the list route (exercises the
    page-wide ``viewer_can_vote_map`` precompute)."""
    resp = await client.get(f"/praxes?task_id={task_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    cards = [c for c in resp.json() if c["id"] == praxis_id]
    assert cards, f"praxis {praxis_id} not in feed"
    return cards[0]


# ---------------------------------------------------------------------------
# A. Ownership — author / collab co-owner cannot vote → module hidden.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_author_cannot_vote_detail_and_card(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The author sees ``viewer_can_vote is False`` on both detail and card."""
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
    """A collab co-owner who is NOT ``created_by`` still gets ``viewer_can_vote
    is False`` (account-level ownership, ADR-0013)."""
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

    # character is now a co-owner but not created_by → module hidden.
    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["viewer_can_vote"] is False


# ---------------------------------------------------------------------------
# B. Duel participation — either participant, either side → module hidden.
# ---------------------------------------------------------------------------


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
    """Each participant sees ``viewer_can_vote is False`` on BOTH duel sides."""
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

    # Challenger's account: both sides hidden.
    for pid in (challenger_pid, opponent_pid):
        body = (await client.get(f"/praxes/{pid}", headers=auth_headers)).json()
        assert body["viewer_can_vote"] is False, f"challenger on {pid}"

    # Opponent's account: both sides hidden (symmetric).
    for pid in (challenger_pid, opponent_pid):
        body = (await client.get(f"/praxes/{pid}", headers=auth_headers2)).json()
        assert body["viewer_can_vote"] is False, f"opponent on {pid}"

    # And in the feed card too (page-wide precompute).
    card = await _card_for(client, active_task.id, challenger_pid, auth_headers)
    assert card["viewer_can_vote"] is False


# ---------------------------------------------------------------------------
# Eligible viewers — third party (True), anonymous (True), out-of-budget (True).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_eligible_third_party_can_vote_detail_and_card(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """An unrelated logged-in viewer gets ``viewer_can_vote is True`` and votes."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.json()["viewer_can_vote"] is True
    card = await _card_for(client, active_task.id, praxis_id, auth_headers2)
    assert card["viewer_can_vote"] is True

    # The flag agrees with the endpoint: the third party actually votes.
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
    """Anonymous → ``viewer_can_vote is True`` (client shows its own login gate)."""
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
    """Budget exhaustion is NOT part of ``viewer_can_vote``: an eligible viewer
    who is out of budget still sees the module (re-rating is free), even though a
    NEW vote would 403 with the budget message."""
    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)

    # Drain character2's budget: score 0, votes_spent absurdly high.
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
    assert detail.json()["viewer_can_vote"] is True  # module stays visible

    # The endpoint blocks a NEW vote on budget — a DIFFERENT reason than A/B.
    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers2
    )
    assert vote.status_code == 403
    detail = vote.json()["detail"]
    assert detail["code"] == ErrorCode.vote_budget_exhausted.value
    assert "budget" in detail["message"].lower()


# ---------------------------------------------------------------------------
# Shared source of truth — the predicate matches ``cast_or_update_vote``.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_predicate_matches_cast_or_update_vote_for_owner_and_third_party(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """``viewer_can_vote`` is False exactly when ``cast_or_update_vote`` raises
    for a PERMANENT reason (A ownership), and True for an eligible third party
    who can actually cast."""
    from services.praxis import get_praxis
    from services.vote import viewer_can_vote

    praxis_id = await _create_and_submit_solo(client, active_task, auth_headers)
    praxis = await get_praxis(praxis_id, db_session)

    # Owner: predicate False, and the endpoint 403s with the anti-self-vote reason.
    assert await viewer_can_vote(character, praxis, db_session) is False
    owner_vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 5}, headers=auth_headers
    )
    assert owner_vote.status_code == 403
    assert owner_vote.json()["detail"] == "Cannot vote on your own praxis."

    # Third party: predicate True, and anonymous also True.
    assert await viewer_can_vote(character2, praxis, db_session) is True
    assert await viewer_can_vote(None, praxis, db_session) is True


@pytest.mark.asyncio
async def test_predicate_false_for_duel_participant(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The predicate returns False for a duel participant on either side, matching
    the endpoint's duel anti-participation 403."""
    from models.duel import Duel, DuelStatus
    from services.praxis import get_praxis
    from services.vote import viewer_can_vote

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

    challenger_praxis = await get_praxis(challenger_pid, db_session)
    opponent_praxis = await get_praxis(opponent_pid, db_session)

    # character is the challenger; blocked on both sides.
    assert await viewer_can_vote(character, challenger_praxis, db_session) is False
    assert await viewer_can_vote(character, opponent_praxis, db_session) is False
    # character2 is the opponent; blocked on both sides.
    assert await viewer_can_vote(character2, challenger_praxis, db_session) is False
    assert await viewer_can_vote(character2, opponent_praxis, db_session) is False


# ---------------------------------------------------------------------------
# Every ROUTE that ships a praxis payload, not just the two everyone remembers
# (#1974).
#
# The tests above prove the *predicate* is right; they always passed. The bug
# was a route that never asked it — ``/admin`` built its payload with no viewer
# at all, so ``viewer_can_vote`` came back with the ANONYMOUS answer (True) and
# the moderator's own praxis drew a vote widget. The seam is therefore the HTTP
# boundary: a service-level test cannot see a caller that never calls.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_moderate_response_is_viewer_relative(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """``PATCH /admin/praxes/{id}/moderate`` answers for the MODERATOR (#1974).

    The praxis detail page feeds this response straight back into its praxis
    state, so a viewerless payload here re-draws the vote widget on the
    moderator's own praxis the moment they hide or fail it.
    """
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
    """``GET /admin/praxes/flagged`` answers for the MODERATOR, and only there.

    Both sides in one test on purpose: the moderator's own flagged praxis reads
    ``False``, and a stranger's flagged praxis in the SAME response still reads
    ``True``. A gate that over-fires would pass a one-sided assertion.
    """
    await make_admin(db_session, account)
    mine = await _create_and_submit_solo(client, active_task, auth_headers)
    theirs = await _create_and_submit_solo(client, active_task, auth_headers2)
    for praxis_id, flagger in ((mine, auth_headers2), (theirs, auth_headers)):
        flag = await client.post(
            f"/praxes/{praxis_id}/flag",
            json={"reason": "harassment"},
            headers=flagger,
        )
        assert flag.status_code == 200, flag.text

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
    """``GET /me/sidebar`` is the other LIST that carries ``PraxisCardOut``.

    Every praxis in ``active_praxes`` is one the viewer is a member of, so every
    one of them must read ``False`` — this is the list payload where a fail-open
    default would be wrong for one hundred percent of its rows.
    """
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


# ---------------------------------------------------------------------------
# The trap itself: a forgetful caller must not be able to ship "you may vote".
# ---------------------------------------------------------------------------


def test_wire_field_has_no_permissive_default():
    """``viewer_can_vote`` is REQUIRED on both praxis payloads (#1974).

    It used to default to ``True``, which meant any hand-built payload read as
    "yes, vote here". Costs nothing on the wire: ``WireModel`` already marks
    default-carrying fields required in the SERIALIZATION schema, so dropping
    the default changes ``openapi.json`` not at all — it only removes the way to
    forget it in Python.
    """
    from schemas.praxis import PraxisCardOut, PraxisOut

    for model in (PraxisOut, PraxisCardOut):
        assert model.model_fields["viewer_can_vote"].is_required(), model.__name__


def test_praxis_builders_demand_a_viewer():
    """Neither builder has a ``viewer`` default, so a route cannot omit it.

    This is the guard, not the fix. The fix was two ``/admin`` routes; this is
    what stops the third one. ``viewer=None`` is still legal — it just has to be
    typed out, which turns "I forgot" into "I meant anonymous".
    """
    from services.praxis_out import build_praxis_card_out, build_praxis_out

    for builder in (build_praxis_out, build_praxis_card_out):
        parameter = inspect.signature(builder).parameters["viewer"]
        assert parameter.default is inspect.Parameter.empty, builder.__name__
        assert parameter.kind is inspect.Parameter.KEYWORD_ONLY, builder.__name__
