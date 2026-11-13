"""The migration chain must produce the schema ``models/`` describes (#2426).

The rest of the suite builds its schema via ``create_all``, so this is the only
place the chain's result is checked. ``0002_squashed`` itself uses
``create_all``, so ``alembic check`` cannot see a model column with no revision;
two extra checks cover that:

* enum values: ``create_type=False`` (``alembic/env.py``) means migrations own
  every ``CREATE TYPE``, so DB values are independent of the models.
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
import subprocess
import sys
from pathlib import Path

import asyncpg
import pytest_asyncio
from alembic.config import Config
from alembic.script import ScriptDirectory
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
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env={**os.environ, "DATABASE_URL": _dsn(MIGRATION_TEST_DB)},
        capture_output=True,
        text=True,
    )


def _report(label: str, result: "subprocess.CompletedProcess[str]") -> str:
    return (
        f"`alembic {label}` exited {result.returncode}\n"
        f"--- stdout ---\n{result.stdout}\n--- stderr ---\n{result.stderr}"
    )


async def _enum_values_in_db(database: str) -> dict[str, set[str]]:
    conn = await asyncpg.connect(_dsn(database))
    try:
        rows = await conn.fetch(
            "SELECT t.typname, e.enumlabel FROM pg_type t"
            " JOIN pg_enum e ON e.enumtypid = t.oid"
            " JOIN pg_namespace n ON n.oid = t.typnamespace"
            " WHERE n.nspname = 'public'"
        )
    finally:
        await conn.close()

    found: dict[str, set[str]] = {}
    for row in rows:
        found.setdefault(row["typname"], set()).add(row["enumlabel"])
    return found


def _enum_values_in_models() -> dict[str, set[str]]:
    declared: dict[str, set[str]] = {}
    for table in Base.metadata.tables.values():
        for column in table.columns:
            type_ = column.type
            if isinstance(type_, SAEnum) and type_.name and type_.native_enum:
                declared.setdefault(type_.name, set()).update(type_.enums)
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
        "Enum values the models can produce that the migrated database has no "
        f"type member for: {missing}\n\n"
        "The rest of the suite cannot see this: its create_all schema emits its "
        "own CREATE TYPE. A deployed database will reject the value at INSERT. "
        "Add it to a migration (0002_squashed's ENUMS builds fresh databases; a "
        "deployed one needs ALTER TYPE ... ADD VALUE in a new revision)."
    )
    unreachable = {
        name: sorted(values - in_models.get(name, set()))
        for name, values in in_db.items()
        if values - in_models.get(name, set())
    }
    assert not unreachable, (
        "Enum values the migrations create that no model declares — states the "
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
            " status, task_type, created_by, primary_faction_slug,"
            " is_task_vision_eligible) VALUES ($1, 'old desc', 10, 0, 'active',"
            " 'standard', $2, 'na', false) RETURNING id",
            'Take a Picture of "Yourself"',
            character_id,
        )
        impostor_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by, primary_faction_slug,"
            " is_task_vision_eligible) VALUES ($1, 'a coincidence', 5, 0,"
            " 'pending', 'standard', $2, 'na', false) RETURNING id",
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
            " status, task_type, created_by, primary_faction_slug,"
            " is_task_vision_eligible) VALUES ($1, 'new desc', 10, 0, 'active',"
            " 'standard', $2, 'albescent', false) RETURNING id",
            "Introduce Yourself",
            character_id,
        )
        duplicate_id = await conn.fetchval(
            "INSERT INTO task (title, description, point_value, level_required,"
            " status, task_type, created_by, primary_faction_slug,"
            " is_task_vision_eligible) VALUES ($1, 'old desc', 10, 0, 'active',"
            " 'standard', $2, 'na', false) RETURNING id",
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


def test_revision_ids_fit_the_version_table() -> None:
    script = ScriptDirectory.from_config(Config(str(BACKEND_DIR / "alembic.ini")))
    too_long = {
        rev.revision: len(rev.revision)
        for rev in script.walk_revisions()
        if len(rev.revision) > VERSION_NUM_MAX_LEN
    }
    assert not too_long, (
        f"Revision ids longer than {VERSION_NUM_MAX_LEN} chars overflow "
        f"alembic_version.version_num and fail after the DDL has already "
        f"run: {too_long}"
    )
