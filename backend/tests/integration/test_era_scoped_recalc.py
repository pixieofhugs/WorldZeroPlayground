"""Era-bounded score recalculation (#1345).

Seam under test: the praxis gather inside
:func:`services.character_stats.recalculate_character_stats`. It must sum only
the praxes sealed inside the window of the era whose ``CharacterStats`` row it
is writing — ``[era.started_at, next_era.started_at)`` — instead of every
praxis ever filed, which is what let an era reset silently undo itself on the
next recalc.

Two companion seams ride along, both settled by the owner rulings on #1345:
:func:`services.vote.cast_or_update_vote` credits *the praxis's* era rather
than the live one, and ``all_time_score`` is the lifetime cumulative sum across
eras (era 1's 500 plus era 2's 30 is 530) rather than a best-single-era figure.
"""
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
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
from services.era import apply_era_reset
from services.praxis import moderate_praxis
from services.vote import cast_vote_on_praxis

# Read the modifier from the era config rather than hardcoding it (ADR-0042).
UA_OWN_TASK_MODIFIER: float = CURRENT_ERA.factions["ua"].own_task_modifier

# Deliberately different per-era totals: if the prior era's work were worth the
# same as this era's, a broken era bound would still produce the right number.
PRIOR_ERA_POINTS: int = 100
CURRENT_ERA_POINTS: int = 10


# ---------------------------------------------------------------------------
# Fixtures — two Era rows, so there is a closed era and a live one
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def prior_era(db_session: AsyncSession, era: Era) -> Era:
    """The conftest ``era`` row, backdated so a later era can succeed it."""
    era.started_at = era.started_at - timedelta(days=60)
    await db_session.commit()
    await db_session.refresh(era)
    return era


@pytest_asyncio.fixture
async def current_era(db_session: AsyncSession, prior_era: Era, account) -> Era:
    """The live Era row — ``get_current_era_row`` takes the highest id."""
    row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
        started_at=prior_era.started_at + timedelta(days=30),
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)
    return row


@pytest_asyncio.fixture
async def faction_wow(db_session: AsyncSession) -> Faction:
    """A faction the test characters are *not* in, so invites can be earned."""
    result = await db_session.execute(select(Faction).where(Faction.slug == "wow"))
    if result.scalar_one_or_none() is None:
        db_session.add(Faction(slug="wow", status=FactionStatus.visible))
        await db_session.commit()
    result = await db_session.execute(select(Faction).where(Faction.slug == "wow"))
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _sealed_praxis(
    db_session: AsyncSession,
    character: Character,
    *,
    title: str,
    points: int,
    sealed_at,
    faction_slug: str = "ua",
    task: Task | None = None,
) -> Praxis:
    """A submitted solo praxis with its seal time pinned, on its own task."""
    if task is None:
        task = Task(
            title=f"Task for {title}",
            description="",
            point_value=points,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
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


# ---------------------------------------------------------------------------
# 1. The era bound itself
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_recalc_sums_only_the_era_whose_row_it_writes(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """The live-era recalc ignores a prior era's praxis (lower bound), and a
    prior-era recalc ignores this era's (upper bound)."""
    await _seed_both_eras(db_session, character, prior_era, current_era)

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    current_stats = await _stats(db_session, character, current_era)
    assert current_stats.score == round(CURRENT_ERA_POINTS * UA_OWN_TASK_MODIFIER)

    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()

    prior_stats = await _stats(db_session, character, prior_era)
    assert prior_stats.score == round(PRIOR_ERA_POINTS * UA_OWN_TASK_MODIFIER)
    current_stats = await _stats(db_session, character, current_era)
    assert current_stats.score == round(CURRENT_ERA_POINTS * UA_OWN_TASK_MODIFIER)


@pytest.mark.asyncio
async def test_era_reset_does_not_undo_itself_on_the_next_recalc(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """The reported symptom: a fresh era's zeroed row stays zero until this era
    earns something, no matter how much the character banked last era."""
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
    """The reported flow end to end: score, reset through
    :func:`services.era.apply_era_reset`, then run the recalc the admin
    backfill runs. The new era starts at zero and lifetime keeps the history."""
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
    assert banked == round(PRIOR_ERA_POINTS * UA_OWN_TASK_MODIFIER)

    new_era = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
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
    assert new_stats.all_time_score == banked


# ---------------------------------------------------------------------------
# 2. all_time_score stays lifetime-scoped
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_all_time_score_is_the_lifetime_sum_across_eras(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """Bounding the gather must not delete history: all-time is both eras' scores."""
    await _seed_both_eras(db_session, character, prior_era, current_era)

    await recalculate_character_stats(character.id, db_session)
    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()

    current_stats = await _stats(db_session, character, current_era)
    expected = round(PRIOR_ERA_POINTS * UA_OWN_TASK_MODIFIER) + round(
        CURRENT_ERA_POINTS * UA_OWN_TASK_MODIFIER
    )
    assert current_stats.all_time_score == expected
    assert current_stats.all_time_score > current_stats.score


# ---------------------------------------------------------------------------
# 3. A vote on a closed era's praxis (owner ruling 3)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_vote_on_past_era_praxis_credits_that_era_not_this_one(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """Past-era praxes stay votable; the vote moves the historical record and
    the lifetime figure, never the ladder anyone is climbing today."""
    old = await _seed_both_eras(db_session, character, prior_era, current_era)

    await recalculate_character_stats(character.id, db_session)
    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()

    before_current = await _stats(db_session, character, current_era)
    before_score = before_current.score
    before_level = before_current.level
    before_all_time = before_current.all_time_score
    before_prior_score = (await _stats(db_session, character, prior_era)).score

    await cast_vote_on_praxis(character2, old.id, 5, db_session)
    await db_session.commit()

    prior_stats = await _stats(db_session, character, prior_era)
    current_stats = await _stats(db_session, character, current_era)

    gain = prior_stats.score - before_prior_score
    assert gain > 0, "the closed era's own row must record the vote"
    assert current_stats.score == before_score
    assert current_stats.level == before_level
    assert current_stats.all_time_score == before_all_time + gain


@pytest.mark.asyncio
async def test_failing_a_past_era_praxis_debits_that_era(
    db_session: AsyncSession,
    character: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    """Every praxis-scoped recalc asks the same question as the vote path. A
    moderation ruling on closed-era work has to reach the closed era's row —
    #1373's "a failed praxis loses its points" must not become a no-op there."""
    old = await _seed_both_eras(db_session, character, prior_era, current_era)

    await recalculate_character_stats(character.id, db_session)
    await recalculate_character_stats(character.id, db_session, era_row=prior_era)
    await db_session.commit()

    before_current = await _stats(db_session, character, current_era)
    before_score = before_current.score
    before_all_time = before_current.all_time_score
    before_prior_score = (await _stats(db_session, character, prior_era)).score

    await moderate_praxis(
        old.id, ModerationStatus.failed.value, "Not actually done", db_session
    )
    await db_session.commit()

    prior_stats = await _stats(db_session, character, prior_era)
    current_stats = await _stats(db_session, character, current_era)
    assert prior_stats.score == 0
    assert current_stats.score == before_score
    assert current_stats.all_time_score == before_all_time - before_prior_score


# ---------------------------------------------------------------------------
# 4. Invitations belong to the era being played (owner ruling: guard delivery)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_past_era_recalc_delivers_no_invitation(
    db_session: AsyncSession,
    character: Character,
    character3: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
    faction_wow: Faction,
):
    """Recomputing a closed era must not hand out a faction invite now. The
    control character does the same two tasks in the live era and does get one."""
    first_task = Task(
        title="WOW task one",
        description="",
        point_value=PRIOR_ERA_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="wow",
    )
    second_task = Task(
        title="WOW task two",
        description="",
        point_value=PRIOR_ERA_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="wow",
    )
    db_session.add_all([first_task, second_task])
    await db_session.flush()

    for index, task in enumerate((first_task, second_task)):
        await _sealed_praxis(
            db_session,
            character,
            title=f"Closed-era wow {index}",
            points=PRIOR_ERA_POINTS,
            sealed_at=prior_era.started_at + timedelta(days=1),
            task=task,
        )
        await _sealed_praxis(
            db_session,
            character3,
            title=f"Live-era wow {index}",
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
    assert (character3.id, "wow") in delivered, "control: the thresholds are met"
    assert (character.id, "wow") not in delivered
