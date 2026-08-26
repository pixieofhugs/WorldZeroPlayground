"""Integration tests for ADR-0022 faction invitation delivery.

A character earns faction X's InvitationLetter once it has >=
``era.invitation_task_threshold`` completed distinct tasks for X AND >=
``era.invitation_point_threshold`` points from X's tasks. Delivery runs inside
recalculate_character_stats.

Both thresholds and the point values below are read off the era (#2708). They
used to be the literals 2 / 50 / 30, which held only while every solo modifier
was 1.0: an era that pays 0.8 for another faction's task turns "two 30-point
tasks" into 48 points and the letter never arrives.

The shared ``character`` fixture is a member of ``DEFAULT_FACTION_SLUG``, and
#1425 excludes a character's own faction from delivery — so the positive cases
qualify ``OTHER_FACTION_SLUG`` instead, whatever the era makes those two.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import CROSS_FACTION_SLUG, real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Real factions of the live era that the shared ``character`` is NOT in — the
#: only kind that can deliver a letter (#1425). Never named: under one era the
#: fixture's own faction is UA, under another it is the faction that used to
#: stand in for "some other faction" here.
_OTHERS = [
    slug for slug in real_faction_slugs(CURRENT_ERA) if slug != DEFAULT_FACTION_SLUG
]
OTHER_FACTION_SLUG = _OTHERS[0]
THIRD_FACTION_SLUG = _OTHERS[1] if len(_OTHERS) > 1 else None

#: Per-task point values that clear / miss the era's points threshold by a wide
#: margin rather than by one point, so no era's task modifier can flip which
#: side of the line they land on.
QUALIFYING_POINTS = CURRENT_ERA.invitation_point_threshold
SHORT_POINTS = max(
    1,
    CURRENT_ERA.invitation_point_threshold
    // (2 * CURRENT_ERA.invitation_task_threshold),
)


async def _task(
    db_session: AsyncSession, character: Character, faction: str, points: int
) -> Task:
    task = Task(
        title=f"{faction} task {points}",
        description="t",
        point_value=points,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=faction,
    )
    db_session.add(task)
    await db_session.flush()
    return task


async def _submit(db_session: AsyncSession, character: Character, task: Task) -> None:
    db_session.add(Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="proof",
        body_text="proof",
        status=PraxisStatus.submitted,
    ))


async def _letters(db_session: AsyncSession, character: Character) -> set[str]:
    result = await db_session.execute(
        select(InvitationLetter.faction_slug).where(
            InvitationLetter.character_id == character.id
        )
    )
    return {slug for (slug,) in result.all()}


@pytest.mark.asyncio
async def test_two_tasks_and_fifty_points_delivers_letter(
    db_session, character: Character, era: Era, some_faction: Faction
):
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert OTHER_FACTION_SLUG in await _letters(db_session, character)


@pytest.mark.asyncio
async def test_one_task_no_letter(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # Points enough and to spare, but only ONE distinct task → the task
    # threshold is not met.
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert await _letters(db_session, character) == set()


@pytest.mark.asyncio
async def test_below_points_threshold_no_letter(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # Enough distinct tasks, not enough points.
    task = await _task(db_session, character, OTHER_FACTION_SLUG, SHORT_POINTS)
    await _submit(db_session, character, task)
    task = await _task(db_session, character, OTHER_FACTION_SLUG, SHORT_POINTS)
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert await _letters(db_session, character) == set()


@pytest.mark.asyncio
async def test_delivery_is_idempotent(
    db_session, character: Character, era: Era, some_faction: Faction
):
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()
    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    rows = await db_session.execute(
        select(InvitationLetter).where(InvitationLetter.character_id == character.id)
    )
    assert len(rows.scalars().all()) == 1


@pytest.mark.asyncio
@pytest.mark.skipif(
    THIRD_FACTION_SLUG is None, reason="the live era has only one other faction"
)
async def test_faction_scoped_no_bleed(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # Qualify one faction outright; do a single task for another, so the first
    # faction's progress cannot bleed into the second.
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    task = await _task(
        db_session, character, THIRD_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    letters = await _letters(db_session, character)
    assert OTHER_FACTION_SLUG in letters
    assert THIRD_FACTION_SLUG not in letters


@pytest.mark.asyncio
async def test_own_faction_never_delivers(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # #1425: the `character` fixture is IN its own faction. Doing that faction's
    # tasks — the most ordinary thing a player does — must not invite them to the
    # faction they already hold,
    # while an *other* faction they also qualify for still delivers.
    own_task = await _task(
        db_session, character, DEFAULT_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, own_task)
    own_task = await _task(
        db_session, character, DEFAULT_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, own_task)
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    task = await _task(
        db_session, character, OTHER_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert await _letters(db_session, character) == {OTHER_FACTION_SLUG}


@pytest.mark.asyncio
async def test_leaving_without_a_defection_record_reopens_former_faction_invite(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # #1425: the guard keys on the faction held at DELIVERY time, not on history.
    # Qualify the fixture's own faction while still in it (no letter), then move
    # away — that faction's letter is now
    # a legitimate re-invitation and must arrive on the next recalc.
    #
    # The move here is a bare slug write, NOT `defect_to_faction`, so no
    # FactionDefectionHistory row exists and the faction is still joinable. That
    # is the
    # whole reason the letter is legitimate: since #2218 a recorded defection
    # from a faction that cannot be rejoined suppresses delivery instead — see
    # test_faction_invitation_retirement.py.
    own_task = await _task(
        db_session, character, DEFAULT_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, own_task)
    own_task = await _task(
        db_session, character, DEFAULT_FACTION_SLUG, QUALIFYING_POINTS
    )
    await _submit(db_session, character, own_task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()
    assert DEFAULT_FACTION_SLUG not in await _letters(db_session, character)

    character.faction_slug = OTHER_FACTION_SLUG
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert DEFAULT_FACTION_SLUG in await _letters(db_session, character)


@pytest.mark.asyncio
async def test_sentinel_faction_never_delivers(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # 2 distinct na tasks, 60 pts — na is a sentinel and must never yield a letter.
    task = await _task(db_session, character, CROSS_FACTION_SLUG, QUALIFYING_POINTS)
    await _submit(db_session, character, task)
    task = await _task(db_session, character, CROSS_FACTION_SLUG, QUALIFYING_POINTS)
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert "na" not in await _letters(db_session, character)
