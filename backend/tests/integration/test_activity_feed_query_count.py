"""#1532: one Updates load costs a bounded, pinned number of statements.

``GET /activity-feed`` fans out over ``FEED_SOURCES`` twice (rows, badges), each
on the request's one session (pool exhaustion: ``test_pool_never_nested``).
Badges are one ``UNION ALL`` of the per-source COUNTs, which keeps ADR-0036.

The fixture fills every pre-fetch context: a source with empty context is skipped
without a round trip and would understate the fan-out.
"""
from contextlib import contextmanager

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.era import Era
from models.feed_dismissal import FeedDismissal
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.relationship import Relationship, RelationshipType
from models.task import Task
from models.vote import Vote
from services.activity_feed import (
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_SOURCES,
    build_item_key,
)

#: Statements one default (live, ``filter=all``) feed load issues: auth, six
#: pre-fetch round trips, one fetch per registry source, one badge UNION. Change
#: it only with the reason in the PR body. A new registry source is +1, not +2.
#: The metatask gate (#2280) is a round trip, not SQL, so the rule lives once.
#: ADR-0070 (#3456): answered requests join the stream, so +3 fetches (collab,
#: duel, letter; awaiting_submission has no answered state). The answered
#: badges ride the existing UNION, so no extra badge statement or session.
EXPECTED_FEED_LOAD_STATEMENTS = 26

#: One ``UNION ALL`` over the fetch fan-out's windowed Selects (#1532).
EXPECTED_BADGE_COUNT_STATEMENTS = 1

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


def _badge_count_statements(statements: list[str]) -> list[str]:
    """Badge statements select ``count(*)`` over a subquery; fetches never do."""
    return [statement for statement in statements if "count(*)" in statement]


@pytest_asyncio.fixture
async def feed_viewer(
    db_session: AsyncSession,
    account2: Account,
    character: Character,
    character2: Character,
    character3: Character,
    era: Era,
    active_task: Task,
) -> Character:
    """A viewer with every pre-fetch context populated, so no source is skipped."""
    db_session.add_all([
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
        ),
        Relationship(
            from_character_id=character.id,
            to_character_id=character3.id,
            type=RelationshipType.foe,
        ),
    ])
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="in flight",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all([
        PraxisMember(praxis_id=praxis.id, character_id=character.id),
        Vote(
            praxis_id=praxis.id,
            voter_character_id=character2.id,
            voter_account_id=account2.id,
            value=4,
        ),
    ])
    await db_session.commit()
    return character


@pytest.mark.asyncio
async def test_feed_load_costs_a_pinned_number_of_statements(
    client: AsyncClient,
    db_connection,
    feed_viewer: Character,
    auth_headers: dict,
):
    with _count_selects(db_connection) as statements:
        response = await client.get("/activity-feed", headers=auth_headers)
    assert response.status_code == 200
    assert len(statements) == EXPECTED_FEED_LOAD_STATEMENTS, (
        f"expected {EXPECTED_FEED_LOAD_STATEMENTS} statements, got "
        f"{len(statements)}:\n" + "\n".join(statements)
    )


@pytest.mark.asyncio
async def test_badge_counts_cost_one_round_trip_not_one_per_source(
    client: AsyncClient,
    db_connection,
    feed_viewer: Character,
    auth_headers: dict,
):
    with _count_selects(db_connection) as statements:
        response = await client.get("/activity-feed", headers=auth_headers)
    assert response.status_code == 200
    counts = _badge_count_statements(statements)
    assert len(counts) == EXPECTED_BADGE_COUNT_STATEMENTS, (
        f"badge counts cost {len(counts)} round trips against a registry of "
        f"{len(FEED_SOURCES)} sources:\n" + "\n".join(counts)
    )


@pytest.mark.asyncio
async def test_archived_feed_counts_stay_bounded(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    feed_viewer: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Archived pays a second, bounded facet pass (#1419 dec. 21).

    The dismissal matters: with nothing archived the facet pass is skipped.
    """
    db_session.add(
        FeedDismissal(
            character_id=feed_viewer.id,
            item_key=build_item_key(FEED_ITEM_TYPE_GLOBAL_TASK, active_task.id),
        )
    )
    await db_session.commit()

    with _count_selects(db_connection) as statements:
        response = await client.get(
            "/activity-feed", params={"archived": "true"}, headers=auth_headers
        )
    assert response.status_code == 200
    counts = _badge_count_statements(statements)
    assert len(counts) == 2 * EXPECTED_BADGE_COUNT_STATEMENTS, "\n".join(counts)
