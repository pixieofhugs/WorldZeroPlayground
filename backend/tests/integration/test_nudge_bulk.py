"""Nudging the whole crew in one request (#1415).

**The seam under test** is ``POST /praxes/{praxis_id}/nudge`` →
:func:`services.nudge.nudge_the_crew`. The single-recipient route is unchanged
and keeps its own file (``test_nudge.py``); what is new here is the batch.

Three things are pinned, and they are different claims:

- **by value** — the right members were nudged and the wrong ones were *not*.
  A bulk endpoint that nudges nobody passes every "no error" assertion, so
  every success case here reads the ``nudge`` table back and compares sets.
- **partial success** — ``NUDGE_COOLDOWN`` is per (sender → recipient → praxis),
  so a crew press is routinely part-refused. One recipient inside their window
  fails *only itself*; the rest still land. Whole-request verdicts (praxis not
  open, sender not authorised) still fail the whole request, because they are
  not per-recipient facts.
- **query count** — the crew nudge costs the same whether the crew is two or
  eight. The naive shape is a loop over :func:`services.nudge.send_nudge`, which
  is four queries per recipient; this guard is what stops it growing back.
  Siblings: ``test_praxis_list_query_count.py``, ``test_task_list_query_count.py``.
"""
from contextlib import contextmanager
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import event, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.nudge import Nudge
from models.praxis import Praxis, PraxisMember, PraxisStatus
from models.task import Task
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Outstanding members on the small crew and on the large one. The gap is the
#: whole point of the query-count test.
SMALL_CREW = 2
LARGE_CREW = 8


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@contextmanager
def _count_statements(db_connection):
    """Collect every statement issued on the test connection while the block runs."""
    statements: list[str] = []
    sync_connection = db_connection.sync_connection

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(sync_connection, "before_cursor_execute", before_cursor_execute)
    try:
        yield statements
    finally:
        event.remove(sync_connection, "before_cursor_execute", before_cursor_execute)


async def _set_cast(
    session: AsyncSession, praxis_id: int, character_id: int, cast: bool
) -> None:
    """Mark one member's part filed / not filed."""
    await session.execute(
        update(PraxisMember)
        .where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == character_id,
        )
        .values(
            has_submitted=cast,
            submitted_at=datetime.now(timezone.utc) if cast else None,
        )
    )
    await session.commit()


async def _join(
    session: AsyncSession, praxis: Praxis, index: int, *, cast: bool = False
) -> Character:
    """A fresh character joined to ``praxis``.

    Built directly rather than through invite/accept: what is under test is the
    fan-out, not how a crew is assembled, and the signup cap would bite first.
    """
    account = Account(email=f"crew{index}@example.com")
    session.add(account)
    await session.flush()
    character = Character(
        account_id=account.id,
        username=f"crew{index}",
        display_name=f"Crew {index}",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    session.add(character)
    await session.flush()
    session.add(
        PraxisMember(
            praxis_id=praxis.id,
            character_id=character.id,
            has_submitted=cast,
            submitted_at=datetime.now(timezone.utc) if cast else None,
        )
    )
    await session.commit()
    return character


async def _recipients(session: AsyncSession) -> set[int]:
    """Everyone who actually has a nudge row, straight from the table."""
    result = await session.execute(select(Nudge.to_character_id))
    return set(result.scalars().all())


def _by_recipient(body: list[dict]) -> dict[int, dict]:
    return {entry["to_character_id"]: entry for entry in body}


@pytest_asyncio.fixture
async def crew(
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
) -> dict:
    """``character`` has filed; ``character2`` and one more have not; one has.

    The filed-but-not-the-sender member is the "wrong one": a crew nudge that
    poked them would be a bug the by-value assertions catch.
    """
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    outstanding = await _join(db_session, praxis_collab, 1)
    already_filed = await _join(db_session, praxis_collab, 2, cast=True)
    return {
        "praxis": praxis_collab,
        "sender": character,
        "outstanding": [character2, outstanding],
        "already_filed": already_filed,
    }


# ---------------------------------------------------------------------------
# By value — the right members, and nobody else
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_crew_nudge_pokes_every_outstanding_member_and_nobody_else(
    client: AsyncClient,
    db_session: AsyncSession,
    crew: dict,
    auth_headers: dict,
) -> None:
    praxis = crew["praxis"]
    expected = {member.id for member in crew["outstanding"]}

    response = await client.post(
        f"/praxes/{praxis.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    entries = _by_recipient(response.json())

    assert set(entries) == expected
    for character_id, entry in entries.items():
        assert entry["nudge"] is not None, entry
        assert entry["error"] is None
        assert entry["status_code"] is None
        assert entry["nudge"]["to_character_id"] == character_id
        assert entry["nudge"]["praxis_id"] == praxis.id
        assert entry["nudge"]["created_at"]

    # And the table agrees: the sender did not nudge themselves, and the member
    # who has already filed was left alone.
    assert await _recipients(db_session) == expected


@pytest.mark.asyncio
async def test_the_crew_nudge_lands_in_each_recipients_feed(
    client: AsyncClient,
    crew: dict,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    """Delivery is the feed, same as the single nudge (ADR-0036)."""
    await client.post(f"/praxes/{crew['praxis'].id}/nudge", headers=auth_headers)

    feed = await client.get("/activity-feed", headers=auth_headers2)
    assert feed.status_code == 200
    nudges = [item for item in feed.json()["items"] if item["type"] == "nudge"]
    assert len(nudges) == 1
    assert nudges[0]["actor_display_name"] == character.display_name
    assert nudges[0]["payload"]["praxis_id"] == crew["praxis"].id


@pytest.mark.asyncio
async def test_a_crew_with_nobody_outstanding_nudges_nobody(
    client: AsyncClient,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """Everyone has filed → an empty list, not an error and not a stray poke."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await _set_cast(db_session, praxis_collab.id, character2.id, True)

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.json() == []
    assert await _recipients(db_session) == set()


# ---------------------------------------------------------------------------
# Partial success — the cooldown fails one recipient, not the request
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_recipient_inside_the_cooldown_fails_only_itself(
    client: AsyncClient,
    db_session: AsyncSession,
    crew: dict,
    auth_headers: dict,
) -> None:
    praxis = crew["praxis"]
    already_nudged, still_owed = crew["outstanding"]

    first = await client.post(
        f"/praxes/{praxis.id}/nudge/{already_nudged.id}", headers=auth_headers
    )
    assert first.status_code == 200

    response = await client.post(f"/praxes/{praxis.id}/nudge", headers=auth_headers)
    assert response.status_code == 200, response.text
    entries = _by_recipient(response.json())
    assert set(entries) == {already_nudged.id, still_owed.id}

    refused = entries[already_nudged.id]
    assert refused["nudge"] is None
    assert refused["status_code"] == 422
    assert refused["error"]

    assert entries[still_owed.id]["nudge"] is not None
    assert entries[still_owed.id]["error"] is None

    # A refused poke writes nothing — it must not extend its own window either.
    rows = (await db_session.execute(select(Nudge))).scalars().all()
    assert len(rows) == 2
    assert sorted(row.to_character_id for row in rows) == sorted(
        [already_nudged.id, still_owed.id]
    )


# ---------------------------------------------------------------------------
# Authorisation — the batch-wide verdicts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_sender_who_has_not_filed_cannot_nudge_the_crew(
    client: AsyncClient,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    auth_headers: dict,
) -> None:
    """Rule 1 survives the batch: you may not hurry people you have not caught up
    with, and the refusal is whole-request because it is not per-recipient."""
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 403, response.text
    assert await _recipients(db_session) == set()


@pytest.mark.asyncio
async def test_a_non_member_cannot_nudge_the_crew(
    client: AsyncClient,
    db_session: AsyncSession,
    crew: dict,
    auth_headers3: dict,
) -> None:
    response = await client.post(
        f"/praxes/{crew['praxis'].id}/nudge", headers=auth_headers3
    )
    assert response.status_code == 403, response.text
    assert await _recipients(db_session) == set()


@pytest.mark.asyncio
async def test_the_crew_nudge_is_refused_once_the_praxis_is_published(
    client: AsyncClient,
    db_session: AsyncSession,
    crew: dict,
    auth_headers: dict,
) -> None:
    praxis = crew["praxis"]
    praxis.status = PraxisStatus.submitted
    await db_session.commit()

    response = await client.post(f"/praxes/{praxis.id}/nudge", headers=auth_headers)
    assert response.status_code == 422, response.text
    assert await _recipients(db_session) == set()


@pytest.mark.asyncio
async def test_the_crew_nudge_404s_on_a_praxis_that_is_not_there(
    client: AsyncClient, character: Character, auth_headers: dict
) -> None:
    response = await client.post("/praxes/999999/nudge", headers=auth_headers)
    assert response.status_code == 404, response.text


@pytest.mark.asyncio
async def test_anonymous_cannot_nudge_the_crew(
    client: AsyncClient, praxis_collab: Praxis
) -> None:
    response = await client.post(f"/praxes/{praxis_collab.id}/nudge")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Query count — a crew nudge is not N nudges in a loop
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_crew_nudge_costs_the_same_whatever_the_crew_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """Eight outstanding members cost exactly what two do (#1415).

    Every lookup the batch needs is per-praxis, not per-recipient: the member
    rows arrive with the praxis (``lazy="selectin"``), the cooldown is one
    ``nudged_at_map`` for the whole crew, and the inserts go out in a single
    statement. A loop over ``send_nudge`` would show up here as a difference
    between the two counts.
    """
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    for index in range(SMALL_CREW - 1):
        await _join(db_session, praxis_collab, index)

    with _count_statements(db_connection) as small:
        small_response = await client.post(
            f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
        )
    assert small_response.status_code == 200, small_response.text
    assert len(small_response.json()) == SMALL_CREW
    small_count = len(small)

    # A second praxis, same shape, bigger crew — a fresh one so the first
    # request's own nudges cannot short-circuit the second through the cooldown.
    bigger = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=praxis_collab.type,
        title="Bigger crew",
        body_text="proof",
    )
    db_session.add(bigger)
    await db_session.flush()
    db_session.add(
        PraxisMember(
            praxis_id=bigger.id,
            character_id=character.id,
            has_submitted=True,
            submitted_at=datetime.now(timezone.utc),
        )
    )
    await db_session.commit()
    for index in range(LARGE_CREW):
        await _join(db_session, bigger, 100 + index)

    with _count_statements(db_connection) as large:
        large_response = await client.post(
            f"/praxes/{bigger.id}/nudge", headers=auth_headers
        )
    assert large_response.status_code == 200, large_response.text
    assert len(large_response.json()) == LARGE_CREW
    assert len(large) == small_count, (
        f"{small_count} statements for {SMALL_CREW} recipients but "
        f"{len(large)} for {LARGE_CREW}:\n" + "\n".join(large)
    )
