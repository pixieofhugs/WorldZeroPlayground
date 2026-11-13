"""Praxis refusals: delete, invites, metatasks, kicks, mode changes (#3355).

Every test asserts the refusal AND that the rows it guards did not move.
"""
from dataclasses import replace

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, detail_code
from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.meta_task import PraxisMetaTask
from models.praxis import (
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task, TaskType
from services.auth import create_jwt
from services.praxis import invite_to_praxis
from tests.integration.factories import make_duel, make_task


def _headers(character: Character) -> dict:
    return {"Authorization": f"Bearer {create_jwt(character.account_id)}"}


async def _member_ids(session: AsyncSession, praxis_id: int) -> set[int]:
    result = await session.execute(
        select(PraxisMember.character_id).where(PraxisMember.praxis_id == praxis_id)
    )
    return set(result.scalars().all())


async def _invite_for(
    session: AsyncSession, praxis: Praxis, inviter: Character, invitee: Character
) -> PraxisInvite:
    invite = PraxisInvite(
        praxis_id=praxis.id, inviter_id=inviter.id, invitee_id=invitee.id
    )
    session.add(invite)
    await session.commit()
    return invite


async def _praxis_count(session: AsyncSession) -> int:
    return await session.scalar(select(func.count()).select_from(Praxis))


# Row 4 - delete


@pytest.mark.asyncio
async def test_cannot_delete_another_characters_praxis(
    client: AsyncClient,
    praxis_solo: Praxis,
    character2: Character,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    resp = await client.delete(f"/praxes/{praxis_solo.id}", headers=auth_headers2)

    assert resp.status_code == 403
    assert await db_session.get(Praxis, praxis_solo.id) is not None


@pytest.mark.asyncio
async def test_cannot_delete_a_submitted_praxis(
    client: AsyncClient,
    praxis_solo: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    resp = await client.delete(f"/praxes/{praxis_solo.id}", headers=auth_headers)

    assert resp.status_code == 400
    assert await db_session.get(Praxis, praxis_solo.id) is not None


# Row 5 - responding to invites


@pytest.mark.asyncio
async def test_cannot_accept_an_invite_meant_for_someone_else(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    invite = await _invite_for(db_session, praxis_collab, character, character3)
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/invite/{invite.id}/respond",
        json={"accept": True},
        headers=auth_headers2,
    )

    assert resp.status_code == 403
    assert await _member_ids(db_session, praxis_collab.id) == roster
    await db_session.refresh(invite)
    assert invite.status == PraxisInviteStatus.pending


@pytest.mark.asyncio
async def test_cannot_respond_to_a_missing_invite(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers3: dict,
    db_session: AsyncSession,
):
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/invite/999999/respond",
        json={"accept": True},
        headers=auth_headers3,
    )

    assert resp.status_code == 404
    assert await _member_ids(db_session, praxis_collab.id) == roster


@pytest.mark.asyncio
async def test_cannot_accept_an_invite_already_resolved(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character3: Character,
    auth_headers3: dict,
    db_session: AsyncSession,
):
    invite = await _invite_for(db_session, praxis_collab, character, character3)
    invite.status = PraxisInviteStatus.declined
    await db_session.commit()
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/invite/{invite.id}/respond",
        json={"accept": True},
        headers=auth_headers3,
    )

    assert resp.status_code == 400
    assert await _member_ids(db_session, praxis_collab.id) == roster


# Row 7 - metatasks


@pytest.fixture
async def metatask(db_session: AsyncSession, character: Character) -> Task:
    return await make_task(db_session, character, task_type=TaskType.metatask)


async def _attached_count(session: AsyncSession) -> int:
    return await session.scalar(select(func.count()).select_from(PraxisMetaTask))


@pytest.mark.asyncio
async def test_metatask_refused_when_the_task_is_not_a_metatask(
    client: AsyncClient,
    praxis_collab: Praxis,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    resp = await client.post(
        f"/praxes/{praxis_collab.id}/metatasks",
        json={"task_id": active_task.id},
        headers=auth_headers,
    )

    assert resp.status_code == 400
    assert await _attached_count(db_session) == 0


@pytest.mark.asyncio
async def test_metatask_refused_for_a_non_member(
    client: AsyncClient,
    praxis_collab: Praxis,
    metatask: Task,
    character3: Character,
    auth_headers3: dict,
    db_session: AsyncSession,
):
    resp = await client.post(
        f"/praxes/{praxis_collab.id}/metatasks",
        json={"task_id": metatask.id},
        headers=auth_headers3,
    )

    assert resp.status_code == 403
    assert await _attached_count(db_session) == 0


@pytest.mark.asyncio
async def test_metatask_refused_when_the_praxis_is_not_in_progress(
    client: AsyncClient,
    praxis_solo: Praxis,
    metatask: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/metatasks",
        json={"task_id": metatask.id},
        headers=auth_headers,
    )

    assert resp.status_code == 422
    assert await _attached_count(db_session) == 0


# Row 9 - invite gates


@pytest.mark.asyncio
async def test_duplicate_pending_invite_is_refused(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    path = f"/praxes/{praxis_collab.id}/invite"
    body = {"invitee_id": character3.id}
    first = await client.post(path, json=body, headers=auth_headers)
    assert first.status_code == 200

    second = await client.post(path, json=body, headers=auth_headers)

    assert second.status_code == 409
    code = detail_code(second.json()["detail"])
    assert code == ErrorCode.invite_already_pending.value
    invites = await db_session.scalar(select(func.count()).select_from(PraxisInvite))
    assert invites == 1


@pytest.mark.asyncio
async def test_invite_refused_when_the_invitees_faction_may_not_act_on_the_task(
    praxis_collab: Praxis,
    character: Character,
    character3: Character,
    db_session: AsyncSession,
    monkeypatch,
):
    # faction_permits is always True today (ADR-0029); close it to prove the wiring.
    monkeypatch.setattr("services.praxis.faction_permits", lambda *_: False)
    strict_era = replace(CURRENT_ERA, collab_invite_bypasses_faction=False)

    with pytest.raises(HTTPException) as refusal:
        await invite_to_praxis(
            praxis_collab.id, character3.id, character.id, db_session, strict_era
        )

    assert refusal.value.status_code == 403
    assert (
        detail_code(refusal.value.detail)
        == ErrorCode.invite_faction_not_permitted.value
    )
    invites = await db_session.scalar(select(func.count()).select_from(PraxisInvite))
    assert invites == 0


# Row 10 - kicks


@pytest.mark.asyncio
async def test_cannot_kick_yourself(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/kick/{character.id}", headers=auth_headers
    )

    assert resp.status_code == 400
    assert await _member_ids(db_session, praxis_collab.id) == roster


@pytest.mark.asyncio
async def test_cannot_kick_a_non_member(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/kick/{character3.id}", headers=auth_headers
    )

    assert resp.status_code == 400
    assert await _member_ids(db_session, praxis_collab.id) == roster


@pytest.mark.asyncio
async def test_cannot_kick_from_a_published_praxis(
    client: AsyncClient,
    praxis_collab: Praxis,
    character2: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    praxis_collab.status = PraxisStatus.submitted
    await db_session.commit()
    roster = await _member_ids(db_session, praxis_collab.id)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/kick/{character2.id}", headers=auth_headers
    )

    assert resp.status_code == 422
    assert await _member_ids(db_session, praxis_collab.id) == roster


# Row 11 - mode change


@pytest.mark.asyncio
async def test_mode_change_refused_while_in_a_duel(
    client: AsyncClient, era: Era, some_faction, db_session: AsyncSession
):
    duel, challenger, _ = await make_duel(db_session, era, label="modeduel")
    praxis = await db_session.get(Praxis, duel.challenger_praxis_id)
    praxis.status = PraxisStatus.in_progress
    await db_session.commit()

    resp = await client.post(
        f"/praxes/{praxis.id}/change-type",
        json={"type": "collab"},
        headers=_headers(challenger),
    )

    assert resp.status_code == 409
    await db_session.refresh(praxis)
    assert praxis.type == PraxisType.solo


@pytest.mark.asyncio
async def test_mode_change_to_collab_refused_below_the_collab_level(
    client: AsyncClient,
    praxis_solo: Praxis,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    required = CURRENT_ERA.collaboration_level_required
    if required < 1:
        pytest.skip("this era gates collab at level 0; nothing is below it")
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = required - 1
    praxis_solo.status = PraxisStatus.in_progress
    await db_session.commit()

    resp = await client.post(
        f"/praxes/{praxis_solo.id}/change-type",
        json={"type": "collab"},
        headers=auth_headers,
    )

    assert resp.status_code == 403
    code = detail_code(resp.json()["detail"])
    assert code == ErrorCode.collaboration_level_too_low.value
    await db_session.refresh(praxis_solo)
    assert praxis_solo.type == PraxisType.solo
