"""A vote on a collab praxis must move **every** member's score (#1465).

Seam under test: :func:`services.vote.cast_or_update_vote` — the one function
behind both ``POST /praxes/{id}/vote`` outcomes (a new cast and a re-rate). It
recalculated ``praxis.created_by_id`` only, so on a collab the starter moved and
every co-member's ``CharacterStats`` stayed at whatever the last *other* trigger
left it at.

A one-member fixture cannot see this defect at all — solo praxes have exactly
one member, who *is* ``created_by_id``. Every test here uses a two-member collab
with a third-party voter, and asserts on the **non-starter**.

``all_time_score`` rides along because #1345 made it a credited-forward delta
rather than a re-derived sum: a member who is never recalculated never accrues,
so the loss does not self-heal on a later pass.
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from services.vote import cast_vote_on_praxis

# Read the modifier from the era config rather than hardcoding it (ADR-0042).
UA_COLLAB_OWN_MODIFIER: float = CURRENT_ERA.factions["ua"].collab_own_modifier

# A point value big enough that the pre-vote baseline is comfortably non-zero:
# if a member's expected delta were 0, a broken fix would pass.
COLLAB_TASK_POINTS: int = 40

FIRST_VOTE_VALUE: int = 5
RE_RATED_VOTE_VALUE: int = 1


def _expected_member_score(points_from_votes: int) -> int:
    """What every member of the fixture collab is worth. Votes are flat and
    un-split: each member banks the praxis's whole tally (ADR-0014)."""
    return round(COLLAB_TASK_POINTS * UA_COLLAB_OWN_MODIFIER + points_from_votes)


@pytest_asyncio.fixture
async def collab_task(db_session: AsyncSession, character: Character) -> Task:
    task = Task(
        title="A task worth collaborating on",
        description="",
        point_value=COLLAB_TASK_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug="ua",
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest_asyncio.fixture
async def submitted_collab(
    db_session: AsyncSession,
    collab_task: Task,
    character: Character,
    character3: Character,
) -> Praxis:
    """A sealed two-member collab: ``character`` started it, ``character3`` did not.

    ``character3`` is the one every assertion below is really about — the member
    the vote path never looked at.
    """
    praxis = Praxis(
        task_id=collab_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="Two of us",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(
                praxis_id=praxis.id, character_id=character.id, has_submitted=True
            ),
            PraxisMember(
                praxis_id=praxis.id, character_id=character3.id, has_submitted=True
            ),
        ]
    )
    await db_session.commit()
    await db_session.refresh(praxis)

    # Baseline: both members already banked the un-voted collab, so the defect
    # shows up as a missing *delta* rather than as a member who never scored.
    for member in (character, character3):
        await recalculate_character_stats(member.id, db_session)
    await db_session.commit()
    return praxis


async def _stats(
    db_session: AsyncSession, character_id: int, era_row: Era
) -> CharacterStats:
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_row.id,
        )
    )
    return result.scalar_one()


@pytest.mark.asyncio
async def test_baseline_both_members_bank_the_unvoted_collab(
    db_session: AsyncSession,
    character: Character,
    character3: Character,
    submitted_collab: Praxis,
    era: Era,
    some_faction: Faction,
):
    """Control. Both members score the collab equally before any vote, so a
    later assertion about one of them moving is about the vote, not the seal."""
    baseline = _expected_member_score(0)
    assert baseline > 0, "fixture must produce a non-zero baseline"
    assert (await _stats(db_session, character.id, era)).score == baseline
    assert (await _stats(db_session, character3.id, era)).score == baseline


@pytest.mark.asyncio
async def test_a_vote_on_a_collab_moves_every_member_not_just_the_starter(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    submitted_collab: Praxis,
    era: Era,
    some_faction: Faction,
):
    """The reported symptom: your collaborator's praxis gains votes and your own
    score does not move."""
    await cast_vote_on_praxis(character2, submitted_collab.id, FIRST_VOTE_VALUE, db_session)
    await db_session.commit()

    expected = _expected_member_score(FIRST_VOTE_VALUE)
    starter_stats = await _stats(db_session, character.id, era)
    member_stats = await _stats(db_session, character3.id, era)

    assert starter_stats.score == expected
    assert member_stats.score == expected, (
        "the non-starter member banks the same vote points as the starter"
    )
    assert member_stats.score - _expected_member_score(0) == FIRST_VOTE_VALUE


@pytest.mark.asyncio
async def test_a_collab_vote_moves_every_member_all_time_score(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    submitted_collab: Praxis,
    era: Era,
    some_faction: Faction,
):
    """``all_time_score`` is credited forward as a delta (#1345), so a member who
    is never recalculated never accrues and the loss is permanent."""
    before = (await _stats(db_session, character3.id, era)).all_time_score

    await cast_vote_on_praxis(character2, submitted_collab.id, FIRST_VOTE_VALUE, db_session)
    await db_session.commit()

    after = await _stats(db_session, character3.id, era)
    assert after.all_time_score == before + FIRST_VOTE_VALUE
    assert after.all_time_score == after.score


@pytest.mark.asyncio
async def test_re_rating_a_collab_vote_down_moves_every_member_down(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    submitted_collab: Praxis,
    era: Era,
    some_faction: Faction,
):
    """The way down. There is no unvote route — the write surface is POST-only
    (``routers/votes.py``) — so the reverse direction is a *re-rate*, which lands
    in the update branch of the same function. A one-sided recalc there leaves
    the other members holding points no vote supports."""
    await cast_vote_on_praxis(character2, submitted_collab.id, FIRST_VOTE_VALUE, db_session)
    await db_session.commit()
    await cast_vote_on_praxis(
        character2, submitted_collab.id, RE_RATED_VOTE_VALUE, db_session
    )
    await db_session.commit()

    expected = _expected_member_score(RE_RATED_VOTE_VALUE)
    assert (await _stats(db_session, character.id, era)).score == expected
    member_stats = await _stats(db_session, character3.id, era)
    assert member_stats.score == expected, (
        "a re-rate down must debit the non-starter too"
    )
    assert member_stats.all_time_score == expected
