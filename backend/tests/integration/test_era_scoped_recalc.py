"""Era-bounded score recalculation (#1345).

``recalculate_character_stats`` sums the live era's praxes plus votes cast in it
(ADR-0099); a closed era's row is frozen. ``all_time_score`` is the lifetime sum.
"""
from dataclasses import replace
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.invitation_letter import InvitationLetter
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from services.era import apply_era_reset, get_or_create_stats
from services.praxis import moderate_praxis
from services.vote import cast_vote_on_praxis
from tests.integration.factories import DEFAULT_FACTION_SLUG

# Off the fixtures' slug, never a named faction (#2708).
OWN_TASK_MODIFIER: float = CURRENT_ERA.factions[
    DEFAULT_FACTION_SLUG
].own_task_modifier

OTHER_FACTION_SLUG: str = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)

# Must differ, or a broken era bound still yields the right number.
PRIOR_ERA_POINTS: int = 100
CURRENT_ERA_POINTS: int = 10


@pytest_asyncio.fixture
async def prior_era(db_session: AsyncSession, era: Era) -> Era:
    era.started_at = era.started_at - timedelta(days=60)
    await db_session.commit()
    await db_session.refresh(era)
    return era


@pytest_asyncio.fixture
async def current_era(db_session: AsyncSession, prior_era: Era, account) -> Era:
    """Live because ``get_current_era_row`` takes the highest id."""
    row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
        started_at=prior_era.started_at + timedelta(days=30),
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)
    return row


@pytest_asyncio.fixture
async def other_faction(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """Seeded by ``some_faction``."""
    result = await db_session.execute(
        select(Faction).where(Faction.slug == OTHER_FACTION_SLUG)
    )
    return result.scalar_one()


async def _sealed_praxis(
    db_session: AsyncSession,
    character: Character,
    *,
    title: str,
    points: int,
    sealed_at,
    faction_slug: str = DEFAULT_FACTION_SLUG,
    task: Task | None = None,
) -> Praxis:
    if task is None:
        task = Task(
            title=f"Task for {title}",
            description="",
            point_value=points,
            level_required=0,
            status=TaskStatus.active,
            created_by_id=character.id,
            primary_faction_slug=faction_slug,
        )
        db_session.add(task)
        await db_session.flush()

    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title=title,
        body_text="proof",
        submitted_at=sealed_at,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


async def _stats(
    db_session: AsyncSession, character: Character, era_row: Era
) -> CharacterStats:
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_row.id,
        )
    )
    return result.scalar_one()


async def _seed_both_eras(
    db_session: AsyncSession, character: Character, prior_era: Era, current_era: Era
) -> Praxis:
    """One scoring praxis in the closed era, one in the live era. Returns the old one."""
    old = await _sealed_praxis(
        db_session,
        character,
        title="Last era's work",
        points=PRIOR_ERA_POINTS,
        sealed_at=prior_era.started_at + timedelta(days=1),
    )
    await _sealed_praxis(
        db_session,
        character,
        title="This era's work",
        points=CURRENT_ERA_POINTS,
        sealed_at=current_era.started_at + timedelta(minutes=1),
    )
    return old


async def _bank_closed_era(
    db_session: AsyncSession, character: Character, prior_era: Era, score: int
) -> None:
    """A closed era's frozen standing, as the era roll left it."""
    stats = await get_or_create_stats(db_session, character.id, prior_era.id)
    stats.score = score
    stats.level = 1
    character.all_time_score += score
    await db_session.commit()


@pytest.mark.asyncio
async def test_recalc_sums_only_the_live_era_and_never_touches_a_closed_one(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    await _seed_both_eras(db_session, character, prior_era, current_era)
    await _bank_closed_era(db_session, character, prior_era, 777)

    await recalculate_character_stats(character.id, db_session)
    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()

    current_stats = await _stats(db_session, character, current_era)
    assert current_stats.score == round(CURRENT_ERA_POINTS * OWN_TASK_MODIFIER)
    assert (await _stats(db_session, character, prior_era)).score == 777


@pytest.mark.asyncio
async def test_era_reset_does_not_undo_itself_on_the_next_recalc(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    await _sealed_praxis(
        db_session,
        character,
        title="Last era's work",
        points=PRIOR_ERA_POINTS,
        sealed_at=prior_era.started_at + timedelta(days=1),
    )

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert (await _stats(db_session, character, current_era)).score == 0
    assert (await _stats(db_session, character, current_era)).level == 0


@pytest.mark.asyncio
async def test_a_real_era_reset_survives_the_backfill_recalc(
    db_session: AsyncSession,
    character: Character,
    account,
    prior_era: Era,
    some_faction: Faction,
):
    """Score, ``apply_era_reset``, then the admin backfill recalc."""
    await _sealed_praxis(
        db_session,
        character,
        title="Last era's work",
        points=PRIOR_ERA_POINTS,
        sealed_at=prior_era.started_at + timedelta(days=1),
    )
    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()
    banked = (await _stats(db_session, character, prior_era)).score
    assert banked == round(PRIOR_ERA_POINTS * OWN_TASK_MODIFIER)

    new_era = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
    )
    db_session.add(new_era)
    await db_session.flush()
    await apply_era_reset([character], new_era, db_session)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    new_stats = await _stats(db_session, character, new_era)
    assert new_stats.score == 0
    assert new_stats.level == 0
    assert await _life(db_session, character) == banked


async def _life(session: AsyncSession, character: Character) -> int:
    await session.refresh(character)
    return character.all_time_score


@pytest.mark.asyncio
async def test_all_time_score_is_the_lifetime_sum_across_eras(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    await _seed_both_eras(db_session, character, prior_era, current_era)
    await _bank_closed_era(db_session, character, prior_era, 777)

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    current_stats = await _stats(db_session, character, current_era)
    life = await _life(db_session, character)
    assert life == 777 + round(CURRENT_ERA_POINTS * OWN_TASK_MODIFIER)
    assert life > current_stats.score


@pytest.mark.asyncio
async def test_vote_on_past_era_praxis_credits_the_era_it_is_cast_in(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """ADR-0099: the closed era's row is frozen; the live era takes the vote's value."""
    old = await _seed_both_eras(db_session, character, prior_era, current_era)
    await _bank_closed_era(db_session, character, prior_era, 777)
    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    before_current = (await _stats(db_session, character, current_era)).score
    before_all_time = await _life(db_session, character)

    await cast_vote_on_praxis(character2, old.id, 5, db_session)
    await db_session.commit()

    prior_stats = await _stats(db_session, character, prior_era)
    current_stats = await _stats(db_session, character, current_era)
    assert prior_stats.score == 777 and prior_stats.level == 1
    gain = current_stats.score - before_current
    assert gain == 5
    assert await _life(db_session, character) == before_all_time + gain


@pytest.mark.asyncio
async def test_failing_a_closed_era_praxis_leaves_that_era_frozen(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    old = await _seed_both_eras(db_session, character, prior_era, current_era)
    await _bank_closed_era(db_session, character, prior_era, 777)
    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()
    before_current = (await _stats(db_session, character, current_era)).score

    await moderate_praxis(
        old.id, ModerationStatus.failed.value, "Not actually done", db_session
    )
    await db_session.commit()

    assert (await _stats(db_session, character, prior_era)).score == 777
    assert (await _stats(db_session, character, current_era)).score == before_current


@pytest.mark.asyncio
async def test_past_era_recalc_delivers_no_invitation(
    db_session: AsyncSession,
    character: Character,
    character3: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
    other_faction: Faction,
):
    """``character3`` is the live-era control."""
    first_task = Task(
        title="Other-faction task one",
        description="",
        point_value=PRIOR_ERA_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by_id=character.id,
        primary_faction_slug=OTHER_FACTION_SLUG,
    )
    second_task = Task(
        title="Other-faction task two",
        description="",
        point_value=PRIOR_ERA_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by_id=character.id,
        primary_faction_slug=OTHER_FACTION_SLUG,
    )
    db_session.add_all([first_task, second_task])
    await db_session.flush()

    for index, task in enumerate((first_task, second_task)):
        await _sealed_praxis(
            db_session,
            character,
            title=f"Closed-era other {index}",
            points=PRIOR_ERA_POINTS,
            sealed_at=prior_era.started_at + timedelta(days=1),
            task=task,
        )
        await _sealed_praxis(
            db_session,
            character3,
            title=f"Live-era other {index}",
            points=PRIOR_ERA_POINTS,
            sealed_at=current_era.started_at + timedelta(minutes=1),
            task=task,
        )

    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await recalculate_character_stats(character3.id, db_session)
    await db_session.commit()

    letters = await db_session.execute(
        select(InvitationLetter.character_id, InvitationLetter.faction_slug)
    )
    delivered = set(letters.all())
    assert (
        character3.id,
        OTHER_FACTION_SLUG,
    ) in delivered, "control: the thresholds are met"
    assert (character.id, OTHER_FACTION_SLUG) not in delivered


@pytest.mark.asyncio
@pytest.mark.parametrize("reset", [False, True])
async def test_era_start_zeroes_lifetime_score_only_when_the_era_says_so(
    db_session: AsyncSession,
    character: Character,
    account,
    reset: bool,
    some_faction: Faction,
):
    character.all_time_score = 420
    new_era = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
    )
    db_session.add(new_era)
    await db_session.flush()
    era = replace(CURRENT_ERA, reset_all_time_score=reset)
    await apply_era_reset([character], new_era, db_session, era)
    assert character.all_time_score == (0 if reset else 420)
