"""An era rollover retires the board, and history survives it (#1619 B4).

Seam under test: ``services.era.apply_era_reset`` → ``task.status``. Before this
change the function had no ``Task`` reference at all, so every task — active,
pending, metatask — survived a rollover fully claimable. An empty
``ERA_2_TASKS`` only stops the *seeder* adding more; it says nothing about what
is already there.

Retire, not delete: ``praxis.task_id`` is NOT NULL, so a delete would strand or
destroy history. These tests pin both halves — the board goes dark, and a praxis
authored against a now-retired task still resolves its task.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from seed import ONBOARDING_TASK_TITLE, ensure_onboarding_task
from services.era import apply_era_reset


async def _close_era(
    session: AsyncSession, account: Account, characters: list[Character]
) -> Era:
    """Append the next Era row and run the reset — what ``PUT /admin/era/reset`` does."""
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset(characters, new_era_row, session)
    return new_era_row


async def _seed_board(session: AsyncSession, character: Character) -> dict[str, Task]:
    """Every task shape a rollover can find: active, pending, metatask, retired."""
    board = {
        "active": Task(
            title="Board Active",
            description="claimable today",
            point_value=10,
            level_required=1,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug="ua",
        ),
        "pending": Task(
            title="Board Pending",
            description="a proposal awaiting approval",
            point_value=10,
            level_required=1,
            status=TaskStatus.pending,
            created_by=character.id,
            primary_faction_slug="ua",
        ),
        "metatask": Task(
            title="Board Metatask",
            description="applied to another praxis",
            point_value=5,
            level_required=1,
            status=TaskStatus.active,
            task_type=TaskType.metatask,
            created_by=character.id,
            primary_faction_slug="ua",
            metatask_faction_slug="ua",
        ),
        "already_retired": Task(
            title="Board Already Retired",
            description="retired last era",
            point_value=10,
            level_required=1,
            status=TaskStatus.retired,
            created_by=character.id,
            primary_faction_slug="ua",
        ),
    }
    for task in board.values():
        session.add(task)
    await session.flush()
    return board


async def _statuses_by_title(session: AsyncSession) -> dict[str, TaskStatus]:
    result = await session.execute(select(Task.title, Task.status))
    return {title: status for title, status in result.all()}


@pytest.mark.asyncio
async def test_era_reset_retires_every_task_but_the_onboarding_one(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """The board goes dark; the one task a newcomer needs stays lit."""
    await _seed_board(db_session, character)
    assert await ensure_onboarding_task(db_session, character.id) is True

    await _close_era(db_session, account, [character])

    statuses = await _statuses_by_title(db_session)
    assert statuses[ONBOARDING_TASK_TITLE] == TaskStatus.active
    retired = {
        title: status
        for title, status in statuses.items()
        if title != ONBOARDING_TASK_TITLE
    }
    assert retired, "the fixture board must not be empty"
    assert all(status == TaskStatus.retired for status in retired.values()), retired


@pytest.mark.asyncio
async def test_era_reset_leaves_the_onboarding_task_untouched_on_a_second_rollover(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    """Re-running the sweep must not fight the seeder (#511)."""
    await ensure_onboarding_task(db_session, character.id)

    first_era = await _close_era(db_session, account, [character])
    await _close_era(db_session, account, [character])

    statuses = await _statuses_by_title(db_session)
    assert statuses[ONBOARDING_TASK_TITLE] == TaskStatus.active
    assert first_era.id  # the two rollovers really were distinct rows


@pytest.mark.asyncio
async def test_praxis_on_a_retired_task_still_resolves_its_task(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    active_task: Task,
):
    """Retire, not delete: ``praxis.task_id`` is NOT NULL and must stay resolvable."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Proof from the old era",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()

    await _close_era(db_session, account, [character])
    await db_session.refresh(praxis)

    task = (
        await db_session.execute(select(Task).where(Task.id == praxis.task_id))
    ).scalar_one()
    assert task.status == TaskStatus.retired
    assert praxis.task_id == active_task.id
