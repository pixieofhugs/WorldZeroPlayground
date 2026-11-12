"""#1861: ``TaskOut.start_here``, the field all onboarding consumers read.

Not era-scoped: an era-scoped "completed it" would relight the mark for every
player at each rollover (see the era-reset test).
"""
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from seed import ONBOARDING_TASK_SEED_KEY, ensure_onboarding_task
from services.era import apply_era_reset
from services.task import build_task_out_for_viewer
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest_asyncio.fixture
async def onboarding_task(db_session: AsyncSession, character: Character) -> Task:
    await ensure_onboarding_task(db_session, character.id)
    result = await db_session.execute(
        select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
    )
    return result.scalar_one()


async def _complete(
    db_session: AsyncSession, character: Character, task: Task, era: Era
) -> None:
    """Stamps ``era_id`` as ``_apply_seal`` does (#1398); NULL would hide an
    era-scoped rule."""
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="a photograph of myself",
        submitted_at=datetime.now(timezone.utc),
        era_id=era.id,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(
        PraxisMember(
            praxis_id=praxis.id,
            character_id=character.id,
            has_submitted=True,
            submitted_at=praxis.submitted_at,
        )
    )
    await db_session.commit()


async def _roll_the_era(
    db_session: AsyncSession, account: Account, characters: list[Character]
) -> None:
    new_era_row = Era(name="Era 2", config_key="era_1", started_by=account.id)
    db_session.add(new_era_row)
    await db_session.flush()
    await apply_era_reset(characters, new_era_row, db_session)
    await db_session.commit()


@pytest.mark.asyncio
async def test_a_character_who_has_never_completed_it_carries_the_mark(
    db_session: AsyncSession,
    character: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    out = await build_task_out_for_viewer(onboarding_task, character, db_session)

    assert out.start_here is True


@pytest.mark.asyncio
async def test_completing_it_puts_the_mark_out(
    db_session: AsyncSession,
    character: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    await _complete(db_session, character, onboarding_task, era)

    out = await build_task_out_for_viewer(onboarding_task, character, db_session)

    assert out.start_here is False


@pytest.mark.asyncio
async def test_the_mark_stays_dark_across_an_era_reset(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Spec § The hand-off."""
    await _complete(db_session, character, onboarding_task, era)
    await _roll_the_era(db_session, account, [character])

    out = await build_task_out_for_viewer(onboarding_task, character, db_session)

    assert out.start_here is False


@pytest.mark.asyncio
async def test_an_in_progress_claim_is_not_a_completion(
    db_session: AsyncSession,
    character: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    praxis = Praxis(
        task_id=onboarding_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="wip",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()

    out = await build_task_out_for_viewer(onboarding_task, character, db_session)

    assert out.start_here is True


@pytest.mark.asyncio
async def test_another_character_completion_does_not_put_out_my_mark(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Character-level, not account-level (ADR-0041)."""
    await _complete(db_session, character2, onboarding_task, era)

    out = await build_task_out_for_viewer(onboarding_task, character, db_session)

    assert out.start_here is True


@pytest.mark.asyncio
async def test_an_ordinary_task_never_carries_the_mark(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.start_here is False


@pytest.mark.asyncio
async def test_a_player_task_sharing_the_onboarding_title_carries_no_mark(
    db_session: AsyncSession,
    character: Character,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Identity is ``seed_key``, not title (#3064)."""
    player_task = Task(
        title=onboarding_task.title,
        description="A player-authored task that collides by coincidence.",
        point_value=5,
        level_required=1,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(player_task)
    await db_session.flush()

    out = await build_task_out_for_viewer(player_task, character, db_session)
    assert out.start_here is False

    out = await build_task_out_for_viewer(onboarding_task, character, db_session)
    assert out.start_here is True


@pytest.mark.asyncio
async def test_an_anonymous_viewer_sees_no_mark(
    db_session: AsyncSession,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    out = await build_task_out_for_viewer(onboarding_task, None, db_session)

    assert out.start_here is False
