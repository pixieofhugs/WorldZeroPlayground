"""Votes landing together must not drop points from the author's stored score (#3708).

Needs COMMITTED rows and real connections, so it builds its own engine like
``test_vote_budget_concurrency``; the tables are truncated afterwards.
"""
import asyncio

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from seed import upsert_era_factions
from services.character_stats import recalculate_character_stats
from services.vote import cast_vote_on_praxis
from tests.integration.conftest import _TEST_DB_URL
from tests.integration.factories import DEFAULT_FACTION_SLUG

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("praxis_count,voter_count", [(1, 3), (2, 2)])
async def test_concurrent_votes_leave_the_full_score_stored(
    test_engine, praxis_count: int, voter_count: int
) -> None:
    engine = create_async_engine(_TEST_DB_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as s:
            await upsert_era_factions(s, CURRENT_ERA)
            accounts = [
                Account(email=f"a{i}@example.com") for i in range(voter_count + 1)
            ]
            s.add_all(accounts)
            await s.flush()
            era = Era(
                name=CURRENT_ERA.name,
                config_key=CURRENT_ERA.config_key,
                started_by_id=accounts[0].id,
            )
            s.add(era)
            characters = [
                Character(
                    account_id=a.id, username=f"c{i}", display_name=f"C{i}",
                    peak_level=CURRENT_ERA.vote_level_required,
                    faction_slug=DEFAULT_FACTION_SLUG,
                )
                for i, a in enumerate(accounts)
            ]
            s.add_all(characters)
            await s.flush()
            author, voters = characters[0], characters[1:]
            task = Task(
                title="T", description="d", point_value=10, level_required=0,
                status=TaskStatus.active, created_by_id=author.id,
                primary_faction_slug=DEFAULT_FACTION_SLUG,
            )
            s.add(task)
            await s.flush()
            praxes = [
                Praxis(
                    task_id=task.id, created_by_id=author.id, type=PraxisType.solo,
                    status=PraxisStatus.submitted, title=f"P{i}", body_text="proof",
                )
                for i in range(praxis_count)
            ]
            s.add_all(praxes)
            await s.flush()
            s.add_all(
                PraxisMember(praxis_id=p.id, character_id=author.id) for p in praxes
            )
            await s.commit()
            author_id = author.id
            targets = [
                (v.id, praxes[i % praxis_count].id) for i, v in enumerate(voters)
            ]

        async def cast(voter_id: int, praxis_id: int) -> None:
            async with factory() as s:
                voter = await s.get(Character, voter_id)
                await cast_vote_on_praxis(voter, praxis_id, 5, s, CURRENT_ERA)
                await s.commit()

        await asyncio.gather(*(cast(v, p) for v, p in targets))

        async def stored() -> int:
            async with factory() as s:
                return await s.scalar(
                    select(CharacterStats.score).where(
                        CharacterStats.character_id == author_id
                    )
                )

        before = await stored()
        async with factory() as s:
            await recalculate_character_stats(author_id, s)
            await s.commit()
        assert before == await stored()
    finally:
        async with engine.begin() as conn:
            await conn.execute(text(
                "TRUNCATE account, era, faction RESTART IDENTITY CASCADE"
            ))
        await engine.dispose()
