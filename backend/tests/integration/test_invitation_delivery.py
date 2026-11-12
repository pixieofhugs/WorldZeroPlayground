"""ADR-0022 invitation delivery (inside ``recalculate_character_stats``).

Thresholds come from the era (#2708). Own faction never delivers (#1425), so
positive cases qualify ``OTHER_FACTION_SLUG``.
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

_OTHERS = [
    slug for slug in real_faction_slugs(CURRENT_ERA) if slug != DEFAULT_FACTION_SLUG
]
OTHER_FACTION_SLUG = _OTHERS[0]
THIRD_FACTION_SLUG = _OTHERS[1] if len(_OTHERS) > 1 else None

#: Wide margins, so no era's task modifier flips which side they land on.
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
    # #1425.
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
    # #1425: keyed on the faction held at delivery time. A bare slug write (not
    # `defect_to_faction`) leaves no defection record, so the faction is still
    # joinable; a recorded one suppresses delivery (#2218).
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
    task = await _task(db_session, character, CROSS_FACTION_SLUG, QUALIFYING_POINTS)
    await _submit(db_session, character, task)
    task = await _task(db_session, character, CROSS_FACTION_SLUG, QUALIFYING_POINTS)
    await _submit(db_session, character, task)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert "na" not in await _letters(db_session, character)
