# DB migrations: squash policy, reset, deploy safety

How World Zero keeps its Alembic chain short and recovers when a squash
invalidates an existing DB. Read this before squashing migrations or resetting a DB.

**Current baseline:** `0002_squashed` (`down_revision = None`, the squashed root;
the head advances as new revisions stack on top) — squashed 2026-08-02 (#1398),
collapsing `0001_squashed` + `0002`–`0011`.
Its `upgrade()` builds the whole schema from the live ORM models via
`Base.metadata.create_all`, so it can never drift from `models/`.

**That `create_all` is why every new revision must be a carry-forward.** On a
fresh database the root has already built your column by the time your revision
runs, so a plain `ADD COLUMN` raises `DuplicateColumn` and the build dies before
a single test does. Write `ADD COLUMN IF NOT EXISTS` — the same shape the
collapsed `0002`–`0011` used, and the shape `0003_character_tagline` uses now.

Every revision it replaced was a *carry-forward*: `0002`–`0011` existed only to bring
already-deployed databases to a shape `create_all` had been producing on fresh ones
since the model changed. Nothing was lost by collapsing them.

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
(that's all the squashed root does). This requires **wiping every existing DB** —
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
- **Prod / remote:** run `python scripts/reset_render_db.py` from **Render Shell**
  (worldzero-backend → Shell). `render.yaml` already injects `DATABASE_URL` there from the
  `worldzero-db` instance, so no connection string is pasted or stored on a laptop. It drops
  the public schema and empties the media disk, then **stops** — redeploy afterwards and
  `start.sh` migrates and seeds. Typed-confirmation gated on the database name, with the
  target host printed first.
  (`reset_db.sh --url <connection-string>` still works from a machine that has the `psql`
  client; the prod image does not ship one.)

  ⚠️ **Never run `alembic upgrade head` from Render Shell during a squash recovery.** The
  Shell attaches to the currently-*running* instance, which is the last **successful**
  deploy — by definition the image with the OLD chain. Migrating from there stamps the DB
  at the old head, which is exactly the stamp the incoming deploy refuses, so every reset
  re-creates the condition it was meant to clear. This cost a live loop on 2026-08-02.
  An **empty, unstamped** database is the goal: `check_db_stamp.stamp_is_known` passes a
  fresh DB, so the new image migrates it correctly.

## The media disk survives every wipe ⚠️

`MEDIA_ROOT` is a separate volume. Nothing above touches it — dropping the public schema,
`reset_db.sh`, `alembic downgrade base`. So after any wipe **every file on disk is
orphaned**, and because character ids restart at 1 the next character to sign up writes
into the previous occupant's directory. That surprise is what produced #1565.

Two tools, different jobs:

- `backend/scripts/reset_render_db.py` **empties** `MEDIA_ROOT` as part of a Render reset
  (`--keep-media` skips it). Blunt: it assumes the disk is meant to be empty, which is true
  only in lockstep with the schema drop it accompanies.
- `backend/scripts/sweep_orphan_media.py` **reconciles** disk against database — it removes
  only files no `Character.avatar_url` or `MediaItem.file_path` row claims, so it is safe to
  run against a live disk. Dry run by default; `--apply` to unlink.

Use the sweep for anything a past wipe left behind, and for any environment (local,
self-managed) reset by other means.

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
4. **Write the new root** with `down_revision = None`:
   - **A — enum types** via `op.execute("DO $$ … CREATE TYPE … AS ENUM (…) … $$;")`,
     each guarded so re-running is a no-op. Keep the values in declaration order —
     Postgres sorts an enum by the order its values were added.
   - **B — tables** via `Base.metadata.create_all(op.get_bind())`. This is the whole
     point: the baseline is generated from the models, so it cannot drift from them
     and every model-level index / identity / type change ships for free. (Steps 1–2
     still matter — enums are the one thing `create_all` must *not* emit.)
   - **C — reference data** is `seed.py`'s job, not the migration's; `start.sh` runs
     it right after `alembic upgrade head`.
   - **D — downgrade()** is `Base.metadata.drop_all` then `DROP TYPE IF EXISTS` each
     enum, in reverse.
   - **Revision id must be ≤ 32 chars** — `alembic_version.version_num` is
     `varchar(32)`, and an over-long id only fails *after* the DDL has run.
     `backend/tests/test_migration_revision_ids.py` guards this.
5. **Verify** on a fresh DB: `alembic upgrade head`, then `alembic check` (drift),
   then a `downgrade base` → `upgrade head` round-trip, then seed and spot-check the
   rows. Do this by hand against a real Postgres — CI builds from
   `Base.metadata.create_all`, so a green `pytest` proves nothing about the migration.
6. **Stamp, don't upgrade, live DBs** that already hold the schema:
   `alembic stamp <new_root>` (writes the revision without running DDL — this is
   Strategy B above). Under Strategy A you wipe instead; see "Blast radius".
7. **Delete any test coupled to a revision you removed.** A test that imports a
   migration module by path (there was one for `0011`) breaks at collection.

Future squashes are identical with a bumped id (next is `0003_squashed`,
`down_revision = None`).

## Schema-wide column conventions (#1398)

Signed off by the owner on 2026-07-30 as prose only, and recorded here rather than in
an ADR because this file already owns the baseline these conventions ship in. They are
worth the words because the sweep that introduced them said "across all models" with
no enumeration — so the inventory below is what makes "did we get all of them?"
answerable. `backend/tests/unit/test_model_conventions.py` enforces the same three
rules against `Base.metadata`, so a new model cannot quietly opt out; this table is
the human-readable half.

1. **Naming convention on the metadata.** `models/base.py` sets
   `MetaData(naming_convention=NAMING_CONVENTION)` — `ix_`/`uq_`/`ck_`/`fk_`/`pk_`
   patterns — so every constraint has a deterministic, predictable name. Under
   Strategy B a squash can no longer rebuild the schema, and every change becomes a
   named-object `ALTER`; there has to be a name to aim at. An explicit `name=` on a
   model still wins verbatim. The `ck_` pattern interpolates `constraint_name`, so
   declare a CHECK with its **bare** name (`name="one_target"` → `ck_comment_one_target`).
2. **`Identity()`, not `SERIAL`.** PostgreSQL's own "Don't Do This" page names serial
   for its owned-sequence dependency and permission quirks. Every surrogate key is
   `BIGINT GENERATED BY DEFAULT AS IDENTITY`.
3. **`BigInteger` primary keys, and matching foreign keys.** Insurance. Widening a live
   PK plus every FK referencing it rewrites half the database; before real rows exist
   it costs nothing. Note that Postgres will happily accept an `INTEGER` FK pointing at
   a `BIGINT` PK, so a missed column fails *silently* — hence the test and this table.

`praxis.era_id` (nullable FK to `era`, stamped on the transition to `submitted` by
`services/collab_consensus._apply_seal`) shipped in the same sweep. Its consumer is
#1345's era-bounded score recalculation.

### Model inventory

Every table, its primary key, and its integer foreign keys. `faction` is the one
deliberate exception to rules 2 and 3: its primary key is the human-written `slug`
(ADR-0038), so the five `*_faction_slug` columns are `VARCHAR` foreign keys.

| Model file | Table | Primary key | Integer (BIGINT) foreign keys |
|---|---|---|---|
| `account.py` | `account` | `id` | `active_character_id` |
| `account.py` | `account_tombstone` | `id` | `account_id` |
| `account.py` | `oauth_provider` | `id` | `account_id` |
| `character.py` | `character` | `id` | `account_id` (+ `faction_slug`, string) |
| `character_block.py` | `character_block` | `id` | `blocker_character_id`, `blocked_character_id` |
| `character_stats.py` | `character_stats` | `id` | `character_id`, `era_id` |
| `comment.py` | `comment` | `id` | `praxis_id`, `task_id`, `created_by_id` |
| `comment.py` | `comment_mention` | `id` | `comment_id`, `mentioned_character_id` |
| `contact.py` | `contact_messages` | `id` | — |
| `duel.py` | `duel` | `id` | `task_id`, `challenger_praxis_id`, `opponent_praxis_id`, `opponent_character_id`, `forfeited_by_character_id`, `winner_character_id`, `resolved_era_id` |
| `era.py` | `era` | `id` | `started_by` |
| `faction.py` | `faction` | `slug` (**VARCHAR — the exception**) | — |
| `faction_defection_history.py` | `faction_defection_history` | `id` | `character_id`, `era_id` (+ `faction_slug`, string) |
| `feed_dismissal.py` | `feed_dismissal` | `id` | `character_id` |
| `flag.py` | `flag` | `id` | `praxis_id`, `comment_id`, `flagged_by` |
| `invitation_letter.py` | `invitation_letter` | `id` | `character_id`, `era_id` (+ `faction_slug`, string) |
| `meta_task.py` | `praxis_meta_task` | `(praxis_id, task_id)` — **composite, no `Identity()`** | `praxis_id`, `task_id` |
| `nudge.py` | `nudge` | `id` | `from_character_id`, `to_character_id`, `praxis_id` |
| `praxis.py` | `praxis` | `id` | `task_id`, `created_by_id`, `era_id` |
| `praxis.py` | `praxis_member` | `id` | `praxis_id`, `character_id` |
| `praxis.py` | `media_item` | `id` | `praxis_id` |
| `praxis.py` | `praxis_invite` | `id` | `praxis_id`, `inviter_id`, `invitee_id` |
| `praxis_room.py` | `praxis_room_update` | `id` | `praxis_id` |
| `relationship.py` | `relationship` | `id` | `from_character_id`, `to_character_id` |
| `roles.py` | `role` | `id` | — |
| `roles.py` | `account_role` | `id` | `account_id`, `role_id`, `granted_by` |
| `task.py` | `task` | `id` | `created_by` (+ `primary_faction_slug`, `metatask_faction_slug`, strings) |
| `taunt_message.py` | `taunt_message` | `id` | `from_character_id`, `to_character_id` |
| `terms_acceptance.py` | `terms_acceptance` | `id` | `account_id` |
| `vote.py` | `vote` | `id` | `praxis_id`, `voter_character_id`, `voter_account_id` |

30 tables, 56 integer foreign keys, 5 string ones.

`backend/tests/unit/test_model_conventions.py` parses this table and asserts both
halves against `Base.metadata`, so a new model that skips this list fails there.

### The `create_type=False` convention (three-layer enum defense)

PG enum types are created once via `CREATE TYPE`; SQLAlchemy tries to auto-create them
whenever it sees `Enum()`, causing "type already exists" errors. So:

1. Every model `Enum()` column uses `create_type=False`.
2. `alembic/env.py` has a safety loop forcing `create_type=False` on all metadata enums.
3. Migrations own all `CREATE TYPE` via explicit `op.execute()`.
