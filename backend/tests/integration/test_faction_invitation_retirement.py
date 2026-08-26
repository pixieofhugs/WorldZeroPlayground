"""#2218 — leaving a faction retires the invitation letter you can no longer use.

The bug as reported: switch from faction A to faction B and the bell immediately
offers you an invitation to rejoin A, which ``defect_to_faction`` refuses with
``ErrorCode.faction_rejoin_forbidden``. The letter was hours old; the bell fired
at the moment of the switch, because ADR-0070 reads "answered" off the character
— a letter for the faction you already hold asks nothing, so walking out re-arms
it as an unanswered request.

Seam under test: the faction-defection service (``defect_to_faction``) and the
invitation-delivery service (``recalculate_character_stats``), i.e. the two
places that write ``InvitationLetter``. One test also asserts at the
``/activity-feed`` route, because the bell is the reported symptom and a row
assertion alone would not prove it went quiet.

Every faction rule here is read from ``CURRENT_ERA`` rather than assumed.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from services.faction_service import defect_to_faction

# Two ordinary, non-rejoinable factions — the report's Coven -> Everymen ->
# Singularity walk. Picked from the live era rather than hardcoded so a faction
# rename in era config fails loudly here instead of silently passing.
LEFT_SLUG = "snide"
FIRST_SLUG = "wow"
# Never joined, never left — the control that proves the bell is really reading
# this character's letters when the retired one is missing from it.
UNTOUCHED_SLUG = "coven"
REJOINABLE_SLUG = "albescent"


async def _seed_faction(db_session: AsyncSession, slug: str) -> None:
    if await db_session.scalar(select(Faction).where(Faction.slug == slug)) is None:
        db_session.add(Faction(slug=slug, status=FactionStatus.visible))
        await db_session.flush()


async def _letter(
    db_session: AsyncSession, character: Character, era: Era, slug: str
) -> None:
    """Hand the character faction ``slug``'s letter — the #454 entry ticket."""
    await _seed_faction(db_session, slug)
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
    """Join ``LEFT_SLUG``, then leave it for ``FIRST_SLUG`` — the reported walk."""
    await _letter(db_session, character, era, LEFT_SLUG)
    await _letter(db_session, character, era, FIRST_SLUG)
    await db_session.commit()

    await defect_to_faction(character, LEFT_SLUG, db_session)
    await db_session.commit()
    await defect_to_faction(character, FIRST_SLUG, db_session)
    await db_session.commit()


def test_premise_the_left_faction_cannot_be_rejoined():
    """The whole bug: the offered action is one the API refuses."""
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
    # The letter for the faction they now hold is untouched — it is not an
    # invitation to anywhere they cannot go.
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
    """The reported symptom, on the requests tab the bell badge counts."""
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
    # Control first: without this, an empty feed would pass the assertion below
    # for the wrong reason.
    assert UNTOUCHED_SLUG in offered
    assert LEFT_SLUG not in offered
    # The badge is the bell: it counts the same windowed query.
    assert body["counts"]["by_type"]["invitation_letter"] == 1


@pytest.mark.asyncio
async def test_a_retired_letter_does_not_come_back_on_the_next_recalc(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    """Deleting the row alone is not a fix: delivery recomputes from era history.

    ``_deliver_earned_invitations`` re-reads every era praxis on every recalc, so
    the thresholds that earned the letter are still met after the walk-out. Any
    vote would post it straight back through the letterbox.
    """
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
    """``can_always_rejoin`` is the exception: that invitation still works."""
    await _letter(db_session, character, era, REJOINABLE_SLUG)
    await _letter(db_session, character, era, FIRST_SLUG)
    character.faction_slug = REJOINABLE_SLUG
    await db_session.commit()

    await defect_to_faction(character, FIRST_SLUG, db_session)
    await db_session.commit()

    assert REJOINABLE_SLUG in await _held_slugs(db_session, character)
