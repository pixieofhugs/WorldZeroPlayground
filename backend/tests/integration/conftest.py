"""Integration fixtures. Needs PostgreSQL; TEST_DATABASE_URL defaults to the dev DB name
+ ``_test``.

One connection per test inside a transaction that rolls back; handler commits
only release a SAVEPOINT.
"""
import os
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

import models  # noqa: F401 — registers all models on Base.metadata for create_all
from config import settings
from db import get_db
from game_config import CURRENT_ERA
from main import app
from models.account import Account
from models.base import Base
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.auth import create_jwt
from tests.integration.factories import DEFAULT_FACTION_SLUG, attach_proof


@event.listens_for(Praxis, "before_insert")
@event.listens_for(Praxis, "before_update")
def _stamp_sealed_praxis_era(mapper, connection, praxis: Praxis) -> None:
    """Fixtures seal praxes directly; the CHECK wants the seal's stamps."""
    if praxis.status != PraxisStatus.submitted:
        return
    if praxis.submitted_at is None:
        praxis.submitted_at = datetime.now(timezone.utc)
    if praxis.era_id is None:
        # By the seal's clock, so a fixture backdated into a closed era lands in it.
        praxis.era_id = connection.scalar(
            select(Era.id)
            .where(Era.started_at <= praxis.submitted_at)
            .order_by(Era.id.desc())
            .limit(1)
        ) or connection.scalar(select(func.max(Era.id)))


@event.listens_for(Duel, "before_insert")
@event.listens_for(Duel, "before_update")
def _stamp_duel_lifecycle(mapper, connection, duel: Duel) -> None:
    """Fixtures set a duel's status directly; stamp what that status implies."""
    now = datetime.now(timezone.utc)
    if duel.status == DuelStatus.declined and duel.declined_at is None:
        duel.declined_at = now
    if duel.status in (DuelStatus.active, DuelStatus.settled, DuelStatus.resolved):
        duel.accepted_at = duel.accepted_at or now
    if duel.status == DuelStatus.resolved:
        duel.resolved_at = duel.resolved_at or now
        duel.resolved_era_id = duel.resolved_era_id or connection.scalar(
            select(func.max(Era.id))
        )


# Level-0 fixture voters have a past peak at the vote level (#3102).
CURRENT_ERA_VOTE_LEVEL: int = CURRENT_ERA.vote_level_required


@pytest.fixture(autouse=True)
def _no_post_cooldown(restore_live_era):
    """Most tests post many praxes from one account; the cap has its own tests."""
    object.__setattr__(CURRENT_ERA, "praxis_post_cooldown_hours", 0)


@pytest.fixture(autouse=True)
def proof_rule_off(request, monkeypatch):
    """Tests that POST /praxes then submit carry no media; only ``proof_rule`` tests
    (#3473) see the rule."""
    if request.node.get_closest_marker("proof_rule") is None:
        from services import collab_consensus

        async def _always(*args, **kwargs):
            return True

        monkeypatch.setattr(collab_consensus, "_has_proof", _always)


@pytest.fixture(autouse=True)
def received_vote_rule_off(request, restore_live_era):
    """Fixture voters have no received vote; only tests that opt in via
    ``received_vote_rule`` see the rule. ``restore_live_era`` undoes the flip."""
    if request.node.get_closest_marker("received_vote_rule") is None:
        object.__setattr__(CURRENT_ERA, "vote_requires_received_vote", False)


def _derive_test_db_url(dev_url: str) -> str:
    """Append ``_test`` to the DB name only; a blanket replace would also hit the
    username."""
    base, sep, db_name = dev_url.rpartition("/")
    return f"{base}{sep}{db_name}_test"


_TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    _derive_test_db_url(settings.DATABASE_URL),
)


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


@pytest.fixture
def media_root(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


@pytest_asyncio.fixture
async def db_connection(test_engine):
    """One raw connection per test, wrapped in a transaction that rolls back."""
    async with test_engine.connect() as conn:
        trans = await conn.begin()
        yield conn
        await trans.rollback()


@pytest_asyncio.fixture
async def db_session(db_connection):
    """AsyncSession on the test connection; commits release a SAVEPOINT, not the outer
    transaction."""
    session = AsyncSession(bind=db_connection, expire_on_commit=False)

    # Reopen a SAVEPOINT after each commit.
    @event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(session_sync, transaction):
        if transaction.nested and not transaction._parent.nested:
            session_sync.begin_nested()

    await db_connection.begin_nested()
    yield session
    await session.close()


class _ReuseSessionContext:
    """Yields the shared test session without closing it, so factory callers see fixture
    data.

    Hence nothing using the factory may be gathered concurrently (#1532, ADR-0036).
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def __aenter__(self) -> AsyncSession:
        return self._session

    async def __aexit__(self, *args: object) -> None:
        pass


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """AsyncClient sharing ``db_session`` via the ``get_db`` override.

    Commits on success like production, but never rolls back on error: that
    would expire objects the test body still holds.
    """

    async def _override_get_db():
        yield db_session
        await db_session.commit()

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


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
    """Seed the live era's row, required for the CharacterStats FK."""
    from game_config import CURRENT_ERA
    e = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
    )
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    return e


@pytest_asyncio.fixture
async def some_faction(db_session: AsyncSession) -> Faction:
    """Faction rows for every slug ANY era configured, like production; returns the
    default one.

    A test may know only that it got *some* faction (#2708). Statuses come from
    ``seed.upsert_era_factions`` (ADR-0087); the live era runs last so it decides.
    """
    from sqlalchemy import select

    from game_config import (
        _ERA_ATTRIBUTE_BY_CONFIG_KEY,
        CURRENT_ERA,
        era_config_for_key,
    )
    from seed import upsert_era_factions

    configs = [era_config_for_key(key) for key in _ERA_ATTRIBUTE_BY_CONFIG_KEY]
    # By ``config_key``: ``CURRENT_ERA`` is a distinct instance (ADR-0091).
    live_key = CURRENT_ERA.config_key
    for config in [c for c in configs if c is not None and c.config_key != live_key]:
        await upsert_era_factions(db_session, config)
    await upsert_era_factions(db_session, CURRENT_ERA)
    await db_session.commit()

    result = await db_session.execute(
        select(Faction).where(Faction.slug == DEFAULT_FACTION_SLUG)
    )
    return result.scalar_one()


@pytest_asyncio.fixture
async def character(db_session: AsyncSession, account: Account, era: Era, some_faction: Faction) -> Character:
    ch = Character(
        account_id=account.id,
        username="testcharacter",
        peak_level=CURRENT_ERA_VOTE_LEVEL,
        display_name="Test Character",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch)
    await db_session.flush()

    stats = CharacterStats(
        character_id=ch.id,
        era_id=era.id,
        score=0,
        level=0,
        votes_spent_this_era=0,
    )
    db_session.add(stats)
    await db_session.commit()
    await db_session.refresh(ch)
    await db_session.refresh(stats)
    return ch


@pytest_asyncio.fixture
async def character2(db_session: AsyncSession, account2: Account, era: Era, some_faction: Faction) -> Character:
    ch = Character(
        account_id=account2.id,
        username="othercharacter",
        peak_level=5,
        all_time_score=500,
        display_name="Other Character",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch)
    await db_session.flush()

    stats = CharacterStats(
        character_id=ch.id,
        era_id=era.id,
        score=500,
        level=5,
        votes_spent_this_era=0,
    )
    db_session.add(stats)
    await db_session.commit()
    await db_session.refresh(ch)
    await db_session.refresh(stats)
    return ch


@pytest_asyncio.fixture
async def account3(db_session: AsyncSession) -> Account:
    acc = Account(email="third@example.com")
    db_session.add(acc)
    await db_session.commit()
    await db_session.refresh(acc)
    return acc


@pytest_asyncio.fixture
async def character3(db_session: AsyncSession, account3: Account, era: Era, some_faction: Faction) -> Character:
    ch = Character(
        account_id=account3.id,
        username="thirdcharacter",
        peak_level=CURRENT_ERA_VOTE_LEVEL,
        display_name="Third Character",
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(ch)
    await db_session.flush()

    stats = CharacterStats(
        character_id=ch.id,
        era_id=era.id,
        score=0,
        level=0,
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
async def auth_headers3(account3: Account) -> dict:
    token = create_jwt(account3.id)
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
        created_by_id=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest_asyncio.fixture
async def praxis_solo(
    db_session: AsyncSession, active_task: Task, character: Character
) -> Praxis:
    """Submitted solo praxis by ``character``; submitted so it is public (ADR-0024)."""
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
    await attach_proof(db_session, praxis)
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
    await attach_proof(db_session, praxis)
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
