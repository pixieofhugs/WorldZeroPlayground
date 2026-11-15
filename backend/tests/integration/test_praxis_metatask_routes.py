"""Both metatask mutations (POST and DELETE) answer with the re-scored praxis, so
the composer's score stamp needs no refetch (#2464).
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.era import Era
from models.faction import Faction
from models.praxis import PraxisStatus
from models.task import TaskType
from tests.integration.factories import make_character, make_solo_praxis, make_task

BASE_POINTS = 10
META_POINTS = 100


def base_score(author) -> float:
    """Only the base takes the faction's own-task modifier; metatask points are
    flat (ADR-0086, #2708)."""
    return BASE_POINTS * CURRENT_ERA.factions[author.faction_slug].own_task_modifier


@pytest_asyncio.fixture
async def sealable(
    db_session: AsyncSession, account2: Account, era: Era, some_faction: Faction
):
    """An author at ``metatask_apply_level``, on ``account2``."""
    author = await make_character(
        db_session,
        era,
        username="sealer",
        account=account2,
        level=CURRENT_ERA.metatask_apply_level,
    )
    task = await make_task(db_session, author, point_value=BASE_POINTS)
    metatask = await make_task(
        db_session,
        author,
        title="a metatask",
        point_value=META_POINTS,
        task_type=TaskType.metatask,
    )
    praxis = await make_solo_praxis(
        db_session, task, author, status=PraxisStatus.in_progress
    )
    await db_session.commit()
    return praxis, metatask, author


@pytest.mark.asyncio
async def test_sealing_answers_with_the_new_total(
    client: AsyncClient, auth_headers2: dict, sealable
):
    praxis, metatask, author = sealable

    response = await client.post(
        f"/praxes/{praxis.id}/metatasks",
        json={"task_id": metatask.id},
        headers=auth_headers2,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["metatask_points"] == META_POINTS
    assert body["score"] == pytest.approx(base_score(author) + META_POINTS)


@pytest.mark.asyncio
async def test_peeling_answers_with_the_total_it_falls_back_to(
    client: AsyncClient, auth_headers2: dict, sealable
):
    praxis, metatask, author = sealable
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
    assert body["score"] == pytest.approx(base_score(author))
