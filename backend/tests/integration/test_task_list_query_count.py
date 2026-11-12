"""#1377: the task browse costs a constant number of queries per page.

Also pins that the batched viewer flags equal the per-task predicates: a batch
that changes an answer is a bug, not an optimisation.
"""
from contextlib import contextmanager

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.era import get_or_create_stats
from services.level_jump import available_level_reach
from services.signup_eligibility import (
    allowed_praxis_modes,
    evaluate_signup,
    is_task_eligible_for_character,
)
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Any per-row query shows up as a difference between the two counts.
SMALL_PAGE_TASKS = 2
LARGE_PAGE_TASKS = 12


@contextmanager
def _count_selects(db_connection):
    selects: list[str] = []
    sync_connection = db_connection.sync_connection

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            selects.append(statement)

    event.listen(sync_connection, "before_cursor_execute", before_cursor_execute)
    try:
        yield selects
    finally:
        event.remove(sync_connection, "before_cursor_execute", before_cursor_execute)


async def _add_tasks(
    db_session: AsyncSession,
    author: Character,
    count: int,
    *,
    start: int = 0,
) -> list[Task]:
    tasks = [
        Task(
            title=f"Task {index}",
            description="",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=author.id,
            primary_faction_slug=DEFAULT_FACTION_SLUG,
        )
        for index in range(start, start + count)
    ]
    db_session.add_all(tasks)
    await db_session.commit()
    return tasks


@pytest_asyncio.fixture
async def browse_page(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
) -> list[Task]:
    tasks = await _add_tasks(db_session, character2, SMALL_PAGE_TASKS)
    return tasks


@pytest.mark.asyncio
async def test_signed_in_browse_query_count_does_not_scale_with_page_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    browse_page: list[Task],
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    with _count_selects(db_connection) as small_page:
        small = await client.get("/tasks?limit=50", headers=auth_headers)
    assert small.status_code == 200
    assert len(small.json()) == SMALL_PAGE_TASKS
    small_count = len(small_page)

    await _add_tasks(
        db_session,
        character2,
        LARGE_PAGE_TASKS - SMALL_PAGE_TASKS,
        start=SMALL_PAGE_TASKS,
    )

    with _count_selects(db_connection) as large_page:
        large = await client.get("/tasks?limit=50", headers=auth_headers)
    assert large.status_code == 200
    assert len(large.json()) == LARGE_PAGE_TASKS
    assert len(large_page) == small_count, (
        f"{small_count} queries for {SMALL_PAGE_TASKS} rows but "
        f"{len(large_page)} for {LARGE_PAGE_TASKS}: "
        + "\n".join(large_page)
    )


@pytest.mark.asyncio
async def test_anonymous_browse_query_count_does_not_scale_with_page_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    browse_page: list[Task],
    character2: Character,
):
    with _count_selects(db_connection) as small_page:
        small = await client.get("/tasks?limit=50")
    assert small.status_code == 200
    small_count = len(small_page)

    await _add_tasks(
        db_session,
        character2,
        LARGE_PAGE_TASKS - SMALL_PAGE_TASKS,
        start=SMALL_PAGE_TASKS,
    )

    with _count_selects(db_connection) as large_page:
        large = await client.get("/tasks?limit=50")
    assert large.status_code == 200
    assert len(large.json()) == LARGE_PAGE_TASKS
    assert len(large_page) == small_count, "\n".join(large_page)


@pytest.mark.asyncio
async def test_batched_flags_equal_the_per_task_predicates(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """Mixed gates, so the predicate answers differently per row."""
    stats = await get_or_create_stats(db_session, character.id, era.id)
    # So the archive gate doesn't withhold the retired row.
    stats.level = CURRENT_ERA.level_to_see_retired_tasks
    await db_session.commit()

    plain = await _add_tasks(db_session, character2, 3)
    already_member, too_hard, retired = await _add_tasks(
        db_session, character2, 3, start=3
    )
    too_hard.level_required = 99
    retired.status = TaskStatus.retired
    praxis = Praxis(
        task_id=already_member.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="mine",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()

    # Keep the retired and already-member rows on the page.
    response = await client.get(
        "/tasks?limit=50&status=all&exclude_character_id=0", headers=auth_headers
    )
    assert response.status_code == 200
    rows = {row["id"]: row for row in response.json()}
    assert already_member.id in rows and too_hard.id in rows and retired.id in rows
    assert {task.id for task in plain} <= set(rows)

    level_reach = available_level_reach(
        character.faction_slug, stats.level, stats.level_jump_used_at_level, CURRENT_ERA
    )
    expected_modes = [
        mode.value for mode in allowed_praxis_modes(character, stats.level, CURRENT_ERA)
    ]
    for task_id, row in rows.items():
        task = await db_session.get(Task, task_id)
        eligibility = await evaluate_signup(character, task, db_session, CURRENT_ERA)
        assert row["can_sign_up"] is eligibility.allowed, task_id
        assert row["eligible_for_current_user"] is is_task_eligible_for_character(
            character, task, stats.level, level_reach
        ), task_id
        assert row["allowed_modes"] == expected_modes, task_id

    assert rows[already_member.id]["can_sign_up"] is False
    assert rows[too_hard.id]["can_sign_up"] is False
    assert rows[too_hard.id]["eligible_for_current_user"] is False
    assert rows[retired.id]["can_sign_up"] is False
    assert all(rows[task.id]["can_sign_up"] is True for task in plain)
