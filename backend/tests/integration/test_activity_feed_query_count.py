"""#1532 — one Updates load must cost a bounded, pinned number of statements.

**The seam under test** is ``GET /activity-feed`` →
:func:`services.activity_feed.get_activity_feed`. That call fans out over the
sixteen-entry ``FEED_SOURCES`` registry twice: once to fetch rows, once to count
badges. Every one of those sub-queries takes its **own session** from
``session_factory``, so the statement count is also, in production, the number of
pooled connections one page load asks for at the same time.

Two numbers, and they are different things:

- **total statements** — the whole request, pre-fetch included. Pins the size of
  the fan-out so it cannot silently regrow.
- **badge-count statements** — how many round trips the six tab badges cost on
  their own. This was one COUNT per registry source (one each); ADR-0036 only
  requires that a badge derive from the *same* windowed Select as its rows, and a
  ``UNION ALL`` of those COUNTs preserves that while costing one.

The fixture deliberately satisfies every pre-fetch need (a friend, a foe, an
in-progress praxis, a vote on it), because a source whose context is empty is
skipped without a round trip — a viewer with no relationships would understate
the fan-out, and a viewer nobody has voted for would leave the two vote sources
returning nothing.
"""
from contextlib import contextmanager

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session_factory
from main import app
from models.account import Account
from models.character import Character
from models.era import Era
from models.feed_dismissal import FeedDismissal
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.task import Task
from models.vote import Vote
from services.activity_feed import (
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_SOURCES,
    build_item_key,
)

#: Statements one default (live, ``filter=all``) feed load issues, end to end:
#: the auth lookup, the five pre-fetch round trips, one fetch per registry
#: source, and the badge counts. Before #1532 this was 33 — fifteen of them were
#: the badge COUNTs. Change it only with the reason in the PR body.
#:
#: 19 → 20 in #1712: ``vote_changed_on_mine`` is a sixteenth registry source, so
#: the fetch fan-out costs one more statement. The badge counts do not — they
#: are one ``UNION ALL`` however many sources there are, which is the property
#: the two constants below exist to hold.
#:
#: 20 → 33 in #2199: a page carrying a vote row paid for one scoring pass
#: (``_score_vote_items``) so the "+N pts" it printed was the praxis's real
#: score rather than arithmetic invented at the payload. Thirteen statements —
#: the praxis fetch, its four ``selectin`` loaders, and
#: ``author_contributions_for``'s own bulk queries.
#:
#: 33 → 34 in #2280: a sixth pre-fetch round trip for the reader's level, which
#: answers ``services.meta_task.character_sees_metatasks`` once per call so
#: ``_global_tasks_query`` can withhold metatasks from readers the metatask list
#: does not open for. Flat — one statement per *call*, not per source, per row
#: or per filter. It is a round trip rather than a correlated subquery (the
#: ``character_born`` trick in that same function) because the gate is a rule,
#: not a comparison: stating it in SQL would put a second copy of
#: ``era.level_to_see_metatasks`` next to an identically-numbered apply
#: threshold that a faction perk bends and this one does not.
#:
#: 34 → 21 in #2402: all thirteen come back off. The row prints what THAT voter
#: added, which is their star value exactly — ``points_from_votes`` is a plain
#: ``sum(Vote.value)`` added after the multipliers — and the vote query already
#: selects it, so the praxis's total is neither shown nor fetched. The whole
#: post-pass is gone, not made conditional. The fixture below still seeds a
#: vote: the two vote sources are part of the fan-out this number pins, and a
#: scoring pass creeping back onto them would show up here first.
EXPECTED_FEED_LOAD_STATEMENTS = 21

#: Round trips the six tab badges cost. One ``UNION ALL`` over the same windowed
#: Selects the fetch fan-out runs, whatever the registry's size (#1532). Was 15.
EXPECTED_BADGE_COUNT_STATEMENTS = 1

#: Sessions a feed load takes from ``session_factory`` — i.e. pooled connections
#: it holds *on top of* the request's own. Every one of the fetches and every one
#: of the counts used to take one, so a single page load reached for ~30 against
#: a pool of 15 and the surplus queued on ``pool_timeout`` (#1532). Only the
#: badge UNION takes one now. This is the assertion the bug was actually about:
#: statement count alone would not have caught it.
EXPECTED_SUBQUERY_SESSIONS = 1


@contextmanager
def _count_selects(db_connection):
    """Collect every SELECT issued on the test connection while the block runs."""
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
    """The statements that exist only to produce badge numbers.

    A count statement selects ``count(*)`` out of a subquery and hydrates no
    rows; the fetch fan-out never does. Matching on that shape keeps the
    assertion honest whether the counts arrive as fifteen statements or one.
    """
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
    """A viewer with every pre-fetch context populated, so no source is skipped.

    ``character2`` is a friend, ``character3`` a foe, and the viewer holds an
    in-progress praxis so ``my_task_ids`` is non-empty. ``character2`` has voted
    on that praxis, so the page carries a ``vote_on_mine`` row and therefore
    pays the #2199 scoring pass — the expensive shape, which is the one worth
    pinning.
    """
    db_session.add_all([
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        ),
        Relationship(
            from_character_id=character.id,
            to_character_id=character3.id,
            type=RelationshipType.foe,
            status=RelationshipStatus.active,
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
    """One Updates page load issues exactly ``EXPECTED_FEED_LOAD_STATEMENTS``."""
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
    """The six tab badges are one statement, not one per registry source (#1532)."""
    with _count_selects(db_connection) as statements:
        response = await client.get("/activity-feed", headers=auth_headers)
    assert response.status_code == 200
    counts = _badge_count_statements(statements)
    assert len(counts) == EXPECTED_BADGE_COUNT_STATEMENTS, (
        f"badge counts cost {len(counts)} round trips against a registry of "
        f"{len(FEED_SOURCES)} sources:\n" + "\n".join(counts)
    )


@pytest.mark.asyncio
async def test_feed_load_takes_one_pooled_connection_beyond_its_own(
    client: AsyncClient,
    feed_viewer: Character,
    auth_headers: dict,
):
    """A page load must not reach for a pool's worth of connections (#1532).

    Counts how many times the service asks ``session_factory`` for a session.
    The test harness hands back one shared session, so the connections are not
    real here — the *number of asks* is, and that number is what exhausted the
    pool in production.
    """
    inner_factory = app.dependency_overrides[get_session_factory]
    asks: list[int] = []

    def counting_override():
        make_context = inner_factory()

        def counted():
            asks.append(1)
            return make_context()

        return counted

    app.dependency_overrides[get_session_factory] = counting_override
    try:
        response = await client.get("/activity-feed", headers=auth_headers)
    finally:
        app.dependency_overrides[get_session_factory] = inner_factory
    assert response.status_code == 200
    assert len(asks) == EXPECTED_SUBQUERY_SESSIONS, (
        f"the feed took {len(asks)} sessions from the factory against a registry "
        f"of {len(FEED_SOURCES)} sources"
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
    """The Archived tab pays a second facet fan-out — still bounded (#1419 dec. 21).

    ``_compute_counts`` deliberately runs two passes there: the live badges and
    the archive facet. Two collapsed passes are two statements, not thirty.

    The dismissal is load-bearing: a viewer who has archived nothing skips the
    facet pass entirely (every source's scoped query is ``None``), so without it
    this test would pass on one statement and prove nothing about the second.
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
