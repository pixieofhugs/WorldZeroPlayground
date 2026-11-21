"""Duel transitions serialize on a row lock and a partial unique index (#3654).

Needs COMMITTED rows and real connections, so it builds its own engine (see
``test_vote_budget_concurrency.py``); the tables are truncated afterwards.
"""
import asyncio
from contextlib import asynccontextmanager

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import Praxis, PraxisStatus
from seed import upsert_era_factions
from services.duel import (
    cancel_duel_challenge,
    issue_duel_challenge,
    respond_to_duel_challenge,
)
from services.praxis_duel import get_duel_for_praxis
from tests.integration.conftest import _TEST_DB_URL
from tests.integration.factories import (
    make_account,
    make_character,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio

BURST = 5


@asynccontextmanager
async def _world(opponent_count: int = 1):
    engine = create_async_engine(_TEST_DB_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as s:
            await upsert_era_factions(s, CURRENT_ERA)
            owner = await make_account(s, "owner@example.com")
            era = Era(
                name=CURRENT_ERA.name,
                config_key=CURRENT_ERA.config_key,
                started_by_id=owner.id,
            )
            s.add(era)
            await s.flush()
            level = CURRENT_ERA.duel_level_required
            challenger = await make_character(s, era, username="chal", level=level)
            opponents = [
                await make_character(s, era, username=f"opp{i}", level=level)
                for i in range(opponent_count)
            ]
            task = await make_task(s, challenger)
            praxis = await make_solo_praxis(
                s, task, challenger, status=PraxisStatus.in_progress
            )
            await s.commit()
            yield factory, challenger.id, [o.id for o in opponents], praxis.id
    finally:
        async with engine.begin() as conn:
            await conn.execute(
                text("TRUNCATE account, era, faction RESTART IDENTITY CASCADE")
            )
        await engine.dispose()


async def _run(factory, action):
    async with factory() as s:
        try:
            result = await action(s)
        except HTTPException as exc:
            await s.rollback()
            return exc
        await s.commit()
        return result


def _refused(results, status_code):
    return [
        r for r in results
        if isinstance(r, HTTPException) and r.status_code == status_code
    ]


async def _pending_duel(factory, challenger_id, opponent_id, praxis_id) -> int:
    async def issue(s):
        _, duel = await issue_duel_challenge(
            challenger_id, praxis_id, opponent_id, s, CURRENT_ERA
        )
        return duel.id

    return await _run(factory, issue)


async def test_double_tapped_accept_makes_one_praxis() -> None:
    async with _world() as (factory, challenger_id, (opponent_id,), praxis_id):
        duel_id = await _pending_duel(factory, challenger_id, opponent_id, praxis_id)

        results = await asyncio.gather(*(
            _run(
                factory,
                lambda s: respond_to_duel_challenge(
                    duel_id, opponent_id, True, s, CURRENT_ERA
                ),
            )
            for _ in range(BURST)
        ))

        refused = _refused(results, 400)
        assert len(refused) == BURST - 1
        assert all(
            r.detail["code"] == ErrorCode.duel_challenge_already_resolved
            for r in refused
        )
        async with factory() as s:
            owned = await s.scalar(
                select(func.count()).select_from(Praxis).where(
                    Praxis.created_by_id == opponent_id
                )
            )
        assert owned == 1


async def test_burst_of_challenges_from_one_praxis_makes_one_duel() -> None:
    async with _world(BURST) as (factory, challenger_id, opponent_ids, praxis_id):
        results = await asyncio.gather(*(
            _run(
                factory,
                lambda s, opp=opp: issue_duel_challenge(
                    challenger_id, praxis_id, opp, s, CURRENT_ERA
                ),
            )
            for opp in opponent_ids
        ))

        refused = _refused(results, 409)
        assert len(refused) == BURST - 1
        assert all(r.detail["code"] == ErrorCode.duel_already_exists for r in refused)
        async with factory() as s:
            assert await get_duel_for_praxis(praxis_id, s) is not None


async def test_accept_and_cancel_together_agree_with_the_row() -> None:
    async with _world() as (factory, challenger_id, (opponent_id,), praxis_id):
        duel_id = await _pending_duel(factory, challenger_id, opponent_id, praxis_id)

        accepted, cancelled = await asyncio.gather(
            _run(
                factory,
                lambda s: respond_to_duel_challenge(
                    duel_id, opponent_id, True, s, CURRENT_ERA
                ),
            ),
            _run(
                factory,
                lambda s: cancel_duel_challenge(
                    duel_id, challenger_id, s, CURRENT_ERA
                ),
            ),
        )

        async with factory() as s:
            row = await s.get(Duel, duel_id)
        # The cancel either beat the accept (which is then refused) or
        # dissolved the already-active duel; both end declined.
        if isinstance(accepted, HTTPException):
            assert accepted.detail["code"] == ErrorCode.duel_challenge_already_resolved
        assert not isinstance(cancelled, HTTPException)
        assert cancelled.status == DuelStatus.declined
        assert row.status == DuelStatus.declined


async def test_index_rejects_a_second_live_duel_on_one_praxis() -> None:
    async with _world(2) as (factory, challenger_id, opponent_ids, praxis_id):
        await _pending_duel(factory, challenger_id, opponent_ids[0], praxis_id)
        async with factory() as s:
            first = await get_duel_for_praxis(praxis_id, s)
            s.add(Duel(
                task_id=first.task_id,
                challenger_praxis_id=praxis_id,
                opponent_character_id=opponent_ids[1],
                status=DuelStatus.pending,
            ))
            with pytest.raises(IntegrityError):
                await s.flush()
