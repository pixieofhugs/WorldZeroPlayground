"""Per-praxis and per-character locks on the membership paths (#3682, #3655).

Seam: the advisory locks the paths take, probed from a second connection with
``pg_try_advisory_xact_lock`` (the suite shares one transaction, so Postgres
never blocks here; the key and the holding are what is asserted).
"""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.praxis import Praxis, PraxisInvite, PraxisStatus
from models.task import Task
from services import collab_consensus
from services import praxis as praxis_service
from services.collab_consensus import _PRAXIS_LOCK_NAMESPACE
from services.praxis import _SIGNUP_LOCK_NAMESPACE

_PROBE = text("SELECT pg_try_advisory_xact_lock(:namespace, :key)")


async def _is_held(db_connection, namespace: int, key: int) -> bool:
    async with db_connection.engine.connect() as other:
        return not await other.scalar(_PROBE, {"namespace": namespace, "key": key})


async def _invite(client, praxis_id, headers, invitee_id) -> int:
    response = await client.post(
        f"/praxes/{praxis_id}/invite", json={"invitee_id": invitee_id}, headers=headers
    )
    assert response.status_code in (200, 201), response.text
    return response.json()["id"]


async def _collab(client, task, creator_headers, member_headers, member_id) -> int:
    created = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "Locks"},
        headers=creator_headers,
    )
    assert created.status_code == 201, created.text
    praxis_id = created.json()["id"]
    invite = await _invite(client, praxis_id, creator_headers, member_id)
    accept = await client.post(
        f"/praxes/{praxis_id}/invite/{invite}/respond",
        json={"accept": True},
        headers=member_headers,
    )
    assert accept.status_code == 200, accept.text
    return praxis_id


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["leave", "kick", "change-type", "submit"])
async def test_each_membership_path_holds_the_praxis_lock(
    path,
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_connection,
):
    praxis_id = await _collab(
        client, active_task, auth_headers2, auth_headers, character.id
    )
    url = f"/praxes/{praxis_id}"
    request = {
        "leave": lambda: client.post(f"{url}/leave", headers=auth_headers),
        "kick": lambda: client.post(
            f"{url}/kick/{character.id}", headers=auth_headers2
        ),
        "change-type": lambda: client.post(
            f"{url}/change-type", json={"type": "solo"}, headers=auth_headers2
        ),
        "submit": lambda: client.post(f"{url}/submit", headers=auth_headers2),
    }[path]
    await request()  # submit refuses for want of proof; the lock comes first

    assert await _is_held(db_connection, _PRAXIS_LOCK_NAMESPACE, praxis_id)
    assert not await _is_held(db_connection, _PRAXIS_LOCK_NAMESPACE, praxis_id + 1000)


@pytest.mark.asyncio
async def test_invite_accept_holds_signup_and_praxis_locks_and_decline_neither(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
    db_connection,
):
    praxis_id = await _collab(
        client, active_task, auth_headers2, auth_headers, character.id
    )
    invite_id = await _invite(client, praxis_id, auth_headers2, character3.id)

    decline = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": False},
        headers=auth_headers3,
    )
    assert decline.status_code == 200, decline.text
    assert not await _is_held(db_connection, _SIGNUP_LOCK_NAMESPACE, character3.id)

    invite_id = await _invite(client, praxis_id, auth_headers2, character3.id)
    accept = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers3,
    )
    assert accept.status_code == 200, accept.text
    assert await _is_held(db_connection, _SIGNUP_LOCK_NAMESPACE, character3.id)
    assert await _is_held(db_connection, _PRAXIS_LOCK_NAMESPACE, praxis_id)


@pytest.mark.asyncio
async def test_a_deleted_invite_is_a_404_not_a_500(
    client: AsyncClient,
    monkeypatch,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """The rival (kick, switch to solo) deletes the invite while we wait on the lock."""
    praxis_id = await _collab(
        client, active_task, auth_headers2, auth_headers, character.id
    )
    invite_id = await _invite(client, praxis_id, auth_headers2, character3.id)

    real_lock = praxis_service._lock_praxis

    async def rival_wins_first(pid, session):
        await real_lock(pid, session)
        await session.execute(delete(PraxisInvite).where(PraxisInvite.id == invite_id))

    monkeypatch.setattr(praxis_service, "_lock_praxis", rival_wins_first)
    response = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers3,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "Invite not found."


@pytest.mark.asyncio
async def test_invite_accept_refuses_a_task_the_character_is_already_active_on(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    praxis_id = await _collab(
        client, active_task, auth_headers2, auth_headers, character.id
    )
    invite_id = await _invite(client, praxis_id, auth_headers2, character3.id)
    own = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Mine"},
        headers=auth_headers3,
    )
    assert own.status_code == 201, own.text

    response = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers3,
    )
    assert response.status_code == 409, response.text


@pytest.mark.asyncio
async def test_a_lapsed_window_seal_takes_the_praxis_lock_but_a_plain_read_does_not(
    monkeypatch,
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    praxis_id = await _collab(
        client, active_task, auth_headers2, auth_headers, character.id
    )
    now = datetime.now(timezone.utc)
    await db_session.execute(
        update(Praxis)
        .where(Praxis.id == praxis_id)
        .values(status=PraxisStatus.pending, submit_proposed_at=now)
    )
    praxis = await db_session.scalar(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .execution_options(populate_existing=True)
    )
    locked: list[int] = []
    real_lock = collab_consensus._lock_praxis

    async def spy(pid, session):
        locked.append(pid)
        await real_lock(pid, session)

    monkeypatch.setattr(collab_consensus, "_lock_praxis", spy)

    await collab_consensus.settle_if_window_lapsed(praxis, db_session, CURRENT_ERA)
    assert locked == []

    lapsed = now - timedelta(days=CURRENT_ERA.collab_auto_submit_days + 1)
    await db_session.execute(
        update(Praxis).where(Praxis.id == praxis_id).values(submit_proposed_at=lapsed)
    )
    await db_session.refresh(praxis)
    await collab_consensus.settle_if_window_lapsed(praxis, db_session, CURRENT_ERA)
    assert locked == [praxis_id]


@pytest.mark.asyncio
@pytest.mark.parametrize("accept", [True, False])
async def test_duel_accept_holds_the_signup_lock_and_decline_does_not(
    accept,
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    db_connection,
):
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 2
    await db_session.commit()

    side = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Duel"},
        headers=auth_headers2,
    )
    assert side.status_code == 201, side.text
    issued = await client.post(
        "/duels/challenge",
        json={
            "challenger_praxis_id": side.json()["id"],
            "opponent_character_id": character.id,
        },
        headers=auth_headers2,
    )
    assert issued.status_code == 201, issued.text

    response = await client.post(
        f"/duels/{issued.json()['id']}/respond",
        json={"accept": accept},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert await _is_held(db_connection, _SIGNUP_LOCK_NAMESPACE, character.id) is accept
