"""A vote on a collab praxis must move every member's score (#1465).

Seam: ``services.vote.cast_or_update_vote`` (cast and re-rate). Two-member collab,
third-party voter, assertions on the non-starter — a solo fixture can't see it.
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
from tests.integration.factories import DEFAULT_FACTION_SLUG

# Off the fixtures' slug, not a named faction: a missing one KeyErrors at import
# (#2708).
COLLAB_OWN_MODIFIER: float = CURRENT_ERA.factions[
    DEFAULT_FACTION_SLUG
].collab_own_modifier

# Non-zero baseline, or a broken fix would pass.
COLLAB_TASK_POINTS: int = 40

FIRST_VOTE_VALUE: int = 5
RE_RATED_VOTE_VALUE: int = 1


def _expected_member_score(points_from_votes: int) -> int:
    """Votes are un-split: each member banks the whole tally (ADR-0014)."""
    return round(COLLAB_TASK_POINTS * COLLAB_OWN_MODIFIER + points_from_votes)


@pytest_asyncio.fixture
async def collab_task(db_session: AsyncSession, character: Character) -> Task:
    task = Task(
        title="A task worth collaborating on",
        description="",
        point_value=COLLAB_TASK_POINTS,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
    """``character`` started it; ``character3`` is the non-starter under test."""
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

    # Bank a baseline so the defect shows as a missing delta.
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
    """``all_time_score`` is a forward delta (#1345): a missed recalc never heals."""
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
    """No unvote route exists, so the way down is a re-rate (the update branch)."""
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
