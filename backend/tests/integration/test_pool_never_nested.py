"""A request holds ONE pool connection, never a second (#3624).

A nested checkout starves the pool once ~pool-size requests are in flight. A
one-connection pool turns any nested checkout into an immediate timeout. Needs
COMMITTED rows and a real pool, so it builds its own engine and truncates after.
"""
import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import AsyncAdaptedQueuePool

import db as db_module
from game_config import CURRENT_ERA
from main import app
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from seed import upsert_era_factions
from services.auth import create_jwt
from tests.integration.conftest import _TEST_DB_URL
from tests.integration.factories import DEFAULT_FACTION_SLUG

pytestmark = pytest.mark.asyncio

CONCURRENT_REQUESTS = 4


@pytest.mark.parametrize("path", ["/me/sidebar", "/activity-feed"])
async def test_concurrent_requests_survive_a_one_connection_pool(
    test_engine, monkeypatch, path
) -> None:
    engine = create_async_engine(
        _TEST_DB_URL,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=1,
        max_overflow=0,
        pool_timeout=5,
    )
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(db_module, "AsyncSessionLocal", factory)
    try:
        async with factory() as s:
            await upsert_era_factions(s, CURRENT_ERA)
            account = Account(email="pool@example.com")
            s.add(account)
            await s.flush()
            era = Era(
                name=CURRENT_ERA.name,
                config_key=CURRENT_ERA.config_key,
                started_by_id=account.id,
            )
            character = Character(
                account_id=account.id, username="pool", display_name="Pool",
                faction_slug=DEFAULT_FACTION_SLUG,
            )
            s.add_all([era, character])
            await s.flush()
            s.add(CharacterStats(
                character_id=character.id, era_id=era.id, score=0,
                level=0, votes_spent_this_era=0,
            ))
            await s.commit()
            headers = {"Authorization": f"Bearer {create_jwt(account.id)}"}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            responses = await asyncio.wait_for(
                asyncio.gather(
                    *(
                        client.get(path, headers=headers)
                        for _ in range(CONCURRENT_REQUESTS)
                    )
                ),
                timeout=4,
            )
        assert [r.status_code for r in responses] == [200] * CONCURRENT_REQUESTS
    finally:
        async with engine.begin() as conn:
            await conn.execute(text(
                "TRUNCATE account, era, faction RESTART IDENTITY CASCADE"
            ))
        await engine.dispose()
