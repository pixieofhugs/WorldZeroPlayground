"""#1861 — ``TaskOut.start_here``: the onboarding task marks itself.

**The seam under test is the wire**: :func:`services.task.build_task_out_for_viewer`
→ :class:`schemas.task.TaskOut`. One derived boolean with three consumers — the
*start here* mark wherever the task appears, ``CreateCharacter``'s hand-off
destination, and the ``/start`` flow's stop condition. The spec's "one rule, two
consumers, consistent by construction" only holds if all three read the same
field, so the field is what these tests pin, not any one caller.

The load-bearing test is :func:`test_the_mark_stays_dark_across_an_era_reset`.
An era rollover drops every character to level 0 and retires the whole board
except this one task, so an **era-scoped** "has completed it" would relight the
mark for the entire playerbase at every rollover. ``Praxis`` carries no
``era_id`` filter here on purpose (era membership is a seal-time fact,
``services/era.get_era_row_for_praxis``), which is why the honest rule costs no
new storage. A test that only ever sees one era proves none of that.
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
from models.task import Task
from seed import ONBOARDING_TASK_TITLE, ensure_onboarding_task
from services.era import apply_era_reset
from services.task import build_task_out_for_viewer


@pytest_asyncio.fixture
async def onboarding_task(db_session: AsyncSession, character: Character) -> Task:
    """The one game-wide level-0 task, seeded exactly as ``seed.py`` seeds it."""
    await ensure_onboarding_task(db_session, character.id)
    result = await db_session.execute(
        select(Task).where(Task.title == ONBOARDING_TASK_TITLE)
    )
    return result.scalar_one()


async def _complete(
    db_session: AsyncSession, character: Character, task: Task, era: Era
) -> None:
    """Publish a praxis on ``task`` — the one event that puts the mark out.

    ``submitted_at`` and ``era_id`` are stamped exactly as
    ``services.collab_consensus._apply_seal`` stamps them (#1398), and that is
    load-bearing for :func:`test_the_mark_stays_dark_across_an_era_reset`: an
    era-scoped rule would most naturally join on ``Praxis.era_id``, and a
    fixture that left the column NULL could not tell such a rule from this one.
    """
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
    """What ``PUT /admin/era/reset`` does: append the next Era row and reset."""
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
    """The whole reason the rule is not era-scoped (spec § The hand-off)."""
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
    """Claiming is not finishing — the flow must not stop applying on a claim."""
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
    """Character-level, not account-level (ADR-0041) — a second life starts lit."""
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
    """The other half — without this, "never completed" marks the whole board."""
    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.start_here is False


@pytest.mark.asyncio
async def test_an_anonymous_viewer_sees_no_mark(
    db_session: AsyncSession,
    onboarding_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Viewer-relative, so it defaults safe like every other flag on TaskOut."""
    out = await build_task_out_for_viewer(onboarding_task, None, db_session)

    assert out.start_here is False
