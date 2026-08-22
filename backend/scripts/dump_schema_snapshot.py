"""Dump the migrated schema to ``alembic/schema_snapshot.txt`` (#2448).

The snapshot is the repo's only description of the schema that is **not derived
from ``models/`` at runtime**. ``0002_squashed.upgrade()`` builds its tables with
``Base.metadata.create_all``, so a freshly migrated database is the ORM's schema
by construction and ``alembic check`` compares the models to themselves; a
committed file cannot do that, because it changes only when a human commits it.
``tests/integration/test_migrations_match_models.py`` diffs the two.

Run from ``backend/``::

    python scripts/dump_schema_snapshot.py

It builds its own throwaway database, runs ``alembic upgrade head`` against it,
introspects the result and drops it again — nothing else on the server is
touched, and no already-migrated database is trusted as the source.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import asyncpg
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from config import settings  # noqa: E402 — needs BACKEND_DIR on sys.path

SNAPSHOT_PATH = BACKEND_DIR / "alembic" / "schema_snapshot.txt"

#: How to regenerate, quoted verbatim in the test's failure message.
REGEN_COMMAND = "python scripts/dump_schema_snapshot.py   (from backend/)"

#: Its own scratch database, so regenerating never depends on — or disturbs —
#: the dev database or the shared test one.
SNAPSHOT_BUILD_DB = "wz_schema_snapshot_build"

HEADER = f"""\
# World Zero — migrated schema snapshot. GENERATED FILE; do not hand-edit.
#
# Regenerate with:  {REGEN_COMMAND}
#
# This file is a SECOND SOURCE for tests/integration/test_migrations_match_models.py.
# It is the only description of the schema in this repo that is not derived from
# models/ at runtime: 0002_squashed builds its tables with
# Base.metadata.create_all, so a freshly migrated database is the ORM's schema by
# construction and `alembic check` ends up comparing the models to themselves
# (#2448). A committed file cannot do that — it changes only when a human commits
# it, which is the entire point of it.
#
# THEREFORE: regenerating this file to clear a red test defeats the check. It is
# the same move as raising a coverage floor instead of writing the test. When the
# test goes red, READ its diff first and confirm every line is a change you
# intended and that a migration carries it forward on an already-deployed
# database. Only then regenerate and commit, in the same PR as the migration.
#
# Columns are sorted by name, not by ordinal position, so that adding one moves a
# single line. Constraint and index definitions are Postgres's own canonical text
# (pg_get_constraintdef / pg_get_indexdef).
"""


def _dsn(database: str) -> str:
    """A plain libpq DSN for ``database`` on the configured server."""
    base = make_url(os.environ.get("TEST_DATABASE_URL") or settings.DATABASE_URL)
    return base.set(drivername="postgresql", database=database).render_as_string(
        hide_password=False
    )


async def render_snapshot(dsn: str) -> str:
    """Introspect the database at ``dsn`` and render the snapshot text."""
    conn = await asyncpg.connect(dsn)
    try:
        enums = await conn.fetch(
            "SELECT t.typname, e.enumlabel FROM pg_type t"
            " JOIN pg_enum e ON e.enumtypid = t.oid"
            " JOIN pg_namespace n ON n.oid = t.typnamespace"
            " WHERE n.nspname = 'public'"
            " ORDER BY t.typname, e.enumsortorder"
        )
        columns = await conn.fetch(
            "SELECT c.relname AS tbl, a.attname AS col,"
            " format_type(a.atttypid, a.atttypmod) AS type,"
            " a.attnotnull,"
            # attidentity is Postgres's 1-byte "char"; asyncpg hands that back as
            # bytes, so the mapping to words is done in SQL where it is readable.
            " CASE a.attidentity WHEN 'a' THEN 'ALWAYS' WHEN 'd' THEN 'BY DEFAULT'"
            "  ELSE '' END AS identity,"
            " pg_get_expr(d.adbin, d.adrelid) AS default_expr"
            " FROM pg_class c"
            " JOIN pg_namespace n ON n.oid = c.relnamespace"
            " JOIN pg_attribute a ON a.attrelid = c.oid"
            "  AND a.attnum > 0 AND NOT a.attisdropped"
            " LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum"
            " WHERE n.nspname = 'public' AND c.relkind = 'r'"
            " ORDER BY c.relname, a.attname"
        )
        constraints = await conn.fetch(
            "SELECT c.relname AS tbl, con.conname AS name,"
            " pg_get_constraintdef(con.oid) AS def"
            " FROM pg_constraint con"
            " JOIN pg_class c ON c.oid = con.conrelid"
            " JOIN pg_namespace n ON n.oid = c.relnamespace"
            " WHERE n.nspname = 'public'"
            " ORDER BY c.relname, con.conname"
        )
        indexes = await conn.fetch(
            "SELECT tablename AS tbl, indexname AS name, indexdef AS def"
            " FROM pg_indexes WHERE schemaname = 'public'"
            " ORDER BY tablename, indexname"
        )
    finally:
        await conn.close()

    lines = [HEADER]

    values: dict[str, list[str]] = {}
    for row in enums:
        values.setdefault(row["typname"], []).append(row["enumlabel"])
    for typname, labels in sorted(values.items()):
        lines.append(f"enum {typname} = {', '.join(labels)}")
    lines.append("")

    # A PK/UNIQUE constraint owns an index of the same name; printing both would
    # say the same thing twice, and churn twice.
    constraint_names = {(row["tbl"], row["name"]) for row in constraints}

    for table in sorted({row["tbl"] for row in columns}):
        lines.append(f"table {table}")
        for row in columns:
            if row["tbl"] != table:
                continue
            parts = [f"  column {row['col']} {row['type']}"]
            if row["attnotnull"]:
                parts.append("NOT NULL")
            if row["identity"]:
                parts.append(f"GENERATED {row['identity']} AS IDENTITY")
            if row["default_expr"]:
                parts.append(f"DEFAULT {row['default_expr']}")
            lines.append(" ".join(parts))
        for row in constraints:
            if row["tbl"] == table:
                lines.append(f"  constraint {row['name']} {row['def']}")
        for row in indexes:
            if row["tbl"] == table and (table, row["name"]) not in constraint_names:
                lines.append(f"  index {row['name']} {row['def']}")
        lines.append("")

    return "\n".join(lines)


async def _build_and_dump() -> str:
    """Create a throwaway database, migrate it to head, render it, drop it."""
    admin = await asyncpg.connect(_dsn("postgres"))
    try:
        await admin.execute(
            f'DROP DATABASE IF EXISTS "{SNAPSHOT_BUILD_DB}" WITH (FORCE)'
        )
        await admin.execute(f'CREATE DATABASE "{SNAPSHOT_BUILD_DB}"')
    finally:
        await admin.close()

    try:
        upgrade = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_DIR,
            env={**os.environ, "DATABASE_URL": _dsn(SNAPSHOT_BUILD_DB)},
            capture_output=True,
            text=True,
        )
        if upgrade.returncode != 0:
            raise SystemExit(
                "alembic upgrade head failed; nothing written.\n"
                f"--- stdout ---\n{upgrade.stdout}\n--- stderr ---\n{upgrade.stderr}"
            )
        return await render_snapshot(_dsn(SNAPSHOT_BUILD_DB))
    finally:
        admin = await asyncpg.connect(_dsn("postgres"))
        try:
            await admin.execute(
                f'DROP DATABASE IF EXISTS "{SNAPSHOT_BUILD_DB}" WITH (FORCE)'
            )
        finally:
            await admin.close()


def main() -> None:
    snapshot = asyncio.run(_build_and_dump())
    SNAPSHOT_PATH.write_text(snapshot, encoding="utf-8", newline="\n")
    print(
        f"Wrote {SNAPSHOT_PATH.relative_to(BACKEND_DIR)} "
        f"({len(snapshot.splitlines())} lines)."
    )
    print("Now `git diff` it and confirm every changed line is one you intended.")


if __name__ == "__main__":
    main()
