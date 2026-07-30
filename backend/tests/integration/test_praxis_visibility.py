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
async def test_profile_praxes_hide_in_progress_from_every_viewer(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """GET /characters/{id}/praxes omits in_progress drafts — the owner included.

    This test used to assert the opposite for the owner's own view
    (``..._hide_others_in_progress_show_own``). #1112 reversed that half
    deliberately: the profile is a public record of finished work, and a draft
    is read from the sidebar instead. The non-member half is unchanged.
    """
    praxis_id = await _create_solo(client, active_task, auth_headers)
    path = f"/characters/{character.id}/praxes"

    others_view = await client.get(path, headers=auth_headers2)
    assert praxis_id not in {p["id"] for p in others_view.json()}

    own_view = await client.get(path, headers=auth_headers)
    assert praxis_id not in {p["id"] for p in own_view.json()}

    anonymous_view = await client.get(path)
    assert praxis_id not in {p["id"] for p in anonymous_view.json()}


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

    assert (await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)).status_code == 200
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
    withdraw = await client.post(f"/praxes/{praxis.id}/unsubmit", headers=auth_headers)
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

    resp = await client.post(f"/praxes/{praxis_id}/unsubmit", headers=auth_headers)
    assert resp.status_code == 200

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.settled
    assert duel.forfeited_by_character_id == character.id


# ---------------------------------------------------------------------------
# Pre-seal duel-side exposure (#999) — a submitted duel side is author-only
# while the duel is live and incomplete (pending/active); it reveals on seal.
# ---------------------------------------------------------------------------


async def _submitted_solo(
    db_session: AsyncSession, task: Task, author: Character
) -> Praxis:
    """A *submitted* solo praxis authored by ``author`` (with its member row)."""
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Duel side",
        body_text="secret proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id, has_submitted=True))
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


@pytest.mark.asyncio
async def test_active_incomplete_duel_side_is_author_only(
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
    """An `active` duel with only the challenger cast: that submitted side is
    visible to its author only — not the opponent (no cribbing), not spectators.
    Covers both doors: the /praxes/{id} detail gate and the feed list.
    """
    challenger_praxis = await _submitted_solo(db_session, active_task, character)
    # Opponent accepted (praxis exists) but has NOT cast yet → duel is active.
    opponent_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Opponent draft",
        body_text="",
    )
    db_session.add(opponent_praxis)
    await db_session.flush()
    db_session.add(
        PraxisMember(praxis_id=opponent_praxis.id, character_id=character2.id, has_submitted=False)
    )
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_praxis_id=opponent_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.active,
    )
    db_session.add(duel)
    await db_session.commit()

    cid = challenger_praxis.id

    # Detail door: author 200; opponent AND spectator AND anon all 404.
    assert (await client.get(f"/praxes/{cid}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/praxes/{cid}", headers=auth_headers2)).status_code == 404
    assert (await client.get(f"/praxes/{cid}", headers=auth_headers3)).status_code == 404
    assert (await client.get(f"/praxes/{cid}")).status_code == 404

    # Feed door: absent for opponent, spectator, anon; present for the author.
    def _ids(resp):
        return {p["id"] for p in resp.json()}

    assert cid not in _ids(await client.get("/praxes", headers=auth_headers2))
    assert cid not in _ids(await client.get("/praxes", headers=auth_headers3))
    assert cid not in _ids(await client.get("/praxes"))
    assert cid in _ids(await client.get("/praxes", headers=auth_headers))


@pytest.mark.asyncio
async def test_pending_duel_challenger_side_is_author_only(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A `pending` duel (opponent hasn't even accepted) whose challenger has cast:
    the submitted side is still author-only until the duel seals."""
    challenger_praxis = await _submitted_solo(db_session, active_task, character)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.commit()

    cid = challenger_praxis.id
    assert (await client.get(f"/praxes/{cid}", headers=auth_headers)).status_code == 200
    assert (await client.get(f"/praxes/{cid}", headers=auth_headers2)).status_code == 404
    assert cid not in {p["id"] for p in (await client.get("/praxes", headers=auth_headers2)).json()}


@pytest.mark.asyncio
async def test_settled_duel_both_sides_public(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers3: dict,
):
    """Once a duel is `settled` (both cast) both bodies go public — a spectator
    can open either side and both appear in the feed."""
    challenger_praxis = await _submitted_solo(db_session, active_task, character)
    opponent_praxis = await _submitted_solo(db_session, active_task, character2)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_praxis_id=opponent_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.settled,
    )
    db_session.add(duel)
    await db_session.commit()

    for pid in (challenger_praxis.id, opponent_praxis.id):
        assert (await client.get(f"/praxes/{pid}", headers=auth_headers3)).status_code == 200
    feed_ids = {p["id"] for p in (await client.get("/praxes", headers=auth_headers3)).json()}
    assert {challenger_praxis.id, opponent_praxis.id} <= feed_ids


@pytest.mark.asyncio
async def test_forfeit_reveals_surviving_submitted_side(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers3: dict,
):
    """A forfeited duel stays `settled`; the surviving submitted side is public
    to spectators (the forfeiter's own side, being unsubmitted, is member-only
    via the ordinary in_progress gate — ADR-0011)."""
    survivor_praxis = await _submitted_solo(db_session, active_task, character2)
    # Forfeiter withdrew their side → in_progress, hidden by the ordinary gate.
    forfeiter_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Withdrawn side",
        body_text="",
    )
    db_session.add(forfeiter_praxis)
    await db_session.flush()
    db_session.add(
        PraxisMember(praxis_id=forfeiter_praxis.id, character_id=character.id, has_submitted=False)
    )
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=forfeiter_praxis.id,
        opponent_praxis_id=survivor_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.settled,
        forfeited_by_character_id=character.id,
    )
    db_session.add(duel)
    await db_session.commit()

    # Surviving submitted side: public to a spectator.
    assert (
        await client.get(f"/praxes/{survivor_praxis.id}", headers=auth_headers3)
    ).status_code == 200
    # Forfeiter's own in_progress side stays hidden (ordinary member-only gate).
    assert (
        await client.get(f"/praxes/{forfeiter_praxis.id}", headers=auth_headers3)
    ).status_code == 404


@pytest.mark.asyncio
async def test_declined_duel_challenger_side_public(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A `declined` duel reverts to a plain solo praxis — the challenger's
    submitted side reveals as usual (no second party to protect)."""
    challenger_praxis = await _submitted_solo(db_session, active_task, character)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.declined,
    )
    db_session.add(duel)
    await db_session.commit()

    assert (
        await client.get(f"/praxes/{challenger_praxis.id}", headers=auth_headers2)
    ).status_code == 200


@pytest.mark.asyncio
async def test_can_view_and_list_service_gate_duel_side(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
):
    """Service-level assertions on the shared helper: `can_view_praxis` returns
    False for non-authors of a live-incomplete duel side, and `list_praxes`
    omits it for them while including it for the author."""
    from services.praxis import can_view_praxis, list_praxes

    challenger_praxis = await _submitted_solo(db_session, active_task, character)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.active,
    )
    db_session.add(duel)
    await db_session.commit()

    # can_view_praxis: author yes; opponent, spectator, anon no.
    assert await can_view_praxis(character, challenger_praxis, db_session) is True
    assert await can_view_praxis(character2, challenger_praxis, db_session) is False
    assert await can_view_praxis(character3, challenger_praxis, db_session) is False
    assert await can_view_praxis(None, challenger_praxis, db_session) is False

    # list_praxes: present for the author, absent for a spectator and for anon.
    author_ids = {p.id for p in await list_praxes(db_session, viewer_id=character.id)}
    spectator_ids = {p.id for p in await list_praxes(db_session, viewer_id=character3.id)}
    anon_ids = {p.id for p in await list_praxes(db_session)}
    assert challenger_praxis.id in author_ids
    assert challenger_praxis.id not in spectator_ids
    assert challenger_praxis.id not in anon_ids
