"""#1130 — the ``can_sign_up`` task-browse filter must agree with ``evaluate_signup``.

**The seam under test** is ``services.task.list_tasks(can_sign_up=True)`` — a set
of SQL predicates — against :func:`services.praxis.evaluate_signup`, the single
sign-up predicate (ADR-0008). The filter re-expresses that predicate in SQL
because calling it per task is an N+1 on the page #1218 exists to speed up, so
the only thing worth asserting is that the two never disagree.

Parity is asserted over the rows the browse can return **at all**
(``can_sign_up=False`` with identical filters), not over every ``Task`` row. The
``exclude_character_id`` clause that supplies gate 5 is unconditional and has no
Everymen "Double Dipper" carve-out, while :func:`is_active_member_of_task` does
— so a task an Everymen character may legitimately claim a second time is
already absent from the browse before this filter runs. Comparing against the
browse's own candidate set keeps the assertion about *this* filter rather than
that pre-existing asymmetry.
"""
from dataclasses import replace

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from services.era import get_or_create_stats
from services.praxis import evaluate_signup
from services.task import list_tasks


@pytest_asyncio.fixture
async def faction_wow(db_session: AsyncSession) -> Faction:
    """The 'wow' faction row — its `level_jump_reach=1` is the whole point here."""
    existing = await db_session.execute(select(Faction).where(Faction.slug == "wow"))
    found = existing.scalar_one_or_none()
    if found is not None:
        return found
    faction = Faction(slug="wow", status=FactionStatus.visible)
    db_session.add(faction)
    await db_session.commit()
    await db_session.refresh(faction)
    return faction


async def _make_task(
    db_session: AsyncSession,
    author: Character,
    *,
    title: str,
    level_required: int = 0,
    status: TaskStatus = TaskStatus.active,
    task_type: TaskType = TaskType.standard,
) -> Task:
    task = Task(
        title=title,
        description="",
        point_value=5,
        level_required=level_required,
        status=status,
        task_type=task_type,
        created_by=author.id,
        # Every row is 'ua' so the faction axis never varies: the abilities under
        # test key off the *character's* faction, not the task's.
        primary_faction_slug="ua",
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


async def _seed_in_progress_praxis(
    db_session: AsyncSession, character: Character, task: Task
) -> None:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="wip",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()


async def _set_level(
    db_session: AsyncSession,
    character: Character,
    era_row: Era,
    *,
    level: int,
    level_jump_used_at_level: int | None = None,
) -> None:
    stats = await get_or_create_stats(db_session, character.id, era_row.id)
    stats.level = level
    stats.level_jump_used_at_level = level_jump_used_at_level
    await db_session.commit()


async def _assert_parity(
    db_session: AsyncSession,
    viewer: Character,
    era_config: EraConfig,
) -> set[int]:
    """The filtered browse == the unfiltered browse minus what evaluate_signup rejects."""
    common = dict(
        status="all",
        task_type="all",
        viewer=viewer,
        era=era_config,
        limit=200,
    )
    candidates = await list_tasks(db_session, can_sign_up=False, **common)
    expected = {
        task.id
        for task in candidates
        if (await evaluate_signup(viewer, task, db_session, era_config)).allowed
    }
    filtered = await list_tasks(db_session, can_sign_up=True, **common)
    assert {task.id for task in filtered} == expected
    return expected


@pytest.mark.asyncio
async def test_parity_matrix_level_jump_available(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    faction_wow: Faction,
):
    """A WOW character at level 6 reaches level 7 — and nothing above it."""
    character.faction_slug = "wow"
    await db_session.commit()
    # Level 6 clears era.level_to_see_metatasks, so the metatask row below is
    # visible to the browse and gate 1 is the only thing that can drop it.
    await _set_level(db_session, character, era, level=6)

    at_level = await _make_task(db_session, character, title="at", level_required=6)
    one_up = await _make_task(db_session, character, title="up", level_required=7)
    two_up = await _make_task(db_session, character, title="far", level_required=8)
    metatask = await _make_task(
        db_session, character, title="meta", task_type=TaskType.metatask
    )
    retired = await _make_task(
        db_session, character, title="retired", status=TaskStatus.retired
    )
    pending = await _make_task(
        db_session, character, title="pending", status=TaskStatus.pending
    )

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert at_level.id in eligible
    assert one_up.id in eligible, "the unspent level jump must reach one level up"
    assert two_up.id not in eligible
    assert metatask.id not in eligible
    assert retired.id not in eligible
    assert pending.id not in eligible


@pytest.mark.asyncio
async def test_parity_matrix_level_jump_spent(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    faction_wow: Faction,
):
    """Spending the jump at this level makes the level-7 row ineligible again."""
    character.faction_slug = "wow"
    await db_session.commit()
    await _set_level(
        db_session, character, era, level=6, level_jump_used_at_level=6
    )

    at_level = await _make_task(db_session, character, title="at", level_required=6)
    one_up = await _make_task(db_session, character, title="up", level_required=7)

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert at_level.id in eligible
    assert one_up.id not in eligible


@pytest.mark.asyncio
async def test_parity_matrix_ephemerists_retired_task(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    faction_ephemerists: Faction,
):
    """Ephemerists reach retired rows; a 'ua' character in the same set does not."""
    retired = await _make_task(
        db_session, character, title="retired", status=TaskStatus.retired
    )
    active = await _make_task(db_session, character, title="active")

    ua_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert retired.id not in ua_eligible
    assert active.id in ua_eligible

    character.faction_slug = "ephemerists"
    await db_session.commit()

    ephemerist_eligible = await _assert_parity(db_session, character, CURRENT_ERA)
    assert retired.id in ephemerist_eligible


@pytest.mark.asyncio
async def test_parity_matrix_bank_full_returns_nothing(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    faction_ua: Faction,
):
    """Gate 6 is a gate on *you*: at the cap the filter returns an empty list.

    It is not expressible as a per-task predicate, so the filter has to
    short-circuit — and `evaluate_signup` agrees by rejecting every row.
    """
    await _seed_in_progress_praxis(db_session, character, active_task)
    await _make_task(db_session, character, title="tempting")
    capped = replace(CURRENT_ERA, max_task_signups=1)

    eligible = await _assert_parity(db_session, character, capped)
    assert eligible == set()


@pytest.mark.asyncio
async def test_active_member_task_is_filtered_out(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    faction_ua: Faction,
):
    """Gate 5 — the task you are already working is not one you can sign up for."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character, title="free")

    eligible = await _assert_parity(db_session, character, CURRENT_ERA)

    assert active_task.id not in eligible
    assert other.id in eligible


@pytest.mark.asyncio
async def test_anonymous_viewer_gets_nothing(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
):
    """`evaluate_signup` refuses anonymous viewers, so the filter returns empty.

    The toggle is hidden when logged out; this pins the backend's own answer so
    a caller that sends the flag anyway cannot get a misleading list.
    """
    await _make_task(db_session, character, title="visible")

    filtered = await list_tasks(
        db_session, can_sign_up=True, viewer=None, status="all", task_type="all"
    )
    assert filtered == []
