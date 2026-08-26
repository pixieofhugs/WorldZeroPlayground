"""ADR-0060 — a collab that drops to one member converts to solo, at any status.

``leave_praxis`` has no status guard, so a member may walk away from an
``in_progress``, ``pending`` or ``submitted`` collab. When their departure
leaves exactly one member behind, the praxis stops being a collaboration:
``on_member_leave`` retypes it to ``solo`` and hands ``created_by_id`` to the
survivor. Before this, an emptying collab silently did nothing and could reach
a zero-member state that nobody could edit and only its original creator could
delete.

The published case deliberately reprices: a deserted collab must not keep a
collaboration bonus for work one character now holds alone.
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


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _era_with_collab_bonus(slug: str, collab_own_modifier: float) -> EraConfig:
    """``CURRENT_ERA`` with one faction's collab own-faction modifier overridden.

    The conversion is only *observable* in a score where the collab and solo
    modifiers differ. Era 1 flattens almost everything to 1.0 (#452), so rather
    than pinning the test to whichever faction currently carries a bonus, tune a
    copy of the live config and pass it down as the ``era`` argument — exactly
    how the services take it.
    """
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
    """Create a collab and walk each ``(character_id, headers)`` through an invite."""
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
    """Membership count straight from the DB, not from a cached collection."""
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


# ---------------------------------------------------------------------------
# in_progress: the ordinary desertion
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_two_member_collab_converts_to_solo_when_one_leaves(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A two-member ``in_progress`` collab losing a member becomes the survivor's solo.

    Content survives (id, title, body — never delete+recreate) and the survivor
    can drop it, which is only true because ``created_by_id`` moved: ``delete_praxis``
    is creator-only.
    """
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
    """An invite nobody accepted cannot survive the collab it was issued for.

    Only *pending* invites are dropped — the accepted one is the survivor's own
    membership history and stays, matching the takeover path.
    """
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


# ---------------------------------------------------------------------------
# submitted: the conversion reprices an already-scored praxis
# ---------------------------------------------------------------------------


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
    """A published three-member collab losing two members converts and rescores.

    The survivor is deliberately NOT the creator, so this also pins the
    ``created_by_id`` handover on the published path — without it the praxis
    would stop counting for anyone (``recalculate_character_stats`` gathers solo
    praxes by ``created_by_id``).

    Driven through the service rather than the route so a tuned ``era`` can be
    passed in; the routes always pass ``CURRENT_ERA``.
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

    # Price the survivor under the tuned era while this is still a collab.
    await recalculate_character_stats(character.id, db_session, tuned_era)
    assert await _score(db_session, character.id, era.id) == collab_total

    # The creator goes first: two members remain, so nothing converts yet.
    await leave_praxis(praxis_id, character2.id, db_session, tuned_era)
    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis.type == PraxisType.collab
    assert await _member_count(db_session, praxis_id) == 2

    # The second departure leaves exactly one member — convert.
    await leave_praxis(praxis_id, character3.id, db_session, tuned_era)

    praxis = await db_session.get(Praxis, praxis_id)
    assert praxis.type == PraxisType.solo
    assert praxis.status == PraxisStatus.submitted  # stays Live; only the pricing moves
    assert praxis.created_by_id == character.id
    assert await _member_count(db_session, praxis_id) == 1

    # No manual recalc here — the conversion is responsible for it.
    assert await _score(db_session, character.id, era.id) == solo_total


# ---------------------------------------------------------------------------
# the zero-member state
# ---------------------------------------------------------------------------


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
    """The last member's exit is *drop*, not leave — leaving a solo is refused."""
    praxis_id = await _collab_with_members(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    first_leave = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers2)
    assert first_leave.status_code == 200

    second_leave = await client.post(f"/praxes/{praxis_id}/leave", headers=auth_headers)
    assert second_leave.status_code == 400
    assert await _member_count(db_session, praxis_id) == 1
