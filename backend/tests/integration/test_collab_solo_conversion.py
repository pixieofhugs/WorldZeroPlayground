"""ADR-0060 — a collab that drops to one member converts to solo, at any status.

``on_member_leave`` retypes it and hands ``created_by_id`` to the survivor; a
published one reprices (no collab bonus for work held alone).
"""
import dataclasses

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from services.character_stats import recalculate_character_stats
from services.praxis import leave_praxis
from tests.integration.factories import DEFAULT_FACTION_SLUG


def _era_with_collab_bonus(slug: str, collab_own_modifier: float) -> EraConfig:
    """Era 1 flattens modifiers to 1.0 (#452); tune one so conversion shows in score."""
    tuned = dataclasses.replace(
        CURRENT_ERA.factions[slug], collab_own_modifier=collab_own_modifier
    )
    factions = dict(CURRENT_ERA.factions)
    factions[slug] = tuned
    return dataclasses.replace(CURRENT_ERA, factions=factions)


async def _collab_with_members(
    client: AsyncClient,
    task: Task,
    creator_headers: dict,
    invitees: list[tuple[int, dict]],
) -> int:
    create_resp = await client.post(
        "/praxes",
        json={
            "task_id": task.id,
            "type": "collab",
            "title": "Group Work",
            "body_text": "Everyone chipped in.",
        },
        headers=creator_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    for invitee_id, invitee_headers in invitees:
        invite_resp = await client.post(
            f"/praxes/{praxis_id}/invite",
            json={"invitee_id": invitee_id},
            headers=creator_headers,
        )
        assert invite_resp.status_code in (200, 201)
        accept_resp = await client.post(
            f"/praxes/{praxis_id}/invite/{invite_resp.json()['id']}/respond",
            json={"accept": True},
            headers=invitee_headers,
        )
        assert accept_resp.status_code == 200

    return praxis_id


async def _member_count(session: AsyncSession, praxis_id: int) -> int:
    """From the DB, not a cached collection."""
    return await session.scalar(
        select(func.count())
        .select_from(PraxisMember)
        .where(PraxisMember.praxis_id == praxis_id)
    )


async def _score(session: AsyncSession, character_id: int, era_id: int) -> int:
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    return result.scalar_one().score


# in_progress


@pytest.mark.asyncio
async def test_two_member_collab_converts_to_solo_when_one_leaves(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Content survives; drop works because ``created_by_id`` moved."""
    praxis_id = await _collab_with_members(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )

    leave_resp = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers2)
    assert leave_resp.status_code == 200

    view = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert view.status_code == 200
    data = view.json()
    assert data["type"] == "solo"
    assert data["status"] == "in_progress"
    assert data["created_by_id"] == character.id
    assert data["title"] == "Group Work"
    assert data["body_text"] == "Everyone chipped in."
    assert [member["character_id"] for member in data["members"]] == [character.id]

    drop_resp = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers)
    assert drop_resp.status_code == 204


@pytest.mark.asyncio
async def test_conversion_drops_pending_invites(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Only pending invites drop; the accepted one is membership history."""
    praxis_id = await _collab_with_members(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character3.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code in (200, 201)

    await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers2)

    view = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert view.status_code == 200
    invites = view.json()["invites"]
    assert not [invite for invite in invites if invite["status"] == "pending"]
    assert [invite["invitee_id"] for invite in invites] == [character.id]


# submitted: conversion reprices


@pytest.mark.asyncio
async def test_submitted_collab_dropping_to_one_reprices_the_survivor(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Survivor is not the creator: pins the ``created_by_id`` handover (solo praxes
    are scored by it). Service-level so a tuned ``era`` can be passed.
    """
    praxis_id = await _collab_with_members(
        client,
        active_task,
        auth_headers2,
        [(character.id, auth_headers), (character3.id, auth_headers3)],
    )
    for headers in (auth_headers, auth_headers2, auth_headers3):
        submit_resp = await client.post(
            f"/praxes/{praxis_id}/submit", headers=headers
        )
        assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    tuned_era = _era_with_collab_bonus(DEFAULT_FACTION_SLUG, 1.5)
    faction = tuned_era.factions[DEFAULT_FACTION_SLUG]
    collab_total = round(active_task.point_value * faction.collab_own_modifier)
    solo_total = round(active_task.point_value * faction.own_task_modifier)
    assert collab_total != solo_total  # the tuning must actually bite

    await recalculate_character_stats(character.id, db_session, tuned_era)
    assert await _score(db_session, character.id, era.id) == collab_total

    # Two members remain: no conversion yet.
    await leave_praxis(praxis_id, character2.id, db_session, tuned_era)
    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis.type == PraxisType.collab
    assert await _member_count(db_session, praxis_id) == 2

    await leave_praxis(praxis_id, character3.id, db_session, tuned_era)

    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis.type == PraxisType.solo
    assert praxis.status == PraxisStatus.submitted  # stays Live; only the pricing moves
    assert praxis.created_by_id == character.id
    assert await _member_count(db_session, praxis_id) == 1

    # No manual recalc: the conversion owns it.
    assert await _score(db_session, character.id, era.id) == solo_total


# the zero-member state


@pytest.mark.asyncio
async def test_zero_member_state_is_unreachable(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The last member must drop, not leave."""
    praxis_id = await _collab_with_members(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    first_leave = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers2)
    assert first_leave.status_code == 200

    second_leave = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers)
    assert second_leave.status_code == 400
    assert await _member_count(db_session, praxis_id) == 1
