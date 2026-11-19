"""The Task Crown costs a constant number of queries however many authors
compete (#3618), and the batched scores equal the per-author path."""
from datetime import datetime, timezone

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import TaskType
from services.praxis_out import author_contributions_for, crowned_praxis_ids
from services.praxis_scoring import compute_contributions
from tests.integration.factories import make_character, make_duel, make_task
from tests.integration.test_praxis_list_query_count import _count_selects

FACTIONS = real_faction_slugs(CURRENT_ERA)


async def _compete(
    db_session: AsyncSession, era: Era, tasks: list, first_author: int, count: int
) -> list[Praxis]:
    praxes = []
    for index in range(first_author, first_author + count):
        author = await make_character(
            db_session, era, username=f"crown{index}", level=index % 4,
            faction_slug=FACTIONS[index % len(FACTIONS)],
        )
        for task in tasks:
            praxis = Praxis(
                task_id=task.id, created_by_id=author.id, type=PraxisType.solo,
                status=PraxisStatus.submitted, submitted_at=datetime.now(timezone.utc),
                title="p", body_text="proof",
            )
            db_session.add(praxis)
            await db_session.flush()
            db_session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
            praxes.append(praxis)
    await db_session.commit()
    return praxes


@pytest.mark.asyncio
async def test_crown_query_count_is_flat_in_authors(
    db_connection, db_session: AsyncSession, era: Era, some_faction: Faction
):
    creator = await make_character(db_session, era, username="creator")
    tasks = [await make_task(db_session, creator, title=f"t{i}") for i in range(3)]
    task_ids = [task.id for task in tasks]
    await _compete(db_session, era, tasks, 0, 2)
    with _count_selects(db_connection) as few:
        await crowned_praxis_ids(task_ids, db_session)
    await _compete(db_session, era, tasks, 2, 6)
    with _count_selects(db_connection) as many:
        await crowned_praxis_ids(task_ids, db_session)
    assert len(many) == len(few), "\n".join(many)


@pytest.mark.asyncio
async def test_batched_contributions_equal_per_author(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    duel, _, _ = await make_duel(
        db_session, era, label="eq", challenger_votes=4, opponent_votes=1,
        challenger_faction=FACTIONS[0], opponent_faction=FACTIONS[1], commit=True,
    )
    creator = await make_character(db_session, era, username="creator")
    tasks = [await make_task(db_session, creator, title=f"t{i}") for i in range(2)]
    praxes = await _compete(db_session, era, tasks, 0, 5)
    for praxis_id in (duel.challenger_praxis_id, duel.opponent_praxis_id):
        praxes.append(await db_session.get(Praxis, praxis_id))

    batched = await author_contributions_for(praxes, db_session, CURRENT_ERA)
    per_author = {}
    for praxis in praxes:
        author = await db_session.get(Character, praxis.created_by_id)
        level = await db_session.scalar(
            select(CharacterStats.level).where(
                CharacterStats.character_id == author.id,
                CharacterStats.era_id == era.id,
            )
        )
        per_author.update(
            await compute_contributions(
                [praxis], author, CURRENT_ERA, db_session, character_level=level
            )
        )
    assert len(batched) == len(praxes)
    assert batched == per_author


@pytest.mark.asyncio
async def test_batch_gates_metatask_by_author_level_and_reads_own_habit_row(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    creator = await make_character(db_session, era, username="creator")
    task = await make_task(db_session, creator, title="t")
    meta = await make_task(
        db_session, creator, title="m", task_type=TaskType.metatask,
        point_value=7, level_required=2,
    )
    solo = await _compete(db_session, era, [task], 0, 5)  # levels 0,1,2,3,0
    by_level = {p.created_by_id: i % 4 for i, p in enumerate(solo)}
    for praxis in solo:
        db_session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=meta.id))
        await db_session.execute(
            update(PraxisMember)
            .where(PraxisMember.praxis_id == praxis.id)
            .values(habit_bonus_points=100 + praxis.created_by_id)
        )
    low, high = solo[0].created_by_id, solo[3].created_by_id
    collabs = []
    for author, other, habits in ((low, high, (11, 13)), (high, low, (17, 19))):
        collab = Praxis(
            task_id=task.id, created_by_id=author, type=PraxisType.collab,
            status=PraxisStatus.submitted, submitted_at=datetime.now(timezone.utc),
            title="c", body_text="proof",
        )
        db_session.add(collab)
        await db_session.flush()
        for member, bonus in zip((author, other), habits):
            db_session.add(
                PraxisMember(praxis_id=collab.id, character_id=member, habit_bonus_points=bonus)
            )
        db_session.add(PraxisMetaTask(praxis_id=collab.id, task_id=meta.id))
        collabs.append(collab)
    await db_session.commit()

    got = await author_contributions_for(solo + collabs, db_session, CURRENT_ERA)

    for praxis in solo:
        c = got[praxis.id]
        assert c.metatask_points == (7 if by_level[praxis.created_by_id] >= 2 else 0)
        assert c.habit_bonus_points == 100 + praxis.created_by_id
    assert got[collabs[0].id].metatask_points == 0
    assert got[collabs[0].id].habit_bonus_points == 11
    assert got[collabs[1].id].metatask_points == 7
    assert got[collabs[1].id].habit_bonus_points == 17
