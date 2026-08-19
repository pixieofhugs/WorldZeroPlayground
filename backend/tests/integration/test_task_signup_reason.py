"""#1497 — ``TaskOut.signup_reason``: the server says *why*, the client stops guessing.

**The seam under test is the wire**: :func:`services.task.build_task_out_for_viewer`
→ :class:`schemas.task.TaskOut`. #1359 stopped the browse SQL hiding a task an
Everymen character may legitimately claim again, but the response still carried no
way to tell "you have never started this" from "you are already on this and your
faction lets you go again". The frontend re-derived that from its own membership
state — the client-side mirror of a server rule that #1385 deleted elsewhere.

Both halves are asserted: the perk holder gets an *allowed* reason, and a
character **without** the perk still gets the blocked one. Without both, the suite
cannot tell "fixed the CTA" from "removed the gate".
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
from models.task import Task, TaskStatus, TaskType
from services.praxis import (
    SIGNUP_REASON_MULTI_MEMBERSHIP,
    SignupDenialReason,
    gather_signup_facts,
)
from services.task import build_task_out_for_viewer
from tests.integration.factories import make_task

# The faction Era 1 grants Double Dipper to. Needed as a real row for the FK; the
# *ability* is asserted off the config below, never assumed from the slug.
EVERYMEN_SLUG = "everymen"


@pytest_asyncio.fixture
async def faction_everymen(db_session: AsyncSession) -> Faction:
    """The 'everymen' faction row — its Double Dipper ability is the point here."""
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
    """One praxis of ``status`` for ``character`` on ``task``, membership and all.

    Returns the row because #2359 asserts on its *id*: the wire now carries the
    draft the denial is about, so a test that only knew "a praxis exists" could
    not tell the right id from any id.
    """
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
    faction_ua: Faction,
    faction_everymen: Faction,
):
    """Double Dipper: sign-up is open, and the wire says why — "begin again"."""
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
    faction_ua: Faction,
):
    """The other half — remove the gate and this is what fails."""
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
    faction_ua: Faction,
    faction_everymen: Faction,
):
    """A plain first claim is not "again" — even for the perk holder."""
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
    faction_ua: Faction,
    faction_everymen: Faction,
):
    """#1377's property, extended to the new fact.

    A list route gathers :class:`SignupFacts` once per page; a task **outside**
    that page must fall back to its own read rather than take the absence of an
    id from the bag as "no membership". Passing facts gathered for a different
    task is exactly that case, and it must not silently downgrade the reason.
    """
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

    # Facts gathered for a page this task is not on: the id is absent from the
    # bag for the *wrong* reason, so the builder must go and look.
    uncovered = await gather_signup_facts(character, [other.id], db_session)
    assert (
        await build_task_out_for_viewer(
            active_task, character, db_session, signup_facts=uncovered
        )
    ).signup_reason == SIGNUP_REASON_MULTI_MEMBERSHIP


# ---------------------------------------------------------------------------
# #2359 — the same seam, one field further on: `TaskOut.in_progress_praxis_id`.
#
# `already_active_member` told the card a fact and offered it nothing, because
# the card had no way to reach the draft the denial is about. The task DETAIL
# page could: it fetches the viewer's own `status=in_progress` praxes and finds
# this task among them. A feed of cards cannot pay for that per row, so the id
# rides along on the row the card already has.
#
# The population is the DETAIL PAGE'S, deliberately — `in_progress` only. The
# denial's own population is wider (`in_progress`, `pending`, `submitted`), so a
# submitted praxis shuts sign-up with no draft behind it and the field is null.
# That is the state the card falls back to a plain label for, and it is
# reachable, not theoretical.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_denial_carries_the_draft_it_is_about(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    faction_ua: Faction,
):
    """The blocked reason and the way out of it arrive on the same row."""
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
    faction_ua: Faction,
):
    """The reachable null: shut, but there is nothing to edit."""
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
    faction_ua: Faction,
):
    out = await build_task_out_for_viewer(active_task, character, db_session)

    assert out.in_progress_praxis_id is None


@pytest.mark.asyncio
async def test_the_perk_holder_still_gets_their_draft(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    faction_ua: Faction,
    faction_everymen: Faction,
):
    """Double Dipper empties the *blocking* set; it does not hide the draft.

    Sourcing the id from ``active_member_task_ids`` would have made this null —
    the carve-out is applied in that SQL — and an Everymen player would have
    been the one group with a draft the wire refused to name. The field answers
    "do I have a draft here", which no ability changes.
    """
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
    faction_ua: Faction,
):
    """#1377's property again, for the new fact — absence from the bag is not "no"."""
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
