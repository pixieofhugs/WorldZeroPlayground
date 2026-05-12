"""Integration tests for ``services.praxis.can_submit_praxis_for_task``.

This helper drives the frontend ``can_submit_praxis`` flag on TaskOut. It must
combine every signup gate so the UI can hide the "Sign up" button when the
viewer would not actually be allowed through. Hides, never disables (per
CLAUDE.md "Hide unusable controls").
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisType
from models.task import Task, TaskType
from services.praxis import can_submit_praxis_for_task


# ---------------------------------------------------------------------------
# Anonymous viewer
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_anonymous_cannot_submit(
    db_session: AsyncSession, active_task: Task
) -> None:
    """No authenticated character means no signup affordance."""
    assert (
        await can_submit_praxis_for_task(None, active_task, db_session)
        is False
    )


# ---------------------------------------------------------------------------
# Duplicate authorship
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_duplicate_authorship_blocks_non_analog(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    praxis_solo: Praxis,
    era: Era,
) -> None:
    """A non-Analog character who already authors a non-withdrawn praxis is blocked."""
    assert character.faction_slug != "analog"
    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is False
    )


@pytest.mark.asyncio
async def test_analog_double_dipper_allowed_despite_duplicate(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
) -> None:
    """Analog characters bypass the duplicate-authorship gate (Double Dipper perk)."""
    # Seed the analog faction row and re-faction the character.
    db_session.add(
        Faction(
            slug="analog",
            name="Analog",
            description="Test",
            status=FactionStatus.visible,
        )
    )
    await db_session.commit()

    character.faction_slug = "analog"
    await db_session.commit()

    # Author a prior, non-withdrawn praxis on the task.
    db_session.add(
        Praxis(
            task_id=active_task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title="Prior",
            body_text="prior",
        )
    )
    await db_session.commit()

    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is True
    )


# ---------------------------------------------------------------------------
# Level gate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_level_too_low_blocks_signup(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
) -> None:
    """A character below ``task.level_required`` cannot sign up."""
    # Bump task requirement above the character's level (default fixture level=0).
    active_task.level_required = 5
    await db_session.commit()

    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is False
    )


# ---------------------------------------------------------------------------
# Faction eligibility (metatasks)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_metatask_faction_mismatch_blocks_signup(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
) -> None:
    """Metatask rows require matching ``metatask_faction_slug`` on the character."""
    # Seed a different faction the character does NOT belong to.
    db_session.add(
        Faction(
            slug="other",
            name="Other",
            description="Test",
            status=FactionStatus.visible,
        )
    )
    await db_session.commit()

    active_task.task_type = TaskType.metatask
    active_task.metatask_faction_slug = "other"
    await db_session.commit()

    assert character.faction_slug != "other"
    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is False
    )


# ---------------------------------------------------------------------------
# Active membership (invited collaborator)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_active_member_of_other_praxis_blocks_signup(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
) -> None:
    """A character who is a non-submitted member of an in-progress praxis on this
    task cannot start a new one — even if they are not the author. Covers the
    invited-to-collab case."""
    # character2 authors a collab; character is invited as a (non-submitted) member.
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.collab,
        title="Collab",
        body_text="collab",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(
                praxis_id=praxis.id,
                character_id=character2.id,
                has_submitted=False,
            ),
            PraxisMember(
                praxis_id=praxis.id,
                character_id=character.id,
                has_submitted=False,
            ),
        ]
    )
    await db_session.commit()

    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is False
    )


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_eligible_character_can_submit(
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
) -> None:
    """No prior praxis, level OK, faction OK, no concurrent membership: True."""
    # Default fixture: level 0, level_required 0, standard task, ua faction.
    assert (
        await can_submit_praxis_for_task(character, active_task, db_session)
        is True
    )
