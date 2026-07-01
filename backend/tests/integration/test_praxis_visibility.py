"""Integration tests for ADR-0024 — an in_progress praxis is private (member-only).

Covers the four read surfaces routed through ``can_view_praxis`` (detail, list,
profile, comments), the all-members recalc on collab withdraw, vote preservation
across unsubmit→resubmit, and the temporary settled-duel-side withdraw guard.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from services.character_stats import recalculate_character_stats


async def _create_solo(client: AsyncClient, task: Task, headers: dict) -> int:
    """Create an in_progress solo praxis (with the creator's member row) via the API."""
    resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Draft"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_in_progress_detail_member_200_nonmember_and_anon_404(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /praxes/{id} of an in_progress praxis: 200 for the member, 404 otherwise."""
    praxis_id = await _create_solo(client, active_task, auth_headers)

    member = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert member.status_code == 200

    non_member = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert non_member.status_code == 404  # 404, not 403 — don't reveal existence

    anon = await client.get(f"/praxes/{praxis_id}")
    assert anon.status_code == 404


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_hides_others_in_progress_shows_own(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /praxes omits another character's in_progress praxis but includes the viewer's own."""
    praxis_id = await _create_solo(client, active_task, auth_headers)

    others_view = await client.get("/praxes", headers=auth_headers2)
    assert praxis_id not in {p["id"] for p in others_view.json()}

    anon_view = await client.get("/praxes")
    assert praxis_id not in {p["id"] for p in anon_view.json()}

    own_view = await client.get("/praxes", headers=auth_headers)
    assert praxis_id in {p["id"] for p in own_view.json()}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_profile_praxes_hide_others_in_progress_show_own(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /characters/{id}/praxes omits the character's in_progress drafts for non-members."""
    praxis_id = await _create_solo(client, active_task, auth_headers)
    path = f"/characters/{character.id}/praxes"

    others_view = await client.get(path, headers=auth_headers2)
    assert praxis_id not in {p["id"] for p in others_view.json()}

    own_view = await client.get(path, headers=auth_headers)
    assert praxis_id in {p["id"] for p in own_view.json()}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_comments_on_draft_404_for_nonmember_200_for_member(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /praxes/{id}/comments of a draft is member-only (mirror the detail 404)."""
    praxis_id = await _create_solo(client, active_task, auth_headers)

    non_member = await client.get(f"/praxes/{praxis_id}/comments", headers=auth_headers2)
    assert non_member.status_code == 404

    member = await client.get(f"/praxes/{praxis_id}/comments", headers=auth_headers)
    assert member.status_code == 200


# ---------------------------------------------------------------------------
# Withdraw semantics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resubmit_preserves_vote_tally(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Votes survive unsubmit→resubmit (ADR-0007): the tally returns unchanged."""
    praxis_id = await _create_solo(client, active_task, auth_headers)
    assert (await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)).status_code == 200

    vote = await client.post(
        f"/praxes/{praxis_id}/vote", json={"value": 4}, headers=auth_headers2
    )
    assert vote.status_code == 200
    before = await client.get(f"/praxes/{praxis_id}/votes")
    assert before.json()["total_votes"] == 1

    assert (await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)).status_code == 200
    assert (await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)).status_code == 200

    after = await client.get(f"/praxes/{praxis_id}/votes")
    assert after.json()["total_votes"] == 1


@pytest.mark.asyncio
async def test_withdraw_collab_recalculates_every_member(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Withdrawing a collab recalcs *every* member's score, not just the actor's.

    Regression for the prior single-actor under-recalc: a co-author who did not
    trigger the withdraw kept a stale, inflated score.
    """
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="Team effort",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=praxis.id, character_id=character.id, has_submitted=True),
            PraxisMember(praxis_id=praxis.id, character_id=character2.id, has_submitted=True),
        ]
    )
    await db_session.commit()
    # Establish scores that reflect the submitted collab for both members.
    await recalculate_character_stats(character.id, db_session)
    await recalculate_character_stats(character2.id, db_session)
    await db_session.commit()

    coauthor_before = (await client.get(f"/characters/{character2.id}")).json()["score"]
    assert coauthor_before > 0

    # character (a member, but NOT the co-author) reopens the collab.
    withdraw = await client.post(f"/praxes/{praxis.id}/withdraw", headers=auth_headers)
    assert withdraw.status_code == 200

    coauthor_after = (await client.get(f"/characters/{character2.id}")).json()["score"]
    assert coauthor_after < coauthor_before, (
        "Co-author's score was not recalculated on withdraw — the single-actor "
        "under-recalc bug is back."
    )


@pytest.mark.asyncio
async def test_withdraw_settled_duel_side_forfeits(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Unsubmitting a *settled* duel side forfeits it (ADR-0011 §Forfeit, #307).

    No 422: the withdraw succeeds, the duel stays ``settled``, and the actor is
    recorded as the forfeiter.
    """
    praxis_id = await _create_solo(client, active_task, auth_headers)
    assert (await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)).status_code == 200

    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=praxis_id,
        opponent_character_id=character2.id,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    resp = await client.post(f"/praxes/{praxis_id}/withdraw", headers=auth_headers)
    assert resp.status_code == 200

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled
    assert duel.forfeited_by_character_id == character.id
