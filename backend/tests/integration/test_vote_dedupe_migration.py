"""Migration 0011 dedupes to the newest vote per (praxis, account) (#1150).

**Seam:** the migration's own ``upgrade()`` function, driven by a real Alembic
``Operations`` bound to the test connection. Not a re-implementation of its SQL
— the module's ``op`` global is swapped for the bound operations object, so the
statements under test are byte-for-byte the ones a deploy runs.

The integration schema comes from ``Base.metadata.create_all``, so it already
carries ``uq_vote_praxis_account`` and can hold no duplicates. Each test
therefore drops that constraint first to reproduce the *deployed* shape 0011
actually meets, seeds the duplicates, and runs the migration. All of it lives
inside the per-test transaction, so the constraint is back the moment the test
ends.
"""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import ModuleType

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.praxis import Praxis
from models.vote import Vote

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "0011_vote_unique_per_account.py"
)

_BASE_TIME = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)


def _load_migration() -> ModuleType:
    """Import ``0011_vote_unique_per_account`` by path (its name starts with a digit)."""
    spec = importlib.util.spec_from_file_location("migration_0011", _MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def _run_upgrade(session: AsyncSession) -> None:
    """Execute the real ``upgrade()`` against the test connection."""
    migration = _load_migration()
    connection = await session.connection()

    def _apply(sync_connection) -> None:
        operations = Operations(MigrationContext.configure(sync_connection))
        migration.op = operations  # the module's `from alembic import op` global
        migration.upgrade()

    await connection.run_sync(_apply)


async def _drop_account_constraint(session: AsyncSession) -> None:
    """Reproduce the pre-0011 deployed shape: character-scoped uniqueness only."""
    await session.execute(
        text("ALTER TABLE vote DROP CONSTRAINT IF EXISTS uq_vote_praxis_account")
    )
    await session.execute(
        text(
            "ALTER TABLE vote ADD CONSTRAINT uq_vote_praxis"
            " UNIQUE (praxis_id, voter_character_id)"
        )
    )
    await session.flush()


async def _extra_character(
    session: AsyncSession, account: Account, username: str
) -> Character:
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username,
        faction_slug="ua",
    )
    session.add(character)
    await session.flush()
    return character


async def _add_vote(
    session: AsyncSession,
    praxis: Praxis,
    voter: Character,
    value: int,
    created_at: datetime,
) -> Vote:
    row = Vote(
        praxis_id=praxis.id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        value=value,
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(row)
    await session.flush()
    return row


async def _account_constraint_exists(session: AsyncSession) -> bool:
    result = await session.execute(
        text("SELECT 1 FROM pg_constraint WHERE conname = 'uq_vote_praxis_account'")
    )
    return result.scalar_one_or_none() is not None


async def _votes_for(session: AsyncSession, praxis: Praxis) -> list[Vote]:
    result = await session.execute(
        select(Vote).where(Vote.praxis_id == praxis.id).order_by(Vote.id)
    )
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_upgrade_keeps_the_newest_vote_per_account(
    db_session: AsyncSession,
    praxis_solo: Praxis,
    account2: Account,
    character2: Character,
    account3: Account,
    character3: Character,
) -> None:
    """Two alts on one account collapse to the newer row; other accounts untouched.

    This is the production failure: 0011 used to raise here rather than choose.
    """
    await _drop_account_constraint(db_session)

    alt = await _extra_character(db_session, account2, "account2alt")
    older = await _add_vote(db_session, praxis_solo, character2, 2, _BASE_TIME)
    newer = await _add_vote(
        db_session, praxis_solo, alt, 5, _BASE_TIME + timedelta(hours=1)
    )
    control = await _add_vote(
        db_session, praxis_solo, character3, 3, _BASE_TIME + timedelta(hours=2)
    )
    older_id, newer_id, control_id = older.id, newer.id, control.id

    await _run_upgrade(db_session)

    surviving_ids = {row.id for row in await _votes_for(db_session, praxis_solo)}
    assert surviving_ids == {newer_id, control_id}
    assert older_id not in surviving_ids

    survivor = await db_session.get(Vote, newer_id)
    assert survivor is not None
    assert survivor.value == 5
    assert survivor.voter_character_id == alt.id

    untouched = await db_session.get(Vote, control_id)
    assert untouched is not None
    assert untouched.value == 3
    assert untouched.voter_character_id == character3.id

    assert await _account_constraint_exists(db_session)


@pytest.mark.asyncio
async def test_upgrade_breaks_a_created_at_tie_on_the_higher_id(
    db_session: AsyncSession,
    praxis_solo: Praxis,
    account2: Account,
    character2: Character,
) -> None:
    """Identical timestamps still resolve deterministically — never table order."""
    await _drop_account_constraint(db_session)

    alt = await _extra_character(db_session, account2, "account2twin")
    first = await _add_vote(db_session, praxis_solo, character2, 1, _BASE_TIME)
    second = await _add_vote(db_session, praxis_solo, alt, 4, _BASE_TIME)
    first_id, second_id = first.id, second.id
    assert second_id > first_id

    await _run_upgrade(db_session)

    surviving = await _votes_for(db_session, praxis_solo)
    assert [row.id for row in surviving] == [second_id]
    assert surviving[0].value == 4


@pytest.mark.asyncio
async def test_upgrade_is_a_no_op_without_duplicates(
    db_session: AsyncSession,
    praxis_solo: Praxis,
    character2: Character,
    character3: Character,
) -> None:
    """The fresh-DB path: constraint already present, nothing to delete.

    ``0001_squashed`` builds from ``Base.metadata``, so CI meets 0011 in exactly
    this state. Running it twice also proves the dedupe is idempotent.
    """
    kept = await _add_vote(db_session, praxis_solo, character2, 2, _BASE_TIME)
    other = await _add_vote(db_session, praxis_solo, character3, 5, _BASE_TIME)
    expected = {(kept.id, 2), (other.id, 5)}

    await _run_upgrade(db_session)
    await _run_upgrade(db_session)

    surviving = await _votes_for(db_session, praxis_solo)
    assert {(row.id, row.value) for row in surviving} == expected
    assert await _account_constraint_exists(db_session)
