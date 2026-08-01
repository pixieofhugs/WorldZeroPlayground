"""#1378 — the praxis list must cost a constant number of queries.

**The seam under test** is ``GET /praxes`` → :func:`services.praxis_out.build_praxis_cards`
→ :func:`services.praxis_out.build_praxis_card_out`. That gather page-batches six maps
(crowns, viewer votes, author contributions, applied metatasks, vote eligibility,
duel ids) with explicit "never a per-card query" comments — but the card builder
still called :func:`services.vote_tally.tally_votes` with a one-element list per
praxis, so the vote tally was the one un-batched map: +1 SELECT per row.

Two assertions, and they are different things:

- **query count** — a small page and a larger one cost the *same* number of
  SELECTs, signed in and anonymous. This is what stops the N+1 growing back;
  this repo has re-grown one before (#1377 is the sibling guard for ``/tasks``).
- **behaviour** — every card's ``points_from_votes``/``voter_count`` still equals
  what :func:`~services.vote_tally.tally_votes` says for that praxis *alone*,
  including the zero-vote praxis (absent from the aggregate) and a praxis whose
  votes span more than one voter account. A batch that changes an answer is a
  bug, not an optimisation.
"""
from contextlib import contextmanager
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.vote_tally import get_tally, tally_votes

#: Rows on the small page, and on the large one. The gap is the whole test: any
#: per-row query shows up as a difference between the two counts.
SMALL_PAGE_PRAXES = 2
LARGE_PAGE_PRAXES = 12


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


async def _add_submitted_praxes(
    db_session: AsyncSession,
    task: Task,
    author: Character,
    count: int,
    *,
    start: int = 0,
) -> list[Praxis]:
    """``count`` submitted solo praxes by ``author`` — the ordinary feed row."""
    praxes = []
    for index in range(start, start + count):
        praxis = Praxis(
            task_id=task.id,
            created_by_id=author.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted,
            # #658 guards the submitted feed on submitted_at IS NOT NULL.
            submitted_at=datetime.now(timezone.utc),
            title=f"Praxis {index}",
            body_text="proof",
        )
        db_session.add(praxis)
        await db_session.flush()
        db_session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
        praxes.append(praxis)
    await db_session.commit()
    return praxes


async def _cast(
    db_session: AsyncSession, praxis: Praxis, voter: Character, value: int
) -> None:
    db_session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await db_session.commit()


@pytest_asyncio.fixture
async def feed_page(
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
    character3: Character,
) -> list[Praxis]:
    """A small page, one row voted and one not — a page of identical rows would
    hide a tally query that only fires for praxes that HAVE votes."""
    praxes = await _add_submitted_praxes(
        db_session, active_task, character2, SMALL_PAGE_PRAXES
    )
    await _cast(db_session, praxes[0], character3, 4)
    return praxes


@pytest.mark.asyncio
async def test_signed_in_feed_query_count_does_not_scale_with_page_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    feed_page: list[Praxis],
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """A signed-in 12-row page costs the same queries as a 2-row page (#1378)."""
    with _count_selects(db_connection) as small_page:
        small = await client.get("/praxes?limit=50", headers=auth_headers)
    assert small.status_code == 200
    assert len(small.json()) == SMALL_PAGE_PRAXES
    small_count = len(small_page)

    await _add_submitted_praxes(
        db_session,
        active_task,
        character2,
        LARGE_PAGE_PRAXES - SMALL_PAGE_PRAXES,
        start=SMALL_PAGE_PRAXES,
    )

    with _count_selects(db_connection) as large_page:
        large = await client.get("/praxes?limit=50", headers=auth_headers)
    assert large.status_code == 200
    assert len(large.json()) == LARGE_PAGE_PRAXES
    assert len(large_page) == small_count, (
        f"{small_count} queries for {SMALL_PAGE_PRAXES} rows but "
        f"{len(large_page)} for {LARGE_PAGE_PRAXES}: "
        + "\n".join(large_page)
    )


@pytest.mark.asyncio
async def test_anonymous_feed_query_count_does_not_scale_with_page_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    feed_page: list[Praxis],
    active_task: Task,
    character2: Character,
):
    """The guest feed pays the same N+1; it must go flat too (#1378)."""
    with _count_selects(db_connection) as small_page:
        small = await client.get("/praxes?limit=50")
    assert small.status_code == 200
    small_count = len(small_page)

    await _add_submitted_praxes(
        db_session,
        active_task,
        character2,
        LARGE_PAGE_PRAXES - SMALL_PAGE_PRAXES,
        start=SMALL_PAGE_PRAXES,
    )

    with _count_selects(db_connection) as large_page:
        large = await client.get("/praxes?limit=50")
    assert large.status_code == 200
    assert len(large.json()) == LARGE_PAGE_PRAXES
    assert len(large_page) == small_count, "\n".join(large_page)


@pytest.mark.asyncio
async def test_batched_tallies_equal_the_per_praxis_tally(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
):
    """Every card's vote fields match the tally computed for that praxis alone.

    The page deliberately mixes the cases: a praxis with no votes at all (absent
    from the aggregate, so a page-wide map must not read that absence as
    "uncovered"), a praxis voted once, and a praxis voted by two different voter
    ACCOUNTS — the sum and the count both have to carry across.
    """
    unvoted, single_voter, two_voters = await _add_submitted_praxes(
        db_session, active_task, character2, 3
    )
    await _cast(db_session, single_voter, character3, 2)
    await _cast(db_session, two_voters, character, 5)
    await _cast(db_session, two_voters, character3, 3)

    response = await client.get("/praxes?limit=50", headers=auth_headers)
    assert response.status_code == 200
    rows = {row["id"]: row for row in response.json()}
    assert {unvoted.id, single_voter.id, two_voters.id} <= set(rows)

    for praxis_id, row in rows.items():
        tally = get_tally(await tally_votes([praxis_id], db_session), praxis_id)
        assert row["points_from_votes"] == tally.points_from_votes, praxis_id
        assert row["voter_count"] == tally.voter_count, praxis_id

    # The mix actually exercised the cases it claims to.
    assert rows[unvoted.id]["voter_count"] == 0
    assert rows[unvoted.id]["points_from_votes"] == 0
    assert rows[single_voter.id]["voter_count"] == 1
    assert rows[two_voters.id]["voter_count"] == 2
    assert rows[two_voters.id]["points_from_votes"] == 8
