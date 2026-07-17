# DB migrations: squash policy, reset, deploy safety

How World Zero keeps its Alembic chain short and recovers when a squash
invalidates an existing DB. Read this before squashing migrations or resetting a DB.

**Current baseline:** `0001_squashed` (`down_revision = None`, the squashed root — the
head advances as new revisions stack on top; currently at `0003`) —
squashed 2026-07-14, collapsing legacy `0001`–`0013`. Its `upgrade()` builds the
whole schema from the live ORM models via `Base.metadata.create_all`, so it can
never drift from `models/`.

## Why this exists

A squash collapses `versions/*.py` into one revision. Every DB that was stamped
at an *old* revision now points at a revision that no longer exists, so
`alembic upgrade head` dies with `Can't locate revision identified by '0010_...'`
(exit 255). This happened in prod once. The pieces below make recovery a
one-command, no-mystery operation.

## Squash policy

Squash the `versions/` chain when **either**:
- it exceeds ~10 files, **or**
- opportunistically, before a known prod wipe, while we're still pre-launch.

## Strategy A — current (disposable-DB)

World Zero is **pre-launch**: production data is disposable today.

A squash = **rebuild the schema from the models** via `Base.metadata.create_all`
(that's all `0001_squashed.py` does). This requires **wiping every existing DB** —
prod *and* every local/worktree DB — because their old stamps are now dangling.

This strategy is only valid while data is disposable. The moment real user data
exists, switch to Strategy B.

## Strategy B — launch-time switch ⚠️ (warning stub, not yet built)

**⚠️ Before launch, switch to this.** When squashing a DB that holds real data,
you must NOT wipe it. The schema already matches the squashed revision, so:

1. Squash the chain as usual (new `0001_*` built from models).
2. On each live DB, `alembic stamp <new_head>` — moves the pointer, runs **no DDL**.
3. Verify `alembic current` == head; no `upgrade` needed.
4. Never drop/recreate a live DB to squash.

Flesh this out when actually needed — do not build or test the full stamp dance now.

## Blast radius of a squash

A squash invalidates the Alembic stamp in **every existing DB**.
- **Local / worktree:** run `backend/scripts/reset_db.sh` (does `docker-compose down -v`
  then rebuild + seed).
- **Prod / remote:** `backend/scripts/reset_db.sh --url <connection-string>` drops the
  public schema; the next deploy rebuilds. Typed-confirmation gated.

## CI is never affected

Tests do **not** use migrations. `tests/integration/conftest.py` builds the schema
with `Base.metadata.create_all` and drops it after. So squashing can never break CI.

## Deploy safety (`start.sh`)

Before `alembic upgrade head`, `start.sh` runs `scripts/check_db_stamp.py`. It
compares the DB's stamped revision against the revisions in `versions/`. If the
stamp is unknown (chain was squashed), it **exits non-zero** with the fix and
stops the deploy.

It will **never** auto-drop, auto-stamp, or self-heal — a deploy must never
destroy data on its own (catastrophic under Strategy B). Recovery is always a
human running `reset_db.sh`.

## How to actually squash (step-by-step)

Prerequisites: every environment is at the same schema state (or you're willing
to wipe), and you've read every model in `backend/models/` to know the final schema.

1. **Inventory enums.** `grep -rn "class.*enum.Enum" backend/models/`. For each,
   note the lowercase PG type name (`class AccountStatus` → `accountstatus`) and its values.
2. **Order tables by FK tier.** Tier 0 = no FK deps (`faction`, `contact_messages`);
   Tier 1 depends only on Tier 0 (`account`, `role`); Tier 2+ on prior tiers.
3. **Delete the chain.** `rm backend/alembic/versions/*.py`.
4. **Write `0001_squashed_initial.py`** with `down_revision = None` (the new root):
   - **A — enum types** via `op.execute("CREATE TYPE … AS ENUM (…)")`, each guarded
     by a `SELECT 1 FROM pg_type WHERE typname = :name` existence check.
   - **B — tables** via `op.create_table()` in FK order. Every `sa.Enum()` uses `create_type=False`.
   - **C — seed** reference data (factions, roles) with parameterized `ON CONFLICT DO NOTHING`.
   - **D — downgrade()** drops tables in reverse, then `DROP TYPE IF EXISTS` each enum.
5. **Verify** on a fresh DB: `alembic upgrade head`, then `alembic check` (drift),
   then a `downgrade base` → `upgrade head` round-trip, then spot-check seed rows.
6. **Stamp, don't upgrade, live DBs** that already hold the schema: `alembic stamp 0001_squashed`
   (writes the revision without running DDL — this is Strategy B above).

Future squashes are identical with a bumped id (`0002_squashed`, `down_revision = None`).

### The `create_type=False` convention (three-layer enum defense)

PG enum types are created once via `CREATE TYPE`; SQLAlchemy tries to auto-create them
whenever it sees `Enum()`, causing "type already exists" errors. So:

1. Every model `Enum()` column uses `create_type=False`.
2. `alembic/env.py` has a safety loop forcing `create_type=False` on all metadata enums.
3. Migrations own all `CREATE TYPE` via explicit `op.execute()`.
