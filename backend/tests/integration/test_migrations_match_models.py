"""The migration chain must produce the schema ``models/`` describes (#2426).

The rest of the suite builds its schema via ``create_all``, so this is the only
place the chain's result is checked. ``0002_squashed`` itself uses
``create_all``, so ``alembic check`` cannot see a model column with no revision;
two extra checks cover that:

* enum values: a model enum's ``ck_<table>_<enum>`` CHECK is created by a
  migration, so the DB's values are independent of the models.
* ``alembic/schema_snapshot.txt`` (#2448): a committed baseline, diffed like
  ``api-schema`` (#1584). Refreshing it blindly turns the check off.

``ponytail:`` the snapshot goes red on any schema change and can't tell migrated
from unmigrated; a human answers "where is the migration?". Upgrade: load the
snapshot, ``alembic stamp``, upgrade, check (needs snapshot to carry its revision).

Uses its own throwaway DB (name derived from ``TEST_DATABASE_URL``): the shared
test DB gets ``drop_all`` from parallel runners mid-migration.
"""
from __future__ import annotations

import difflib
import os
import re
import subprocess
import sys
from pathlib import Path

import asyncpg
import pytest
import pytest_asyncio
from sqlalchemy import Enum as SAEnum
from sqlalchemy.engine import make_url

import models  # noqa: F401 — registers every mapped class on Base.metadata
from config import settings
from models.base import Base
from scripts.dump_schema_snapshot import (
    REGEN_COMMAND,
    SNAPSHOT_PATH,
    render_snapshot,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]

# ``alembic_version.version_num`` is VARCHAR(32). Overflow fails *mid*-upgrade,
# after the DDL has run, leaving a half-applied migration.
VERSION_NUM_MAX_LEN = 32

MAX_DIFF_LINES = 60

_BASE_URL = make_url(os.environ.get("TEST_DATABASE_URL") or settings.DATABASE_URL)

# Derived, never fixed: it is DROPped unconditionally, so runners need their own.
MIGRATION_TEST_DB = f"{_BASE_URL.database}_migr"


def _dsn(database: str) -> str:
    return _BASE_URL.set(drivername="postgresql", database=database).render_as_string(
        hide_password=False
    )


def _alembic(*args: str) -> "subprocess.CompletedProcess[str]":
    _asyncpg_url = _dsn(MIGRATION_TEST_DB).replace("://", "+asyncpg://", 1)
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env={**os.environ, "DATABASE_URL": _asyncpg_url},
        capture_output=True,
        text=True,
    )


def _report(label: str, result: "subprocess.CompletedProcess[str]") -> str:
    return (
        f"`alembic {label}` exited {result.returncode}\n"
        f"--- stdout ---\n{result.stdout}\n--- stderr ---\n{result.stderr}"
    )


async def _enum_values_in_db(database: str) -> dict[str, set[str]]:
    """Values each ``ck_<table>_<enum>`` CHECK admits, keyed by that name."""
    conn = await asyncpg.connect(_dsn(database))
    try:
        rows = await conn.fetch(
            "SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint"
            " WHERE contype = 'c' AND connamespace = 'public'::regnamespace"
        )
    finally:
        await conn.close()
    return {
        row["conname"]: set(
            re.findall(r"'([^']*)'::character varying", row["definition"])
        )
        for row in rows
    }


def _enum_values_in_models() -> dict[str, set[str]]:
    declared: dict[str, set[str]] = {}
    for table in Base.metadata.tables.values():
        for column in table.columns:
            type_ = column.type
            if isinstance(type_, SAEnum) and type_.name:
                declared[f"ck_{table.name}_{type_.name}"] = set(type_.enums)
    return declared


@pytest_asyncio.fixture
async def migration_db() -> str:
    admin = await asyncpg.connect(_dsn("postgres"))
    try:
        await admin.execute(
            f'DROP DATABASE IF EXISTS "{MIGRATION_TEST_DB}" WITH (FORCE)'
        )
        await admin.execute(f'CREATE DATABASE "{MIGRATION_TEST_DB}"')
    finally:
        await admin.close()

    yield MIGRATION_TEST_DB

    admin = await asyncpg.connect(_dsn("postgres"))
    try:
        await admin.execute(
            f'DROP DATABASE IF EXISTS "{MIGRATION_TEST_DB}" WITH (FORCE)'
        )
    finally:
        await admin.close()


async def test_migrations_match_models(migration_db: str) -> None:
    """Upgrade, check, then down/up and re-check (catches a bad downgrade)."""
    upgrade = _alembic("upgrade", "head")
    assert upgrade.returncode == 0, _report("upgrade head", upgrade)

    check = _alembic("check")
    assert check.returncode == 0, (
        "The migration chain and models/ disagree. Autogenerate wants to emit "
        "operations that no revision performs, which means a deployed database "
        "would end up with a schema the ORM does not expect.\n\n"
        "Fix the migration (do NOT relax this check): add a revision carrying the "
        "change forward — see docs/agents/db-migrations.md.\n\n"
        + _report("check", check)
    )

    in_db = await _enum_values_in_db(migration_db)
    in_models = _enum_values_in_models()
    missing = {
        name: sorted(values - in_db.get(name, set()))
        for name, values in in_models.items()
        if values - in_db.get(name, set())
    }
    assert not missing, (
        "Enum values the models can produce that the migrated database's CHECK "
        f"rejects: {missing}\n\n"
        "The rest of the suite cannot see this: its create_all schema emits its "
        "own CHECK. A deployed database will reject the value at INSERT. "
        "Widen the CHECK in a new revision."
    )
    unreachable = {
        name: sorted(values - in_models.get(name, set()))
        for name, values in in_db.items()
        if name in in_models and values - in_models[name]
    }
    assert not unreachable, (
        "Enum values the CHECKs admit that no model declares — states the "
        f"database accepts and the application cannot produce: {unreachable}\n\n"
        "Drop them from the migration, or add them to the Python enum."
    )

    down = _alembic("downgrade", "-1")
    assert down.returncode == 0, (
        "The head revision has no working downgrade().\n\n"
        + _report("downgrade -1", down)
    )

    reupgrade = _alembic("upgrade", "head")
    assert reupgrade.returncode == 0, _report(
        "upgrade head (after downgrade)", reupgrade
    )

    recheck = _alembic("check")
    assert recheck.returncode == 0, (
        "downgrade -1 followed by upgrade head did not restore the schema.\n\n"
        + _report("check (after round trip)", recheck)
    )


async def test_migrated_schema_matches_the_committed_snapshot(
    migration_db: str,
) -> None:
    """#2448. ``read_text`` normalises a CRLF checkout to ``\\n``."""
    upgrade = _alembic("upgrade", "head")
    assert upgrade.returncode == 0, _report("upgrade head", upgrade)

    rendered = await render_snapshot(_dsn(migration_db))
    committed = SNAPSHOT_PATH.read_text(encoding="utf-8")
    if rendered == committed:
        return

    diff = list(
        difflib.unified_diff(
            committed.splitlines(),
            rendered.splitlines(),
            fromfile="alembic/schema_snapshot.txt (committed)",
            tofile="the database `alembic upgrade head` just built",
            lineterm="",
        )
    )
    shown = "\n".join(diff[:MAX_DIFF_LINES])
    if len(diff) > MAX_DIFF_LINES:
        shown += f"\n... and {len(diff) - MAX_DIFF_LINES} more diff line(s)."

    raise AssertionError(
        "The migrated schema and the committed snapshot disagree.\n\n"
        f"{shown}\n\n"
        "This is the check that sees what `alembic check` cannot: 0002_squashed "
        "builds its tables from Base.metadata, so a fresh database is the ORM's "
        "schema by construction and a model column with no revision behind it is "
        "absorbed silently (#2448). The committed file is not.\n\n"
        "IF YOU DID NOT INTEND A SCHEMA CHANGE, this is that drift: a model moved "
        "and no migration carries it forward, so an already-deployed database — "
        "production — will not have it. Add the revision; see "
        "docs/agents/db-migrations.md.\n\n"
        "IF YOU DID INTEND IT, regenerate the snapshot:\n"
        f"    {REGEN_COMMAND}\n"
        "then READ the diff it writes, line by line, and confirm every changed "
        "line is a change you meant AND that a migration carries it onto a "
        "deployed database. Commit it in the same PR as that migration. "
        "Refreshing this file to clear a red run without reading the diff turns "
        "the check off — it is the same move as raising a coverage floor instead "
        "of writing the test."
    )


async def test_onboarding_seed_key_backfill_survives_a_pre_0019_title_collision(
    migration_db: str,
) -> None:
    """#3064: ``0020``'s backfill must not key a same-titled impostor.

    A pre-0019 player task titled "Introduce Yourself" makes 0019's rename
    no-op, so the real row is still under the old title when 0020 runs.
    """
    stop_before_rename = _alembic("upgrade", "0018_account_notification_prefs")
    assert stop_before_rename.returncode == 0, _report(
        "upgrade 0018_account_notification_prefs", stop_before_rename
    )

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        await conn.execute(
            "INSERT INTO faction (slug, status) VALUES ('na', 'visible')"
        )
        account_id = await conn.fetchval(
            "INSERT INTO account (email, status) VALUES ($1, 'active') RETURNING id",
            "migration-test@example.com",
        )
        character_id = await conn.fetchval(
            "INSERT INTO character (account_id, username, display_name,"
            " faction_slug, status) VALUES ($1, 'migrator', 'Migrator', 'na',"
            " 'active') RETURNING id",
            account_id,
        )
        real_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by_id, primary_faction_slug)"
            " VALUES ($1, 'old desc', 10, 0, 'active',"
            " 'standard', $2, 'na') RETURNING id",
            'Take a Picture of "Yourself"',
            character_id,
        )
        impostor_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by_id, primary_faction_slug)"
            " VALUES ($1, 'a coincidence', 5, 0,"
            " 'pending', 'standard', $2, 'na') RETURNING id",
            "Introduce Yourself",
            character_id,
        )
    finally:
        await conn.close()

    upgrade_head = _alembic("upgrade", "head")
    assert upgrade_head.returncode == 0, _report("upgrade head", upgrade_head)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        real_row = await conn.fetchrow(
            "SELECT seed_key, title FROM task WHERE id = $1", real_id
        )
        impostor_row = await conn.fetchrow(
            "SELECT seed_key FROM task WHERE id = $1", impostor_id
        )
    finally:
        await conn.close()

    assert real_row["seed_key"] == "onboarding_task"
    assert real_row["title"] == 'Take a Picture of "Yourself"'
    assert impostor_row["seed_key"] is None


async def test_onboarding_seed_key_backfill_matches_dev_recorded_state(
    migration_db: str,
) -> None:
    """Mirror of the case above, dev's real shape (``fa5f4cfa``).

    Real row (low id) under the NEW title, duplicate under the OLD. Only
    "lowest id wins, whichever title" handles both cases.
    """
    stop_before_rename = _alembic("upgrade", "0018_account_notification_prefs")
    assert stop_before_rename.returncode == 0, _report(
        "upgrade 0018_account_notification_prefs", stop_before_rename
    )

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        await conn.execute(
            "INSERT INTO faction (slug, status) VALUES ('na', 'visible'),"
            " ('albescent', 'visible')"
        )
        account_id = await conn.fetchval(
            "INSERT INTO account (email, status) VALUES ($1, 'active') RETURNING id",
            "migration-test-2@example.com",
        )
        character_id = await conn.fetchval(
            "INSERT INTO character (account_id, username, display_name,"
            " faction_slug, status) VALUES ($1, 'migrator2', 'Migrator2', 'na',"
            " 'active') RETURNING id",
            account_id,
        )
        real_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by_id, primary_faction_slug)"
            " VALUES ($1, 'new desc', 10, 0, 'active',"
            " 'standard', $2, 'albescent') RETURNING id",
            "Introduce Yourself",
            character_id,
        )
        duplicate_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by_id, primary_faction_slug)"
            " VALUES ($1, 'old desc', 10, 0, 'active',"
            " 'standard', $2, 'na') RETURNING id",
            'Take a Picture of "Yourself"',
            character_id,
        )
    finally:
        await conn.close()

    upgrade_head = _alembic("upgrade", "head")
    assert upgrade_head.returncode == 0, _report("upgrade head", upgrade_head)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        real_row = await conn.fetchrow(
            "SELECT seed_key FROM task WHERE id = $1", real_id
        )
        duplicate_row = await conn.fetchrow(
            "SELECT seed_key FROM task WHERE id = $1", duplicate_id
        )
    finally:
        await conn.close()

    assert real_id < duplicate_id
    assert real_row["seed_key"] == "onboarding_task"
    assert duplicate_row["seed_key"] is None



async def test_all_time_score_moves_to_character_and_back(migration_db: str) -> None:
    """#3434: upgrade takes the latest era row's total; downgrade restores it."""
    assert _alembic("upgrade", "head").returncode == 0
    back = _alembic("downgrade", "0028_lower_unique_handles")
    assert back.returncode == 0, _report("downgrade to 0028", back)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        await conn.execute(
            "INSERT INTO faction (slug, status) VALUES ('na', 'visible')"
        )
        account_id = await conn.fetchval(
            "INSERT INTO account (email, status)"
            " VALUES ('atsm@example.com', 'active') RETURNING id"
        )
        character_id = await conn.fetchval(
            "INSERT INTO character"
            " (account_id, username, display_name, faction_slug, status)"
            " VALUES ($1, 'atsm', 'Atsm', 'na', 'active') RETURNING id",
            account_id,
        )
        era_ids = [
            await conn.fetchval(
                "INSERT INTO era (name, config_key, started_by)"
                " VALUES ($1, 'era_1', $2) RETURNING id",
                name,
                account_id,
            )
            for name in ("first", "second")
        ]
        for era_id, total in zip(era_ids, (40, 90)):
            await conn.execute(
                "INSERT INTO character_stats (character_id, era_id, all_time_score)"
                " VALUES ($1, $2, $3)",
                character_id,
                era_id,
                total,
            )
    finally:
        await conn.close()

    up = _alembic("upgrade", "head")
    assert up.returncode == 0, _report("upgrade head", up)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        assert await conn.fetchval(
            "SELECT all_time_score FROM character WHERE id = $1", character_id
        ) == 90
    finally:
        await conn.close()


async def test_albescent_booleans_become_secret_faction_rows(migration_db: str) -> None:
    """ADR-0097: stamps survive the column drop as rows for ``albescent``."""
    assert _alembic("upgrade", "head").returncode == 0
    back = _alembic("downgrade", "0029_all_time_score_on_character")
    assert back.returncode == 0, _report("downgrade to 0029", back)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        stamped_id = await conn.fetchval(
            "INSERT INTO account"
            " (email, status, albescent_unlocked, albescent_glimpsed)"
            " VALUES ('stamped@example.com', 'active', true, true) RETURNING id"
        )
        await conn.execute(
            "INSERT INTO account (email, status) VALUES ('plain@example.com', 'active')"
        )
    finally:
        await conn.close()

    up = _alembic("upgrade", "head")
    assert up.returncode == 0, _report("upgrade head", up)

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        rows = await conn.fetch(
            "SELECT account_id, faction_slug, revealed, unlocked, glimpsed"
            " FROM account_secret_faction"
        )
    finally:
        await conn.close()
    assert [tuple(row.values()) for row in rows] == [
        (stamped_id, "albescent", False, True, True)
    ]


async def _columns(database: str, table: str) -> set[str]:
    conn = await asyncpg.connect(_dsn(database))
    try:
        rows = await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
            table,
        )
    finally:
        await conn.close()
    return {row["column_name"] for row in rows}


async def _tables(database: str) -> set[str]:
    conn = await asyncpg.connect(_dsn(database))
    try:
        rows = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
    finally:
        await conn.close()
    return {row["tablename"] for row in rows}


async def test_schema_cleanup_chain_round_trips_through_the_old_shape(
    migration_db: str,
) -> None:
    """#3436-#3441: 0031-0036 reverse to the old schema and re-apply cleanly."""
    assert _alembic("upgrade", "head").returncode == 0
    back = _alembic("downgrade", "0030_account_secret_faction")
    assert back.returncode == 0, _report("downgrade to 0030", back)

    assert "status" in await _columns(migration_db, "relationship")
    assert {"has_submitted", "submitted_at"} <= await _columns(
        migration_db, "praxis_member"
    )
    assert "is_task_vision_eligible" in await _columns(migration_db, "task")
    assert "created_by" in await _columns(migration_db, "task")
    assert "contact_messages" in await _tables(migration_db)

    up = _alembic("upgrade", "head")
    assert up.returncode == 0, _report("upgrade head", up)
    assert "status" not in await _columns(migration_db, "relationship")
    assert {"has_approved", "approved_at"} <= await _columns(
        migration_db, "praxis_member"
    )
    assert "created_by_id" in await _columns(migration_db, "task")
    assert "contact_message" in await _tables(migration_db)
    check = _alembic("check")
    assert check.returncode == 0, _report("check", check)


async def test_check_constraint_migration_refuses_a_violating_row(
    migration_db: str,
) -> None:
    """#3441: 0036 names the offending rows instead of deleting them."""
    assert _alembic("upgrade", "0035_index_hot_foreign_keys").returncode == 0
    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        await conn.execute(
            "INSERT INTO faction (slug, status) VALUES ('na', 'visible')"
        )
        account_id = await conn.fetchval(
            "INSERT INTO account (email, status)"
            " VALUES ('self@example.com', 'active') RETURNING id"
        )
        character_id = await conn.fetchval(
            "INSERT INTO character (account_id, username, display_name,"
            " faction_slug, status) VALUES ($1, 'selfie', 'Selfie', 'na', 'active')"
            " RETURNING id",
            account_id,
        )
        # The root already built it; drop it to stand in for a pre-0036 DB.
        await conn.execute(
            "ALTER TABLE relationship"
            " DROP CONSTRAINT ck_relationship_no_self_relationship"
        )
        await conn.execute(
            "INSERT INTO relationship (from_character_id, to_character_id, type)"
            " VALUES ($1, $1, 'friend')",
            character_id,
        )
    finally:
        await conn.close()

    refused = _alembic("upgrade", "head")
    assert refused.returncode != 0
    assert "relationship has 1 rows violating" in refused.stderr


async def _insert_task_and_character(conn: asyncpg.Connection) -> tuple[int, int]:
    await conn.execute("INSERT INTO faction (slug, status) VALUES ('na', 'visible')")
    account_id = await conn.fetchval(
        "INSERT INTO account (email, status)"
        " VALUES ('p@example.com', 'active') RETURNING id"
    )
    character_id = await conn.fetchval(
        "INSERT INTO character"
        " (account_id, username, display_name, faction_slug, status)"
        " VALUES ($1, 'pat', 'Pat', 'na', 'active') RETURNING id",
        account_id,
    )
    task_id = await conn.fetchval(
        "INSERT INTO task (title, point_value, level_required, status, created_by_id)"
        " VALUES ('t', 10, 0, 'active', $1) RETURNING id",
        character_id,
    )
    return task_id, character_id


async def test_lifecycle_check_migration_stamps_era_and_refuses_the_rest(
    migration_db: str,
) -> None:
    """#3450: 0039 stamps an unsealed-era praxis, names a bad duel, keeps the row."""
    assert _alembic("upgrade", "0038_praxis_text_not_null").returncode == 0
    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        task_id, character_id = await _insert_task_and_character(conn)
        account_id = await conn.fetchval("SELECT id FROM account LIMIT 1")
        era_id = await conn.fetchval(
            "INSERT INTO era (name, config_key, started_by_id, started_at)"
            " VALUES ('e', 'era_1', $1, now() - interval '1 day') RETURNING id",
            account_id,
        )
        for name in (
            "ck_praxis_submitted_has_stamps",
            "ck_duel_declined_has_declined_at",
        ):
            table = name.split("_")[1]
            await conn.execute(f"ALTER TABLE {table} DROP CONSTRAINT {name}")
        praxis_id = await conn.fetchval(
            "INSERT INTO praxis (task_id, type, created_by_id, status, submitted_at)"
            " VALUES ($1, 'solo', $2, 'submitted', now()) RETURNING id",
            task_id,
            character_id,
        )
        duel_id = await conn.fetchval(
            "INSERT INTO duel"
            " (task_id, challenger_praxis_id, opponent_character_id, status)"
            " VALUES ($1, $2, $3, 'declined') RETURNING id",
            task_id,
            praxis_id,
            character_id,
        )
    finally:
        await conn.close()

    refused = _alembic("upgrade", "head")
    assert refused.returncode != 0
    assert "duel has 1 rows violating" in refused.stderr
    assert f"[{duel_id}]" in refused.stderr

    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        assert await conn.fetchval(
            "SELECT count(*) FROM duel WHERE id = $1", duel_id
        ) == 1
        await conn.execute("UPDATE duel SET declined_at = now() WHERE id = $1", duel_id)
    finally:
        await conn.close()
    up = _alembic("upgrade", "head")
    assert up.returncode == 0, _report("upgrade head", up)
    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        assert await conn.fetchval(
            "SELECT era_id FROM praxis WHERE id = $1", praxis_id
        ) == era_id
    finally:
        await conn.close()


async def test_enum_and_praxis_text_migrations_convert_real_rows(
    migration_db: str,
) -> None:
    """#3448/#3449: native-enum rows survive; NULL text becomes ''."""
    assert _alembic("upgrade", "head").returncode == 0
    back = _alembic("downgrade", "0036_check_constraints")
    assert back.returncode == 0, _report("downgrade to 0036", back)
    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        assert await conn.fetchval(
            "SELECT udt_name FROM information_schema.columns"
            " WHERE table_name = 'praxis' AND column_name = 'status'"
        ) == "praxisstatus"
        task_id, character_id = await _insert_task_and_character(conn)
        praxis_id = await conn.fetchval(
            "INSERT INTO praxis"
            " (task_id, type, created_by_id, title, body_text, admin_note)"
            " VALUES ($1, 'solo', $2, NULL, NULL, NULL) RETURNING id",
            task_id,
            character_id,
        )
    finally:
        await conn.close()

    up = _alembic("upgrade", "head")
    assert up.returncode == 0, _report("upgrade head", up)
    conn = await asyncpg.connect(_dsn(migration_db))
    try:
        row = await conn.fetchrow(
            "SELECT status, title, body_text, admin_note FROM praxis WHERE id = $1",
            praxis_id,
        )
        assert tuple(row) == ("in_progress", "", "", "")
        assert await conn.fetchval(
            "SELECT count(*) FROM pg_type WHERE typname = 'praxisstatus'"
        ) == 0
        for statement in (
            "INSERT INTO praxis (task_id, type, created_by_id, status)"
            f" VALUES ({task_id}, 'solo', {character_id}, 'bogus')",
            "INSERT INTO praxis (task_id, type, created_by_id, title)"
            f" VALUES ({task_id}, 'solo', {character_id}, NULL)",
        ):
            with pytest.raises(asyncpg.PostgresError):
                await conn.execute(statement)
    finally:
        await conn.close()
    check = _alembic("check")
    assert check.returncode == 0, _report("check", check)
