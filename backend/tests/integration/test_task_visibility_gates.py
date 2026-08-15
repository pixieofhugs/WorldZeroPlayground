"""The retired/pending filter tabs are offered exactly when the query will answer.

Two advertised level unlocks — level 2 "the archive opens" (`retired_tasks`) and
level 3 "watch proposals move through review" (`pending_tasks`) — are stated in
two places that had drifted apart in *opposite* directions:

* `can_see_retired_tasks` was gated on the `/auth/me` flag and by nothing at all
  in `list_tasks`. Anonymous callers could read the whole archive, so the level-2
  ability was advertised and never actually withheld.
* `can_see_pending_tasks` was gated by level on the flag but by `is_admin` alone
  in `list_tasks` (#1672), so a level-3 player was offered a filter tab that
  always came back empty.

`useTasks.ts` pushes a status tab for each flag, so the flag *is* the promise and
the query has to keep it. This asserts the two agree — for both statuses, at both
doors (`?status=X` and the `?status=all` catch-all), which is the pairing that
matters: a gate written at only one door is not a gate, and that is exactly how
the pending queue leaked before #1672.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.task import Task, TaskStatus, TaskType


async def _set_level_and_faction(
    session: AsyncSession, character: Character, era: Era, level: int, faction: str
) -> None:
    stats = (
        await session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.level = level
    character.faction_slug = faction
    await session.commit()


async def _gated_task(session: AsyncSession, author: Character, status: TaskStatus) -> Task:
    task = Task(
        title=f"{status.value} row",
        description="",
        point_value=10,
        level_required=0,
        primary_faction_slug="na",
        task_type=TaskType.standard,
        created_by=author.id,
        status=status,
    )
    session.add(task)
    await session.commit()
    return task


async def _ids(client: AsyncClient, query: str, headers: dict | None) -> set[int]:
    response = await client.get(query, headers=headers or {})
    assert response.status_code == 200, response.text
    return {row["id"] for row in response.json()}


@pytest.mark.parametrize(
    "level, faction, sees_retired, sees_pending",
    [
        (0, "ua", False, False),
        (CURRENT_ERA.level_to_see_retired_tasks, "ua", True, False),
        (CURRENT_ERA.level_to_see_pending_tasks, "ua", True, True),
        # The faction whose perk is working retired tasks reaches the archive
        # from level 0 — a perk you cannot find the rows for is not a perk.
        (0, "ephemerists", True, False),
    ],
)
@pytest.mark.asyncio
async def test_the_flag_and_the_query_agree(
    level: int,
    faction: str,
    sees_retired: bool,
    sees_pending: bool,
    client: AsyncClient,
    character: Character,
    character2: Character,
    era: Era,
    faction_ua: Faction,
    faction_ephemerists: Faction,
    auth_headers: dict,
    db_session: AsyncSession,
):
    retired = await _gated_task(db_session, character2, TaskStatus.retired)
    pending = await _gated_task(db_session, character2, TaskStatus.pending)
    await _set_level_and_faction(db_session, character, era, level, faction)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_see_retired_tasks"] is sees_retired
    assert me["can_see_pending_tasks"] is sees_pending

    # Door one: the explicit status the flag's filter tab sends.
    assert (retired.id in await _ids(client, "/tasks?status=retired", auth_headers)) is sees_retired
    assert (pending.id in await _ids(client, "/tasks?status=pending", auth_headers)) is sees_pending

    # Door two: the catch-all reaches the same rows and must withhold the same.
    everything = await _ids(client, "/tasks?status=all&limit=200", auth_headers)
    assert (retired.id in everything) is sees_retired
    assert (pending.id in everything) is sees_pending


@pytest.mark.asyncio
async def test_the_anonymous_web_gets_neither(
    client: AsyncClient,
    character2: Character,
    db_session: AsyncSession,
):
    """No character, no level, so both abilities are unearned — at both doors.

    Retired is the regression that matters here: it used to come back 200 with
    the rows on it, to callers with no account at all.
    """
    retired = await _gated_task(db_session, character2, TaskStatus.retired)
    pending = await _gated_task(db_session, character2, TaskStatus.pending)

    for query in ("/tasks?status=retired", "/tasks?status=pending", "/tasks?status=all&limit=200"):
        visible = await _ids(client, query, None)
        assert retired.id not in visible, query
        assert pending.id not in visible, query
