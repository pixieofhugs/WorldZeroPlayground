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
from db import get_db, get_session_factory
from main import app
import models  # noqa: F401 — registers all models on Base.metadata for create_all
from models.account import Account
from models.base import Base
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.auth import create_jwt

# ---------------------------------------------------------------------------
# Test database URL — replace DB name so we never touch the dev database
# ---------------------------------------------------------------------------
def _derive_test_db_url(dev_url: str) -> str:
    """Append ``_test`` to the dev DB name only — not the username/host.

    A blanket ``.replace("/worldzero", ...)`` also rewrites ``://worldzero`` in
    the credentials, producing a bogus ``worldzero_test`` user. rpartition isolates
    the trailing path segment (the database name).
    """
    base, sep, db_name = dev_url.rpartition("/")
    return f"{base}{sep}{db_name}_test"


_TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    _derive_test_db_url(settings.DATABASE_URL),
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


class _ReuseSessionContext:
    """Null context manager that yields the shared test session without closing it.

    Used by the test session_factory override so that concurrent sub-query sessions
    (created by ``asyncio.gather`` in the activity-feed service) reuse the same
    SAVEPOINT-backed session and therefore see uncommitted fixture data.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def __aenter__(self) -> AsyncSession:
        return self._session

    async def __aexit__(self, *args: object) -> None:
        pass  # Do NOT close; the test fixture owns the session lifecycle.


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Provide an AsyncClient with the get_db dependency overridden.

    Mirrors the production ``get_db`` commit-on-success contract so service
    flush()-only writes are visible within the SAVEPOINT. We intentionally do
    NOT call ``rollback`` on exception: the shared ``db_session`` is used by
    both handler and test body, and rolling back would expire objects the
    test body is still holding (fixtures like ``era``, ``character``, etc.).
    Isolation is preserved by the outer test transaction, which rolls back
    unconditionally at the end of the test.

    Also overrides ``get_session_factory`` so concurrent sub-queries (used by
    the activity-feed service under ``asyncio.gather``) reuse ``db_session``
    rather than opening new connections that cannot see uncommitted test data.
    """

    async def _override_get_db():
        yield db_session
        await db_session.commit()

    def _override_session_factory():
        return lambda: _ReuseSessionContext(db_session)

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_session_factory] = _override_session_factory
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
async def faction_ephemerists(db_session: AsyncSession) -> Faction:
    """Seed the 'ephemerists' faction row required by Task Vision carve-out tests."""
    from models.faction import FactionStatus
    from sqlalchemy import select

    result = await db_session.execute(select(Faction).where(Faction.slug == "ephemerists"))
    existing = result.scalar_one_or_none()
    if existing is None:
        faction = Faction(slug="ephemerists", name="The Ephemerists", description="Task Vision perk", status=FactionStatus.visible)
        db_session.add(faction)
        await db_session.commit()
        result = await db_session.execute(select(Faction).where(Faction.slug == "ephemerists"))
        existing = result.scalar_one()
    return existing


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


# ---------------------------------------------------------------------------
# Praxis / Vote fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def praxis_solo(
    db_session: AsyncSession, active_task: Task, character: Character
) -> Praxis:
    """Minimal *submitted* solo Praxis authored by ``character`` on ``active_task``.

    Submitted (with the creator's PraxisMember row) so it is publicly visible —
    in_progress praxes are member-only (ADR-0024), and a realistic solo praxis
    always has its creator as a member.
    """
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Solo Praxis",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


@pytest_asyncio.fixture
async def praxis_collab(
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
) -> Praxis:
    """Collab Praxis with two members (``character`` and ``character2``)."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        title="Collab Praxis",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()

    db_session.add_all(
        [
            PraxisMember(praxis_id=praxis.id, character_id=character.id),
            PraxisMember(praxis_id=praxis.id, character_id=character2.id),
        ]
    )
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


@pytest_asyncio.fixture
async def vote(
    db_session: AsyncSession, praxis_solo: Praxis, character2: Character
) -> Vote:
    """A single four-star Vote cast by ``character2`` on ``praxis_solo``."""
    vote_row = Vote(
        praxis_id=praxis_solo.id,
        voter_character_id=character2.id,
        voter_account_id=character2.account_id,
        value=4,
    )
    db_session.add(vote_row)
    await db_session.commit()
    await db_session.refresh(vote_row)
    return vote_row
