"""#1497: ``TaskOut.signup_reason`` says why, so the client stops guessing.

Seam: ``build_task_out_for_viewer`` -> ``TaskOut``. Perk holder and non-holder are
both asserted, or "fixed the CTA" is indistinguishable from "removed the gate".
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from services.praxis import (
    SIGNUP_REASON_MULTI_MEMBERSHIP,
    SignupDenialReason,
    gather_signup_facts,
)
from services.task import build_task_out_for_viewer
from tests.integration.factories import make_task

# Real row for the FK; the Double Dipper ability is asserted off the config.
EVERYMEN_SLUG = "everymen"


@pytest_asyncio.fixture
async def faction_everymen(db_session: AsyncSession) -> Faction:
    existing = await db_session.execute(
        select(Faction).where(Faction.slug == EVERYMEN_SLUG)
    )
    found = existing.scalar_one_or_none()
    if found is not None:
        return found
    faction = Faction(slug=EVERYMEN_SLUG, status=FactionStatus.visible)
    db_session.add(faction)
    await db_session.commit()
    await db_session.refresh(faction)
    return faction


async def _seed_praxis(
    db_session: AsyncSession,
    character: Character,
    task: Task,
    status: PraxisStatus = PraxisStatus.in_progress,
) -> Praxis:
    """Returns the row: #2359 asserts on its id."""
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=status,
        title="wip",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()
    return praxis


async def _seed_in_progress_praxis(
    db_session: AsyncSession, character: Character, task: Task
) -> Praxis:
    return await _seed_praxis(db_session, character, task)


async def _make_task(db_session: AsyncSession, author: Character) -> Task:
    return await make_task(
        db_session,
        author,
        title="Another Task",
        description="",
        point_value=5,
        commit=True,
    )
@pytest.mark.asyncio
async def test_perk_holder_already_on_the_task_gets_the_allowed_reason(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    assert CURRENT_ERA.factions[EVERYMEN_SLUG].can_hold_multiple_memberships, (
        "fixture premise: this era grants Double Dipper to Everymen"
    )
    await _seed_in_progress_praxis(db_session, character, active_task)
    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.can_sign_up is True
    assert out.signup_reason == SIGNUP_REASON_MULTI_MEMBERSHIP


@pytest.mark.asyncio
async def test_without_the_perk_the_same_task_still_reads_blocked(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    await _seed_in_progress_praxis(db_session, character, active_task)

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.can_sign_up is False
    assert out.signup_reason == SignupDenialReason.already_active_member.value


@pytest.mark.asyncio
async def test_a_task_never_started_carries_no_reason(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.can_sign_up is True
    assert out.signup_reason is None


@pytest.mark.asyncio
async def test_reason_is_the_same_whether_or_not_the_page_precomputed_facts(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    """#1377: a task outside the page's ``SignupFacts`` must read its own, not
    take absence from the bag as "no membership"."""
    await _seed_in_progress_praxis(db_session, character, active_task)
    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()
    other = await _make_task(db_session, character)

    covered = await gather_signup_facts(
        character, [active_task.id, other.id], db_session
    )
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=covered
        )
    ).signup_reason == SIGNUP_REASON_MULTI_MEMBERSHIP

    uncovered = await gather_signup_facts(character, [other.id], db_session)
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=uncovered
        )
    ).signup_reason == SIGNUP_REASON_MULTI_MEMBERSHIP


# #2359: `TaskOut.in_progress_praxis_id`, so a card can link the draft. Only
# `in_progress` counts, narrower than the denial (which includes pending and
# submitted), so a shut sign-up with a null id is reachable.


@pytest.mark.asyncio
async def test_the_denial_carries_the_draft_it_is_about(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    praxis = await _seed_praxis(db_session, character, active_task)

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.signup_reason == SignupDenialReason.already_active_member.value
    assert out.in_progress_praxis_id == praxis.id


@pytest.mark.asyncio
async def test_a_submitted_praxis_shuts_signup_with_no_draft_to_offer(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    await _seed_praxis(db_session, character, active_task, PraxisStatus.submitted)

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.signup_reason == SignupDenialReason.already_active_member.value
    assert out.in_progress_praxis_id is None


@pytest.mark.asyncio
async def test_a_task_never_started_carries_no_praxis_id(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.in_progress_praxis_id is None


@pytest.mark.asyncio
async def test_the_perk_holder_still_gets_their_draft(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    faction_everymen: Faction,
):
    """Don't source the id from ``active_member_task_ids``: the perk carve-out is
    applied in that SQL and would null it."""
    praxis = await _seed_praxis(db_session, character, active_task)
    character.faction_slug = EVERYMEN_SLUG
    await db_session.commit()

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.signup_reason == SIGNUP_REASON_MULTI_MEMBERSHIP
    assert out.in_progress_praxis_id == praxis.id


@pytest.mark.asyncio
async def test_praxis_id_is_the_same_whether_or_not_the_page_precomputed_facts(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """#1377."""
    praxis = await _seed_praxis(db_session, character, active_task)
    other = await _make_task(db_session, character)

    covered = await gather_signup_facts(
        character, [active_task.id, other.id], db_session
    )
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=covered
        )
    ).in_progress_praxis_id == praxis.id

    uncovered = await gather_signup_facts(character, [other.id], db_session)
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=uncovered
        )
    ).in_progress_praxis_id == praxis.id


# #2643: `TaskOut.submitted_praxis_id`, the filed half of the same denial. The
# case that matters is the leak: somebody else's id must never be here.


@pytest.mark.asyncio
async def test_the_denial_carries_the_filed_praxis_it_is_about(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    praxis = await _seed_praxis(
        db_session, character, active_task, PraxisStatus.submitted
    )

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.signup_reason == SignupDenialReason.already_active_member.value
    assert out.submitted_praxis_id == praxis.id
    # Filed, so its editor would bounce.
    assert out.in_progress_praxis_id is None


@pytest.mark.asyncio
async def test_another_characters_submission_is_never_named(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """The leak case: the query joins ``PraxisMember`` on the requester."""
    other_praxis = await _seed_praxis(
        db_session, character2, active_task, PraxisStatus.submitted
    )

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.submitted_praxis_id is None
    assert out.submitted_praxis_id != other_praxis.id
    assert out.can_sign_up is True


@pytest.mark.asyncio
async def test_a_task_never_submitted_to_carries_no_filed_id(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.submitted_praxis_id is None


@pytest.mark.asyncio
async def test_a_pending_praxis_is_not_something_to_read(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Awaiting moderation: neither a draft to edit nor a filed praxis to read."""
    await _seed_praxis(db_session, character, active_task, PraxisStatus.pending)

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.signup_reason == SignupDenialReason.already_active_member.value
    assert out.submitted_praxis_id is None
    assert out.in_progress_praxis_id is None


@pytest.mark.asyncio
async def test_the_second_submission_is_the_one_offered(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """Most recent wins; re-signing up after filing is a live path."""
    first = await _seed_praxis(
        db_session, character, active_task, PraxisStatus.submitted
    )
    second = await _seed_praxis(
        db_session, character, active_task, PraxisStatus.submitted
    )
    assert second.id > first.id

    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.submitted_praxis_id == second.id


@pytest.mark.asyncio
async def test_filed_id_is_the_same_whether_or_not_the_page_precomputed_facts(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
):
    """#1377."""
    praxis = await _seed_praxis(
        db_session, character, active_task, PraxisStatus.submitted
    )
    other = await _make_task(db_session, character)

    covered = await gather_signup_facts(
        character, [active_task.id, other.id], db_session
    )
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=covered
        )
    ).submitted_praxis_id == praxis.id

    uncovered = await gather_signup_facts(character, [other.id], db_session)
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=uncovered
        )
    ).submitted_praxis_id == praxis.id
