"""Integration tests for ADR-0022 faction invitation delivery.

A character earns faction X's InvitationLetter once it has >= invitation_task_threshold
(2) completed distinct tasks for X AND >= invitation_point_threshold (50) points from X's
tasks. Delivery runs inside recalculate_character_stats. Every Era 1 solo-task modifier is
1.0, so point_value maps 1:1 to points here.

The shared ``character`` fixture is a member of ``ua``, and #1425 excludes a character's own
faction from delivery — so the positive cases below qualify ``snide`` instead.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats


async def _task(db_session: AsyncSession, character: Character, faction: str, points: int) -> Task:
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


async def _seed_faction(db_session: AsyncSession, slug: str) -> None:
    if await db_session.scalar(select(Faction).where(Faction.slug == slug)) is None:
        db_session.add(Faction(slug=slug, status=FactionStatus.visible))
        await db_session.flush()


@pytest.mark.asyncio
async def test_two_tasks_and_fifty_points_delivers_letter(
    db_session, character: Character, era: Era, some_faction: Faction
):
    await _seed_faction(db_session, "snide")
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert "snide" in await _letters(db_session, character)


@pytest.mark.asyncio
async def test_one_task_no_letter(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # 60 points but only ONE distinct task → task threshold (2) not met.
    await _seed_faction(db_session, "snide")
    task = await _task(db_session, character, "snide", 30)
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
    # 2 distinct tasks but only 40 points (< 50).
    await _seed_faction(db_session, "snide")
    await _submit(db_session, character, await _task(db_session, character, "snide", 20))
    await _submit(db_session, character, await _task(db_session, character, "snide", 20))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert await _letters(db_session, character) == set()


@pytest.mark.asyncio
async def test_delivery_is_idempotent(
    db_session, character: Character, era: Era, some_faction: Faction
):
    await _seed_faction(db_session, "snide")
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
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
async def test_faction_scoped_no_bleed(
    db_session, character: Character, era: Era, some_faction: Faction
):
    await _seed_faction(db_session, "snide")
    await _seed_faction(db_session, "wow")
    # Qualify snide (2 tasks, 60 pts); only 1 wow task (no bleed of snide progress into wow).
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await _submit(db_session, character, await _task(db_session, character, "wow", 30))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    letters = await _letters(db_session, character)
    assert "snide" in letters
    assert "wow" not in letters


@pytest.mark.asyncio
async def test_own_faction_never_delivers(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # #1425: the `character` fixture is IN ua. Doing ua tasks — the most ordinary
    # thing a player does — must not invite them to the faction they already hold,
    # while an *other* faction they also qualify for still delivers.
    await _seed_faction(db_session, "snide")
    await _submit(db_session, character, await _task(db_session, character, "ua", 30))
    await _submit(db_session, character, await _task(db_session, character, "ua", 30))
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await _submit(db_session, character, await _task(db_session, character, "snide", 30))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert await _letters(db_session, character) == {"snide"}


@pytest.mark.asyncio
async def test_leaving_without_a_defection_record_reopens_former_faction_invite(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # #1425: the guard keys on the faction held at DELIVERY time, not on history.
    # Qualify ua while in ua (no letter), then move to snide — ua's letter is now
    # a legitimate re-invitation and must arrive on the next recalc.
    #
    # The move here is a bare slug write, NOT `defect_to_faction`, so no
    # FactionDefectionHistory row exists and ua is still joinable. That is the
    # whole reason the letter is legitimate: since #2218 a recorded defection
    # from a faction that cannot be rejoined suppresses delivery instead — see
    # test_faction_invitation_retirement.py.
    await _seed_faction(db_session, "snide")
    await _submit(db_session, character, await _task(db_session, character, "ua", 30))
    await _submit(db_session, character, await _task(db_session, character, "ua", 30))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()
    assert "ua" not in await _letters(db_session, character)

    character.faction_slug = "snide"
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert "ua" in await _letters(db_session, character)


@pytest.mark.asyncio
async def test_sentinel_faction_never_delivers(
    db_session, character: Character, era: Era, some_faction: Faction
):
    # 2 distinct na tasks, 60 pts — na is a sentinel and must never yield a letter.
    await _submit(db_session, character, await _task(db_session, character, "na", 30))
    await _submit(db_session, character, await _task(db_session, character, "na", 30))
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert "na" not in await _letters(db_session, character)
