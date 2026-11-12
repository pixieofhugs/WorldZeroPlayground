"""#2218 — leaving a faction retires the invitation letter you can no longer use.

ADR-0070 reads "answered" off the character's faction, so walking out re-arms the
old letter as a request ``defect_to_faction`` would refuse. Seams: the two
``InvitationLetter`` writers (defection and ``recalculate_character_stats``).
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    real_faction_slugs,
)
from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from services.faction_service import defect_to_faction

#: Left, joined instead, and an untouched control; in era order, never named (#2708).
_ROSTER = real_faction_slugs(CURRENT_ERA)
LEFT_SLUG, FIRST_SLUG, UNTOUCHED_SLUG = _ROSTER[0], _ROSTER[1], _ROSTER[2]
#: Always rejoinable in every era (ADR-0087).
REJOINABLE_SLUG = ALBESCENT_FACTION_SLUG


async def _letter(
    db_session: AsyncSession, character: Character, era: Era, slug: str
) -> None:
    db_session.add(
        InvitationLetter(character_id=character.id, faction_slug=slug, era_id=era.id)
    )
    await db_session.flush()


async def _held_slugs(db_session: AsyncSession, character: Character) -> set[str]:
    result = await db_session.execute(
        select(InvitationLetter.faction_slug).where(
            InvitationLetter.character_id == character.id
        )
    )
    return {slug for (slug,) in result.all()}


async def _walk_out_of(
    db_session: AsyncSession, character: Character, era: Era
) -> None:
    """Join ``LEFT_SLUG``, then leave for ``FIRST_SLUG``.

    Starts unaffiliated (ADR-0019): the fixture's faction may be ``LEFT_SLUG``.
    """
    character.faction_slug = UNAFFILIATED_FACTION_SLUG
    await _letter(db_session, character, era, LEFT_SLUG)
    await _letter(db_session, character, era, FIRST_SLUG)
    await db_session.commit()

    await defect_to_faction(character, LEFT_SLUG, db_session)
    await db_session.commit()
    await defect_to_faction(character, FIRST_SLUG, db_session)
    await db_session.commit()


def test_premise_the_left_faction_cannot_be_rejoined():
    assert CURRENT_ERA.factions[LEFT_SLUG].can_always_rejoin is False
    assert CURRENT_ERA.factions[FIRST_SLUG].can_always_rejoin is False
    assert CURRENT_ERA.factions[REJOINABLE_SLUG].can_always_rejoin is True


@pytest.mark.asyncio
async def test_leaving_retires_the_unusable_letter(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    await _walk_out_of(db_session, character, era)

    held = await _held_slugs(db_session, character)
    assert LEFT_SLUG not in held
    assert FIRST_SLUG in held


@pytest.mark.asyncio
async def test_the_bell_stops_offering_the_rejoin(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    await _letter(db_session, character, era, UNTOUCHED_SLUG)
    await db_session.commit()
    await _walk_out_of(db_session, character, era)

    response = await client.get(
        "/activity-feed",
        params={"filter": "requests", "limit": 100},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    offered = {
        item["payload"]["faction_slug"]
        for item in body["items"]
        if item["type"] == "invitation_letter"
    }
    assert UNTOUCHED_SLUG in offered  # control: an empty feed would pass below
    assert LEFT_SLUG not in offered
    assert body["counts"]["by_type"]["invitation_letter"] == 1


@pytest.mark.asyncio
async def test_a_retired_letter_does_not_come_back_on_the_next_recalc(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    """Delivery recomputes from era history, so deleting the row alone is no fix."""
    await _walk_out_of(db_session, character, era)

    points = CURRENT_ERA.invitation_point_threshold
    for index in range(CURRENT_ERA.invitation_task_threshold):
        task = Task(
            title=f"{LEFT_SLUG} task {index}",
            description="t",
            point_value=points,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug=LEFT_SLUG,
        )
        db_session.add(task)
        await db_session.flush()
        db_session.add(
            Praxis(
                task_id=task.id,
                created_by_id=character.id,
                type=PraxisType.solo,
                title="proof",
                body_text="proof",
                status=PraxisStatus.submitted,
            )
        )
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    assert LEFT_SLUG not in await _held_slugs(db_session, character)


@pytest.mark.asyncio
async def test_a_rejoinable_faction_keeps_its_letter(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    await _letter(db_session, character, era, REJOINABLE_SLUG)
    await _letter(db_session, character, era, FIRST_SLUG)
    character.faction_slug = REJOINABLE_SLUG
    await db_session.commit()

    await defect_to_faction(character, FIRST_SLUG, db_session)
    await db_session.commit()

    assert REJOINABLE_SLUG in await _held_slugs(db_session, character)
