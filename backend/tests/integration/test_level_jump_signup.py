"""#811 — the WOW level-jump allowance, end to end through the sign-up gate.

The unit rule lives in tests/unit/test_level_jump.py. This file asserts the
things only the real path can show: that the allowance is actually spent on
sign-up, that it is never refunded, and that levelling up restores it — all via
``evaluate_signup``/``create_praxis``, the gate every mode shares.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import PraxisType
from models.task import Task, TaskStatus
from services.praxis import (
    SignupDenialReason,
    create_praxis,
    delete_praxis,
    evaluate_signup,
)

WOW = "wow"
JUMPER_LEVEL = 3


@pytest.fixture
async def faction_wow(db_session: AsyncSession, faction_ua: Faction) -> Faction:
    db_session.add(Faction(slug=WOW, status=FactionStatus.visible))
    await db_session.commit()
    result = await db_session.execute(select(Faction).where(Faction.slug == WOW))
    return result.scalar_one()


async def _set_faction_and_level(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_slug: str,
    level: int = JUMPER_LEVEL,
) -> CharacterStats:
    character.faction_slug = faction_slug
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await db_session.commit()
    return stats


async def _make_task(
    db_session: AsyncSession, character: Character, level_required: int
) -> Task:
    task = Task(
        title=f"Level {level_required} task",
        description="",
        point_value=10,
        level_required=level_required,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


# --- the gate ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_wow_may_sign_up_one_level_above(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    await _set_faction_and_level(db_session, character, era, WOW)
    task = await _make_task(db_session, character, JUMPER_LEVEL + 1)

    result = await evaluate_signup(character, task, db_session)
    assert result.allowed is True


@pytest.mark.asyncio
async def test_wow_may_never_reach_two_levels_above(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    await _set_faction_and_level(db_session, character, era, WOW)
    task = await _make_task(db_session, character, JUMPER_LEVEL + 2)

    result = await evaluate_signup(character, task, db_session)
    assert result.allowed is False
    assert result.reason == SignupDenialReason.below_level


@pytest.mark.asyncio
async def test_non_wow_can_never_sign_up_above_their_level(
    db_session: AsyncSession, character: Character, era: Era, faction_ua: Faction
):
    await _set_faction_and_level(db_session, character, era, "ua")
    task = await _make_task(db_session, character, JUMPER_LEVEL + 1)

    result = await evaluate_signup(character, task, db_session)
    assert result.allowed is False
    assert result.reason == SignupDenialReason.below_level


# --- spending it ------------------------------------------------------------

@pytest.mark.asyncio
async def test_the_allowance_is_spent_once_and_not_twice_at_the_same_level(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    stats = await _set_faction_and_level(db_session, character, era, WOW)
    first = await _make_task(db_session, character, JUMPER_LEVEL + 1)
    second = await _make_task(db_session, character, JUMPER_LEVEL + 1)

    await create_praxis(first.id, PraxisType.solo, character.id, db_session)
    await db_session.refresh(stats)
    assert stats.level_jump_used_at_level == JUMPER_LEVEL

    result = await evaluate_signup(character, second, db_session)
    assert result.allowed is False
    assert result.reason == SignupDenialReason.below_level


@pytest.mark.asyncio
async def test_signing_up_at_or_below_own_level_does_not_spend_it(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    stats = await _set_faction_and_level(db_session, character, era, WOW)
    ordinary = await _make_task(db_session, character, JUMPER_LEVEL)

    await create_praxis(ordinary.id, PraxisType.solo, character.id, db_session)
    await db_session.refresh(stats)
    assert stats.level_jump_used_at_level is None

    above = await _make_task(db_session, character, JUMPER_LEVEL + 1)
    assert (await evaluate_signup(character, above, db_session)).allowed is True


@pytest.mark.asyncio
async def test_the_allowance_returns_after_levelling_up(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    stats = await _set_faction_and_level(db_session, character, era, WOW)
    first = await _make_task(db_session, character, JUMPER_LEVEL + 1)
    await create_praxis(first.id, PraxisType.solo, character.id, db_session)

    # Level up. Nothing clears the stamp — the comparison simply stops matching.
    stats.level = JUMPER_LEVEL + 1
    await db_session.commit()

    higher = await _make_task(db_session, character, JUMPER_LEVEL + 2)
    assert (await evaluate_signup(character, higher, db_session)).allowed is True


@pytest.mark.asyncio
async def test_abandoning_the_praxis_does_not_refund_the_allowance(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    """Settled default in #811: otherwise it could be farmed by backing out."""
    stats = await _set_faction_and_level(db_session, character, era, WOW)
    task = await _make_task(db_session, character, JUMPER_LEVEL + 1)

    praxis = await create_praxis(task.id, PraxisType.solo, character.id, db_session)
    await delete_praxis(praxis.id, character.id, db_session)
    await db_session.refresh(stats)

    assert stats.level_jump_used_at_level == JUMPER_LEVEL
    retry = await _make_task(db_session, character, JUMPER_LEVEL + 1)
    assert (await evaluate_signup(character, retry, db_session)).allowed is False


@pytest.mark.asyncio
async def test_defecting_from_wow_loses_the_ability(
    db_session: AsyncSession, character: Character, era: Era, faction_wow: Faction
):
    await _set_faction_and_level(db_session, character, era, WOW)
    task = await _make_task(db_session, character, JUMPER_LEVEL + 1)
    assert (await evaluate_signup(character, task, db_session)).allowed is True

    character.faction_slug = "ua"
    await db_session.commit()
    assert (await evaluate_signup(character, task, db_session)).allowed is False
