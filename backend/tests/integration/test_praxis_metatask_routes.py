"""Both metatask mutations answer with the re-scored praxis (#2464).

The composer's score stamp prints ``praxis.score`` / ``praxis.metatask_points``.
Sealing or peeling a metatask changes both numbers, and the server has already
computed them by the time it answers — ``apply_metatask`` and ``remove_metatask``
are both typed ``-> Praxis`` and both re-run ``recalculate_members_stats``.

So the contract these tests pin is that the *route* hands that praxis back.
``POST`` always did. ``DELETE`` declared ``204`` and threw the service's return
value away, which left the client with no way to learn the new total short of a
refetch — a third statement of a number the server just sent (#1382 / #2402).

The reported symptom was a base of 10 with a +100 metatask sealed and a stamp
still reading 10, so 10/110 are the numbers used here.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.praxis import PraxisStatus
from models.task import TaskType
from tests.integration.factories import make_solo_praxis, make_task

BASE_POINTS = 10
META_POINTS = 100


def base_score(author: Character) -> float:
    """``BASE_POINTS`` as the author actually banks it.

    Only the base multiplies (ADR-0086), by the own-task modifier of whichever
    faction the fixture handed this author (#2708) — the metatask points are
    flat on top. Era 1's default resolves this to 1.0; Era 2 has no faction with
    a baseline task modifier at all.
    """
    return BASE_POINTS * CURRENT_ERA.factions[author.faction_slug].own_task_modifier


@pytest_asyncio.fixture
async def sealable(db_session: AsyncSession, character2: Character):
    """A level-5 author's in-progress draft, plus a metatask worth +100.

    ``character2`` is the fixture that already sits at ``metatask_apply_level``
    (5 in Era 1); ``character`` is level 0 and would be refused at the gate.
    """
    task = await make_task(db_session, character2, point_value=BASE_POINTS)
    metatask = await make_task(
        db_session,
        character2,
        title="a metatask",
        point_value=META_POINTS,
        task_type=TaskType.metatask,
    )
    praxis = await make_solo_praxis(
        db_session, task, character2, status=PraxisStatus.in_progress
    )
    await db_session.commit()
    return praxis, metatask


@pytest.mark.asyncio
async def test_sealing_answers_with_the_new_total(
    client: AsyncClient, auth_headers2: dict, sealable, character2: Character
):
    praxis, metatask = sealable

    response = await client.post(
        f"/praxes/{praxis.id}/metatasks",
        json={"task_id": metatask.id},
        headers=auth_headers2,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["metatask_points"] == META_POINTS
    assert body["score"] == pytest.approx(base_score(character2) + META_POINTS)


@pytest.mark.asyncio
async def test_peeling_answers_with_the_total_it_falls_back_to(
    client: AsyncClient, auth_headers2: dict, sealable, character2: Character
):
    """The regression: DELETE used to answer 204 with no body at all."""
    praxis, metatask = sealable
    sealed = await client.post(
        f"/praxes/{praxis.id}/metatasks",
        json={"task_id": metatask.id},
        headers=auth_headers2,
    )
    assert sealed.status_code == 201

    response = await client.delete(
        f"/praxes/{praxis.id}/metatasks/{metatask.id}", headers=auth_headers2
    )

    assert response.status_code == 200
    body = response.json()
    assert body["metatask_points"] == 0
    assert body["score"] == pytest.approx(base_score(character2))
