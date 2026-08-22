"""The migration chain must produce the schema ``models/`` describes (#2426).

CI runs ``alembic upgrade head`` and then throws that schema away: every other
integration test builds its own via ``Base.metadata.create_all`` (see
``conftest.py``). So the migrations were only ever proved to *execute*. A column
a revision forgot, a type that diverged, an enum value added to a Python enum but
not to ``0002_squashed``'s ``ENUMS`` list — all of it passed CI green and would
first be seen on deploy, and ``main`` auto-deploys.

**Seam under test:** the migrated database vs. ``Base.metadata``, on a database
reached only through the chain. This deliberately does *not* change how the rest
of the suite gets its schema; it adds an independent check that the two agree.

⚠️ **What ``alembic check`` can and cannot see here, and why the enum check
exists.** ``0002_squashed.upgrade()`` builds every table with
``Base.metadata.create_all``. So on a *fresh* database the tables are the ORM's
by construction, and autogenerate can only ever report drift introduced by a
revision *after* the root — a revision that renames, retypes or drops something
the models still describe. It is structurally incapable of noticing the opposite
direction (a model column with no migration behind it), because the root absorbs
it silently. Verified, not assumed: a nullable column added to ``Task`` with no
revision leaves ``alembic check`` green (#2426).

Enum *values* are the exception, and the one the issue named as the known trap.
``create_type=False`` (forced for every enum in ``alembic/env.py``) means
``create_all`` emits no ``CREATE TYPE`` at all — migrations own every one of them
explicitly, in ``0002_squashed.ENUMS``. That makes the values in the migrated
database genuinely independent of the models, so comparing them is not circular:
a value added to a Python enum without being added to a migration shows up here,
and *only* here. It is invisible to ``alembic check`` (autogenerate does not
diff enum members) and invisible to the rest of the suite, whose ``create_all``
schema does emit ``CREATE TYPE`` and so always has the new value.

Closing the wider hole — model→migration drift for tables — needs a baseline
that is not derived from the live models (a checked-in schema snapshot, or a
root revision with static DDL). That is a schema-policy decision, not something
this test can assert its way around.

Runs on its own throwaway database, created and dropped here. It cannot use
``worldzero_test``: that one is shared (by CI's own ``upgrade head`` step, and by
parallel agents whose session-scoped ``drop_all`` teardown would pull tables out
from under a migration mid-run).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import asyncpg
import pytest_asyncio
from sqlalchemy import Enum as SAEnum
from sqlalchemy.engine import make_url

from alembic.config import Config
from alembic.script import ScriptDirectory
from config import settings
import models  # noqa: F401 — registers every mapped class on Base.metadata
from models.base import Base

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Named for the issue that introduced it, so a stray copy on a shared Postgres
# is traceable. Nothing else may point here.
MIGRATION_TEST_DB = "wz2426_test"

# ``alembic_version.version_num`` is VARCHAR(32). Overflow fails *mid*-upgrade,
# after the DDL has run, leaving a half-applied migration.
VERSION_NUM_MAX_LEN = 32

_BASE_URL = make_url(os.environ.get("TEST_DATABASE_URL") or settings.DATABASE_URL)


def _dsn(database: str) -> str:
    """A plain libpq DSN for ``database`` on the configured server."""
    return _BASE_URL.set(drivername="postgresql", database=database).render_as_string(
        hide_password=False
    )


def _alembic(*args: str) -> "subprocess.CompletedProcess[str]":
    """Run the alembic CLI the way ``start.sh`` and CI do, against the throwaway DB."""
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
    """Every public enum type in ``database``, mapped to its values."""
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
    """Every native Postgres enum the ORM declares, mapped to its values."""
    declared: dict[str, set[str]] = {}
    for table in Base.metadata.tables.values():
        for column in table.columns:
            type_ = column.type
            if isinstance(type_, SAEnum) and type_.name and type_.native_enum:
                declared.setdefault(type_.name, set()).update(type_.enums)
    return declared


@pytest_asyncio.fixture
async def migration_db() -> str:
    """An empty database of our own, dropped again however the test ends."""
    assert _BASE_URL.database != MIGRATION_TEST_DB, (
        f"{MIGRATION_TEST_DB!r} is this test's scratch database and gets DROPped "
        "below — the rest of the suite must not be pointed at it. Set "
        "TEST_DATABASE_URL to a different database name."
    )

    admin = await asyncpg.connect(_dsn("postgres"))
    try:
        await admin.execute(f'DROP DATABASE IF EXISTS "{MIGRATION_TEST_DB}" WITH (FORCE)')
        await admin.execute(f'CREATE DATABASE "{MIGRATION_TEST_DB}"')
    finally:
        await admin.close()

    yield MIGRATION_TEST_DB

    admin = await asyncpg.connect(_dsn("postgres"))
    try:
        await admin.execute(f'DROP DATABASE IF EXISTS "{MIGRATION_TEST_DB}" WITH (FORCE)')
    finally:
        await admin.close()


async def test_migrations_match_models(migration_db: str) -> None:
    """Upgrade to head, prove no drift, then prove the newest revision reverses.

    The three steps are one sequence on one database on purpose: ``check`` only
    means anything against a database the chain itself built, and the second
    ``check`` is what makes the down/up round trip an assertion rather than a
    smoke test — a downgrade that drops the wrong thing shows up there.
    """
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
        "The head revision has no working downgrade().\n\n" + _report("downgrade -1", down)
    )

    reupgrade = _alembic("upgrade", "head")
    assert reupgrade.returncode == 0, _report("upgrade head (after downgrade)", reupgrade)

    recheck = _alembic("check")
    assert recheck.returncode == 0, (
        "downgrade -1 followed by upgrade head did not restore the schema.\n\n"
        + _report("check (after round trip)", recheck)
    )


def test_revision_ids_fit_the_version_table() -> None:
    """``alembic_version.version_num`` is VARCHAR(32); a longer id fails mid-upgrade."""
    script = ScriptDirectory.from_config(Config(str(BACKEND_DIR / "alembic.ini")))
    too_long = {
        rev.revision: len(rev.revision)
        for rev in script.walk_revisions()
        if len(rev.revision) > VERSION_NUM_MAX_LEN
    }
    assert not too_long, (
        f"Revision ids longer than {VERSION_NUM_MAX_LEN} chars overflow "
        f"alembic_version.version_num and fail after the DDL has already run: {too_long}"
    )
