"""#596 — a duel card names its opponent via ``duel_opponents_for``, no N+1.

A duel is two ``Praxis`` rows joined by a ``Duel`` row (ADR-0011), so the praxis
row has no path to the rival. A pending duel is ABSENT from the map (card falls
back to the mode chip); the whole page costs ONE query (#1371).
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
    return await make_task(
        db_session,
        author,
        title="Wheatpaste an original poem on a condemned wall",
        description="",
        level_required=1,
    )
async def _make_praxis(db_session: AsyncSession, task: Task, author: Character) -> Praxis:
    """A duel side is stored ``type='solo'`` (ADR-0011): can't gate on type."""
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
    """Single-card path: resolves its own opponent, no page-wide map."""
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
    """Naming an unaccepted opponent would assert a contest that may never exist.

    Outer joins make this an absence, not a dropped challenger.
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
    """Same status set as ``duel_id_map`` (ADR-0052)."""
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
    """A declined challenge reverts to solo (ADR-0011); the row is history only."""
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

    assert len(opponents) == len(sides)
    assert len(large_page) == 1
    assert len(large_page) == len(small_page)


@pytest.mark.asyncio
async def test_lookup_carries_the_rivals_portrait(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """#2128 — the avatar is one more column on the same single query."""
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
    assert opponents[opponent_praxis.id].avatar_url == ""


@pytest.mark.asyncio
async def test_card_wire_carries_the_rivals_portrait(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
) -> None:
    """#2128: the banner gates on ``opponent_display_name``, draws this field."""
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
    task = await _make_task(db_session, character)
    solo = await _make_praxis(db_session, task, character)

    card = await _load_card(db_session, solo.id)

    assert card.opponent_display_name is None
    assert card.opponent_avatar_url == ""
