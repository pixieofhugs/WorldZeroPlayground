"""Integration test fixtures.

Requires a running PostgreSQL instance. Set TEST_DATABASE_URL in the environment
(defaults to replacing the dev DB name with worldzero_test).

Uses a single-connection-per-test pattern with SAVEPOINT rollback:
- Session-scoped engine creates tables once (NullPool avoids asyncpg loop issues)
- Each test gets a connection with a real transaction
- The test session uses begin_nested() (SAVEPOINT) so route handlers can commit
  without escaping the test transaction
- After each test the outer transaction rolls back, leaving a clean DB

Usage:
    TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost/worldzero_test \
    pytest backend/tests/integration/ -v
"""
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from config import settings
from db import get_db
from main import app
import models  # noqa: F401 — registers all models on Base.metadata for create_all
from models.account import Account
from models.base import Base
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis  # noqa: F401
from models.task import Task
from models.vote import Vote  # noqa: F401
from services.auth import create_jwt

# ---------------------------------------------------------------------------
# Test database URL — replace DB name so we never touch the dev database
# ---------------------------------------------------------------------------
_TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    settings.DATABASE_URL.replace("/worldzero", "/worldzero_test"),
)


# ---------------------------------------------------------------------------
# Engine & schema — session-scoped, runs once
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create tables once per session. NullPool prevents asyncpg loop-binding issues."""
    engine = create_async_engine(_TEST_DB_URL, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Per-test connection + session with SAVEPOINT rollback
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_connection(test_engine):
    """One raw connection per test, wrapped in a transaction that rolls back."""
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        yield conn
        await trans.rollback()


@pytest_asyncio.fixture
async def db_session(db_connection):
    """AsyncSession bound to the test connection.

    Uses begin_nested() (SAVEPOINT) so that when route handlers call
    session.commit(), the commit only releases the savepoint — the outer
    transaction still rolls back after the test.
    """
    session = AsyncSession(bind=db_connection, expire_on_commit=False)

    # Every time the session commits, start a new SAVEPOINT so the next
    # operation still lives inside the outer transaction.
    @event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(session_sync, transaction):
        if transaction.nested and not transaction._parent.nested:
            session_sync.begin_nested()

    await db_connection.begin_nested()
    yield session
    await session.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Provide an AsyncClient with the get_db dependency overridden."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def account(db_session: AsyncSession) -> Account:
    acc = Account(email="test@example.com")
    db_session.add(acc)
    await db_session.commit()
    await db_session.refresh(acc)
    return acc


@pytest_asyncio.fixture
async def account2(db_session: AsyncSession) -> Account:
    acc = Account(email="other@example.com")
    db_session.add(acc)
    await db_session.commit()
    await db_session.refresh(acc)
    return acc


@pytest_asyncio.fixture
async def era(db_session: AsyncSession, account: Account) -> Era:
    """Seed the current Era 1 row required for CharacterStats FK."""
    from game_config import CURRENT_ERA
    e = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    return e


@pytest_asyncio.fixture
async def faction_ua(db_session: AsyncSession) -> Faction:
    """Seed the 'ua' and 'na' factions required for FK constraints."""
    from models.faction import FactionStatus
    from sqlalchemy import select

    factions_to_seed = [
        Faction(slug="ua", name="UA", description="Default starting faction", status=FactionStatus.visible),
        Faction(slug="na", name="None", description="Sentinel for no faction affiliation", status=FactionStatus.hidden),
    ]
    for faction in factions_to_seed:
        result = await db_session.execute(select(Faction).where(Faction.slug == faction.slug))
        if result.scalar_one_or_none() is None:
            db_session.add(faction)
    await db_session.commit()

    result = await db_session.execute(select(Faction).where(Faction.slug == "ua"))
    return result.scalar_one()


@pytest_asyncio.fixture
async def character(db_session: AsyncSession, account: Account, era: Era, faction_ua: Faction) -> Character:
    ch = Character(
        account_id=account.id,
        username="testcharacter",
        display_name="Test Character",
        faction_slug="ua",
    )
    db_session.add(ch)
    await db_session.flush()

    stats = CharacterStats(
        character_id=ch.id,
        era_id=era.id,
        score=0,
        all_time_score=0,
        level=0,
        votes_spent_this_era=0,
    )
    db_session.add(stats)
    await db_session.commit()
    await db_session.refresh(ch)
    await db_session.refresh(stats)
    return ch


@pytest_asyncio.fixture
async def character2(db_session: AsyncSession, account2: Account, era: Era, faction_ua: Faction) -> Character:
    ch = Character(
        account_id=account2.id,
        username="othercharacter",
        display_name="Other Character",
        faction_slug="ua",
    )
    db_session.add(ch)
    await db_session.flush()

    stats = CharacterStats(
        character_id=ch.id,
        era_id=era.id,
        score=500,
        all_time_score=500,
        level=5,
        votes_spent_this_era=0,
    )
    db_session.add(stats)
    await db_session.commit()
    await db_session.refresh(ch)
    await db_session.refresh(stats)
    return ch


@pytest_asyncio.fixture
async def auth_headers(account: Account) -> dict:
    token = create_jwt(account.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers2(account2: Account) -> dict:
    token = create_jwt(account2.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def active_task(db_session: AsyncSession, character: Character) -> Task:
    from models.task import TaskStatus
    task = Task(
        title="Test Task",
        description="A test task",
        point_value=10,
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
async def signed_up_task(
    db_session: AsyncSession, character: Character, active_task: Task
) -> Task:
    """Active task alias — in the new model, 'signing up' is implicit in praxis creation.

    Kept for test compatibility; simply returns the active_task.
    """
    return active_task


@pytest_asyncio.fixture
async def signed_up_task2(
    db_session: AsyncSession, character2: Character, active_task: Task
) -> Task:
    """Active task alias — in the new model, 'signing up' is implicit in praxis creation.

    Kept for test compatibility; simply returns the active_task.
    """
    return active_task
