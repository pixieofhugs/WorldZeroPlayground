"""Two casts from one character race for the last vote (#3362).

Needs COMMITTED rows and two real connections, so it builds its own engine
instead of the rolled-back ``db_session``; the tables are truncated afterwards.
"""
import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from seed import upsert_era_factions
from services.vote import cast_vote_on_praxis
from tests.integration.conftest import _TEST_DB_URL
from tests.integration.factories import DEFAULT_FACTION_SLUG

pytestmark = pytest.mark.asyncio


async def test_last_vote_is_spent_once_when_casts_race(test_engine) -> None:
    engine = create_async_engine(_TEST_DB_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as s:
            await upsert_era_factions(s, CURRENT_ERA)
            owner = Account(email="owner@example.com")
            voter_account = Account(email="voter@example.com")
            s.add_all([owner, voter_account])
            await s.flush()
            era = Era(
                name=CURRENT_ERA.name,
                config_key=CURRENT_ERA.config_key,
                started_by=owner.id,
            )
            owner_char = Character(
                account_id=owner.id, username="owner", display_name="Owner",
                peak_level=CURRENT_ERA.vote_level_required,
                faction_slug=DEFAULT_FACTION_SLUG,
            )
            voter = Character(
                account_id=voter_account.id, username="voter", display_name="Voter",
                peak_level=CURRENT_ERA.vote_level_required,
                faction_slug=DEFAULT_FACTION_SLUG,
            )
            s.add_all([era, owner_char, voter])
            await s.flush()
            task = Task(
                title="T", description="d", point_value=10, level_required=0,
                status=TaskStatus.active, created_by=owner_char.id,
                primary_faction_slug=DEFAULT_FACTION_SLUG,
            )
            s.add(task)
            await s.flush()
            praxes = [
                Praxis(
                    task_id=task.id, created_by_id=owner_char.id, type=PraxisType.solo,
                    status=PraxisStatus.submitted, title=f"P{i}", body_text="proof",
                )
                for i in range(2)
            ]
            s.add_all(praxes)
            await s.flush()
            s.add_all(
                PraxisMember(praxis_id=p.id, character_id=owner_char.id) for p in praxes
            )
            # score 0: the cap is the base; leave exactly one vote.
            s.add(CharacterStats(
                character_id=voter.id, era_id=era.id, score=0,
                level=0, votes_spent_this_era=CURRENT_ERA.vote_budget_base - 1,
            ))
            await s.commit()
            voter_id = voter.id
            praxis_ids = [p.id for p in praxes]

        async def cast(praxis_id: int):
            async with factory() as s:
                character = await s.get(Character, voter_id)
                try:
                    await cast_vote_on_praxis(character, praxis_id, 5, s, CURRENT_ERA)
                except HTTPException as exc:
                    await s.rollback()
                    return exc
                await s.commit()

        results = await asyncio.gather(*(cast(pid) for pid in praxis_ids))

        refused = [r for r in results if isinstance(r, HTTPException)]
        assert len(refused) == 1
        assert refused[0].status_code == 403
        assert refused[0].detail["code"] == ErrorCode.vote_budget_exhausted
        async with factory() as s:
            spent = await s.scalar(
                select(CharacterStats.votes_spent_this_era).where(
                    CharacterStats.character_id == voter_id
                )
            )
        assert spent == CURRENT_ERA.vote_budget_base
    finally:
        async with engine.begin() as conn:
            await conn.execute(text(
                "TRUNCATE account, era, faction RESTART IDENTITY CASCADE"
            ))
        await engine.dispose()
