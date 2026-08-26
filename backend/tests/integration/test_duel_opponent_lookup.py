"""#596 — a duel praxis card names its opponent, without an N+1.

**The seam under test** is :func:`services.praxis_out.duel_opponents_for`: the
batched other-side lookup that gives a duel side a path to its rival's name.
A duel is two separate ``Praxis`` rows joined by a ``Duel`` row (ADR-0011), so a
duel side's own ``members`` holds only its own submitter — there is no path to
the other side on the praxis row itself.

Three things are pinned here, and they are different kinds of claim:

- **resolution** — a settled duel maps in BOTH directions off one ``Duel`` row,
  so two rivals adjacent in a feed each name the other.
- **the pending window** — ``Duel.opponent_praxis_id`` is NULL until the
  challenge is accepted, so a challenger has nobody to name. The praxis is
  ABSENT from the map rather than present with a blank name: the card falls back
  to the duel mode chip alone, which is what shipped before this lookup existed.
  This is the case the owner ruling called out as the one to get right.
- **cost** — the whole page costs ONE query, whatever the page size. The ruling
  was explicit that this must not become an N+1, and this repo has measured
  ``/tasks`` at ~300 queries a page once (#1371). A count assertion is the only
  thing that keeps that true, because a per-card version would be invisible at
  the call site and pass every other test in this file.
"""
from contextlib import contextmanager

import pytest
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import ModerationStatus, Praxis, PraxisStatus, PraxisType
from models.task import Task
from services.praxis_out import build_praxis_card_out, duel_opponents_for
from tests.integration.factories import make_task


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


async def _make_task(db_session: AsyncSession, author: Character) -> Task:
    # `ua` is the only faction the shared fixtures seed a row for, and the
    # slug is not what is under test here — the lookup never reads it.
    return await make_task(
        db_session,
        author,
        title="Wheatpaste an original poem on a condemned wall",
        description="",
        level_required=1,
    )
async def _make_praxis(db_session: AsyncSession, task: Task, author: Character) -> Praxis:
    """A duel side is stored ``type='solo'`` (ADR-0011) — there is no
    ``type='duel'`` row, which is exactly why the card cannot gate on type."""
    praxis = Praxis(
        task_id=task.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        moderation_status=ModerationStatus.visible,
        created_by_id=author.id,
    )
    db_session.add(praxis)
    await db_session.flush()
    return praxis


async def _load_card(session: AsyncSession, praxis_id: int):
    """The card wire for one praxis — the single-card path, which resolves its
    own opponent rather than reading a precomputed page-wide map."""
    result = await session.execute(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .options(
            selectinload(Praxis.task),
            selectinload(Praxis.created_by),
            selectinload(Praxis.members),
            selectinload(Praxis.media_items),
        )
    )
    return await build_praxis_card_out(result.scalar_one(), session, viewer=None)


@pytest.mark.asyncio
async def test_settled_duel_maps_both_directions(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """Each side names the other, off the one Duel row."""
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    opponent_praxis = await _make_praxis(db_session, task, character2)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.flush()

    opponents = await duel_opponents_for(
        [challenger_praxis, opponent_praxis], db_session
    )

    assert opponents[challenger_praxis.id].praxis_id == opponent_praxis.id
    assert opponents[challenger_praxis.id].display_name == character2.display_name
    assert opponents[challenger_praxis.id].faction_slug == character2.faction_slug
    assert opponents[opponent_praxis.id].praxis_id == challenger_praxis.id
    assert opponents[opponent_praxis.id].display_name == character.display_name


@pytest.mark.asyncio
async def test_one_side_on_the_page_still_resolves(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """The ordinary feed case: only one of the two rivals is on this page."""
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    opponent_praxis = await _make_praxis(db_session, task, character2)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.flush()

    opponents = await duel_opponents_for([challenger_praxis], db_session)

    assert set(opponents) == {challenger_praxis.id}
    assert opponents[challenger_praxis.id].display_name == character2.display_name


@pytest.mark.asyncio
async def test_pending_duel_names_nobody(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """THE CASE THE RULING CALLED OUT.

    ``Duel.opponent_praxis_id`` is NULL until the challenge is accepted. The
    challenged character is knowable — ``opponent_character_id`` is set from the
    start — but naming someone who has not accepted asserts a contest that does
    not exist: if they decline, this reverts to an ordinary solo praxis. So the
    praxis is absent from the map and the card shows the mode chip alone.

    The outer joins in the lookup are what make this an absence rather than a
    dropped row; an inner join would lose the challenger entirely.
    """
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=None,
            status=DuelStatus.pending,
        )
    )
    await db_session.flush()

    opponents = await duel_opponents_for([challenger_praxis], db_session)

    assert challenger_praxis.id not in opponents


@pytest.mark.asyncio
async def test_resolved_duel_still_names_the_opponent(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """A past duel keeps its rival's name after the era froze it (ADR-0052) —
    the same status set :func:`services.praxis_out.duel_id_map` uses, so a card
    that still reads as a duel still says who it was against."""
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    opponent_praxis = await _make_praxis(db_session, task, character2)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.resolved,
        )
    )
    await db_session.flush()

    opponents = await duel_opponents_for([challenger_praxis], db_session)

    assert opponents[challenger_praxis.id].display_name == character2.display_name


@pytest.mark.asyncio
async def test_declined_duel_names_nobody(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """A declined challenge reverts to a plain solo praxis (ADR-0011), and the
    Duel row is kept only for history. Excluded from the status set, so the card
    names nobody — it is not a duel any more."""
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=None,
            status=DuelStatus.declined,
        )
    )
    await db_session.flush()

    assert await duel_opponents_for([challenger_praxis], db_session) == {}


@pytest.mark.asyncio
async def test_non_duel_praxis_is_absent(
    db_session: AsyncSession,
    character: Character,
    era: Era,
) -> None:
    task = await _make_task(db_session, character)
    solo = await _make_praxis(db_session, task, character)

    assert await duel_opponents_for([solo], db_session) == {}


@pytest.mark.asyncio
async def test_costs_one_query_whatever_the_page_size(
    db_session: AsyncSession,
    db_connection,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """The guard against this re-growing into a per-card join.

    Six duels, twelve sides, one SELECT — and the same one SELECT for a single
    side. A version that looked up each praxis's opponent individually would
    pass every other test in this file.
    """
    task = await _make_task(db_session, character)
    sides: list[Praxis] = []
    for _ in range(6):
        challenger_praxis = await _make_praxis(db_session, task, character)
        opponent_praxis = await _make_praxis(db_session, task, character2)
        db_session.add(
            Duel(
                task_id=task.id,
                challenger_praxis_id=challenger_praxis.id,
                opponent_character_id=character2.id,
                opponent_praxis_id=opponent_praxis.id,
                status=DuelStatus.settled,
            )
        )
        sides.extend([challenger_praxis, opponent_praxis])
    await db_session.flush()

    with _count_selects(db_connection) as large_page:
        opponents = await duel_opponents_for(sides, db_session)
    with _count_selects(db_connection) as small_page:
        await duel_opponents_for(sides[:1], db_session)

    # Every side resolved — the batch is not trading correctness for the count.
    assert len(opponents) == len(sides)
    assert len(large_page) == 1
    assert len(large_page) == len(small_page)


# ── #2128: the rival's portrait rides the same lookup ──────────────────────


@pytest.mark.asyncio
async def test_lookup_carries_the_rivals_portrait(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """#2128 — the duel banner shows faces, not initials.

    The rival's avatar is the FOURTH field resolved on this path, off the same
    single statement as the name and the faction slug: the aliased author joins
    are already there, so this is one more selected column, not one more query
    (``test_costs_one_query_whatever_the_page_size`` is what keeps that true).
    """
    character2.avatar_url = "avatars/pallas.png"
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    opponent_praxis = await _make_praxis(db_session, task, character2)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.flush()

    opponents = await duel_opponents_for(
        [challenger_praxis, opponent_praxis], db_session
    )

    assert opponents[challenger_praxis.id].avatar_url == "avatars/pallas.png"
    # Both directions, off the one row — the challenger has no portrait.
    assert opponents[opponent_praxis.id].avatar_url == ""


@pytest.mark.asyncio
async def test_card_wire_carries_the_rivals_portrait(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """The wire seam #2128 needs: ``PraxisCardOut.opponent_avatar_url``.

    Gated exactly as the other three are — populated when there is a rival to
    name, "" otherwise — so the banner keeps reading ``opponent_display_name``
    for whether to draw at all, and this field only for what to draw.
    """
    character2.avatar_url = "avatars/pallas.png"
    task = await _make_task(db_session, character)
    challenger_praxis = await _make_praxis(db_session, task, character)
    opponent_praxis = await _make_praxis(db_session, task, character2)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character2.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.flush()

    card = await _load_card(db_session, challenger_praxis.id)

    assert card.opponent_display_name == character2.display_name
    assert card.opponent_avatar_url == "avatars/pallas.png"


@pytest.mark.asyncio
async def test_card_wire_has_no_portrait_without_a_rival(
    db_session: AsyncSession,
    character: Character,
    era: Era,
) -> None:
    """A plain solo praxis: no rival, so "" — never a stale or invented path."""
    task = await _make_task(db_session, character)
    solo = await _make_praxis(db_session, task, character)

    card = await _load_card(db_session, solo.id)

    assert card.opponent_display_name is None
    assert card.opponent_avatar_url == ""
