"""SESSION M — Unify metatasks as a task type.

Before this migration:
- ``meta_task`` is a standalone table with its own schema (name, description,
  faction_slug, bonus_type, bonus_value, level_required).
- ``praxis_meta_task.meta_task_id`` points at ``meta_task.id``.
- ``BonusType`` (``flat`` | ``percentage``) enum exists but only ``flat`` is used.

After this migration:
- ``task`` gains a ``task_type`` enum column (``standard`` | ``metatask``) and a
  nullable ``metatask_faction_slug`` FK to ``faction.slug``.
- Each row in ``meta_task`` is migrated to a new ``task`` row with
  ``task_type='metatask'``. Mapping: ``name → title``, ``description →
  description``, ``int(bonus_value) → point_value``, ``level_required``,
  ``faction_slug`` → both ``primary_faction_slug`` and ``metatask_faction_slug``.
- ``praxis_meta_task.meta_task_id`` is renamed to ``task_id`` and repointed at
  the newly-created task rows via a temporary ``meta_task_id_legacy`` bridge
  column that maps each historical meta_task to the new task id.
- The ``meta_task`` table and the ``bonustype`` enum are dropped.

``created_by`` for migrated metatask rows is set to the oldest character id in
the DB — the "pixie" admin seed in practice. If no characters exist at
migration time (fresh DB, no live metatasks), this block is a no-op. The
downgrade path reverses the mapping.

All DDL is idempotent so this can be re-run during development.

Revision ID: 0006_metatask_unification
Revises: 0005_vote_budget_recompute
Create Date: 2026-04-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_metatask_unification"
down_revision: Union[str, None] = "0005_vote_budget_recompute"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Create the tasktype enum (idempotent). ---------------------------
    op.execute(sa.text(
        """
        DO $$ BEGIN
            CREATE TYPE tasktype AS ENUM ('standard', 'metatask');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    ))

    # --- 2. Add new columns to task. -----------------------------------------
    op.execute(sa.text(
        """
        ALTER TABLE task
        ADD COLUMN IF NOT EXISTS task_type tasktype NOT NULL DEFAULT 'standard'
        """
    ))
    op.execute(sa.text(
        """
        ALTER TABLE task
        ADD COLUMN IF NOT EXISTS metatask_faction_slug VARCHAR
        """
    ))
    # Add FK for metatask_faction_slug if not already present.
    op.execute(sa.text(
        """
        DO $$ BEGIN
            ALTER TABLE task
            ADD CONSTRAINT task_metatask_faction_slug_fkey
            FOREIGN KEY (metatask_faction_slug) REFERENCES faction(slug);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    ))

    # --- 3. Data migration: copy meta_task rows into task. -------------------
    # Only runs if the meta_task table still exists (it should at this point).
    conn = op.get_bind()
    meta_task_exists = conn.execute(
        sa.text(
            "SELECT to_regclass('public.meta_task') IS NOT NULL"
        )
    ).scalar()

    if meta_task_exists:
        # Pick a sentinel created_by — the oldest character in the DB.
        # Fallback: if there are no characters at all, skip migration (nothing
        # to point a Task FK at anyway — a fresh DB has no live metatasks).
        oldest_character_id = conn.execute(
            sa.text("SELECT id FROM character ORDER BY id ASC LIMIT 1")
        ).scalar()

        if oldest_character_id is not None:
            # Add a transient bridge column on task that records which legacy
            # meta_task.id each new Task row was migrated from. Dropped below.
            op.execute(sa.text(
                """
                ALTER TABLE task
                ADD COLUMN IF NOT EXISTS _legacy_meta_task_id INTEGER
                """
            ))

            # Insert a task row per meta_task row.
            op.execute(sa.text(
                f"""
                INSERT INTO task (
                    title,
                    description,
                    point_value,
                    level_required,
                    status,
                    task_type,
                    created_by,
                    primary_faction_slug,
                    metatask_faction_slug,
                    is_task_vision_eligible,
                    created_at,
                    updated_at,
                    _legacy_meta_task_id
                )
                SELECT
                    name,
                    description,
                    CAST(bonus_value AS INTEGER),
                    level_required,
                    'active',
                    'metatask',
                    {oldest_character_id},
                    faction_slug,
                    faction_slug,
                    FALSE,
                    created_at,
                    updated_at,
                    id
                FROM meta_task
                """
            ))

            # Remap praxis_meta_task.meta_task_id → new task.id.
            # Strategy: add task_id column, backfill from the bridge, drop
            # meta_task_id, then drop the bridge column.
            op.execute(sa.text(
                """
                ALTER TABLE praxis_meta_task
                ADD COLUMN IF NOT EXISTS task_id INTEGER
                """
            ))
            op.execute(sa.text(
                """
                UPDATE praxis_meta_task pmt
                SET task_id = t.id
                FROM task t
                WHERE t._legacy_meta_task_id = pmt.meta_task_id
                """
            ))

            # Drop FK + old column.
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    DROP CONSTRAINT IF EXISTS praxis_meta_task_meta_task_id_fkey;
                EXCEPTION WHEN undefined_object THEN NULL; END $$;
                """
            ))
            op.execute(sa.text(
                """
                ALTER TABLE praxis_meta_task
                DROP CONSTRAINT IF EXISTS praxis_meta_task_pkey
                """
            ))
            op.execute(sa.text(
                "ALTER TABLE praxis_meta_task DROP COLUMN IF EXISTS meta_task_id"
            ))

            op.execute(sa.text(
                "ALTER TABLE praxis_meta_task ALTER COLUMN task_id SET NOT NULL"
            ))
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    ADD CONSTRAINT praxis_meta_task_task_id_fkey
                    FOREIGN KEY (task_id) REFERENCES task(id);
                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
                """
            ))
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    ADD CONSTRAINT praxis_meta_task_pkey
                    PRIMARY KEY (praxis_id, task_id);
                EXCEPTION WHEN duplicate_object THEN NULL;
                      WHEN invalid_table_definition THEN NULL; END $$;
                """
            ))

            # Drop the transient bridge column.
            op.execute(sa.text(
                "ALTER TABLE task DROP COLUMN IF EXISTS _legacy_meta_task_id"
            ))
        else:
            # No characters in the DB — praxis_meta_task must also be empty,
            # but rename the column anyway to match the new schema.
            op.execute(sa.text(
                """
                ALTER TABLE praxis_meta_task
                ADD COLUMN IF NOT EXISTS task_id INTEGER
                """
            ))
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    DROP CONSTRAINT IF EXISTS praxis_meta_task_meta_task_id_fkey;
                EXCEPTION WHEN undefined_object THEN NULL; END $$;
                """
            ))
            op.execute(sa.text(
                """
                ALTER TABLE praxis_meta_task
                DROP CONSTRAINT IF EXISTS praxis_meta_task_pkey
                """
            ))
            op.execute(sa.text(
                "ALTER TABLE praxis_meta_task DROP COLUMN IF EXISTS meta_task_id"
            ))
            # Can't set NOT NULL without data, but the table is empty.
            op.execute(sa.text(
                "ALTER TABLE praxis_meta_task ALTER COLUMN task_id SET NOT NULL"
            ))
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    ADD CONSTRAINT praxis_meta_task_task_id_fkey
                    FOREIGN KEY (task_id) REFERENCES task(id);
                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
                """
            ))
            op.execute(sa.text(
                """
                DO $$ BEGIN
                    ALTER TABLE praxis_meta_task
                    ADD CONSTRAINT praxis_meta_task_pkey
                    PRIMARY KEY (praxis_id, task_id);
                EXCEPTION WHEN duplicate_object THEN NULL;
                      WHEN invalid_table_definition THEN NULL; END $$;
                """
            ))

    # --- 4. Drop the legacy meta_task table and bonustype enum. --------------
    op.execute(sa.text("DROP TABLE IF EXISTS meta_task"))
    op.execute(sa.text("DROP TYPE IF EXISTS bonustype"))


def downgrade() -> None:
    # --- 1. Recreate bonustype and meta_task. --------------------------------
    op.execute(sa.text(
        """
        DO $$ BEGIN
            CREATE TYPE bonustype AS ENUM ('flat', 'percentage');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    ))
    op.execute(sa.text(
        """
        CREATE TABLE IF NOT EXISTS meta_task (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            description TEXT NOT NULL,
            faction_slug VARCHAR NOT NULL REFERENCES faction(slug),
            bonus_type bonustype NOT NULL,
            bonus_value DOUBLE PRECISION NOT NULL,
            level_required INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
        """
    ))

    conn = op.get_bind()

    # --- 2. Reverse-migrate metatask-typed tasks back into meta_task. --------
    # Add a bridge column on meta_task that tracks which new task row it came
    # from, so we can rewrite praxis_meta_task.task_id back to meta_task.id.
    op.execute(sa.text(
        """
        ALTER TABLE meta_task
        ADD COLUMN IF NOT EXISTS _source_task_id INTEGER
        """
    ))
    op.execute(sa.text(
        """
        INSERT INTO meta_task (
            name,
            description,
            faction_slug,
            bonus_type,
            bonus_value,
            level_required,
            created_at,
            updated_at,
            _source_task_id
        )
        SELECT
            title,
            description,
            COALESCE(metatask_faction_slug, primary_faction_slug),
            'flat',
            CAST(point_value AS DOUBLE PRECISION),
            level_required,
            created_at,
            updated_at,
            id
        FROM task
        WHERE task_type = 'metatask'
        """
    ))

    # Repoint praxis_meta_task: task_id → meta_task_id via the bridge.
    op.execute(sa.text(
        """
        ALTER TABLE praxis_meta_task
        ADD COLUMN IF NOT EXISTS meta_task_id INTEGER
        """
    ))
    op.execute(sa.text(
        """
        UPDATE praxis_meta_task pmt
        SET meta_task_id = m.id
        FROM meta_task m
        WHERE m._source_task_id = pmt.task_id
        """
    ))
    op.execute(sa.text(
        """
        DO $$ BEGIN
            ALTER TABLE praxis_meta_task
            DROP CONSTRAINT IF EXISTS praxis_meta_task_task_id_fkey;
        EXCEPTION WHEN undefined_object THEN NULL; END $$;
        """
    ))
    op.execute(sa.text(
        """
        ALTER TABLE praxis_meta_task
        DROP CONSTRAINT IF EXISTS praxis_meta_task_pkey
        """
    ))
    op.execute(sa.text(
        "ALTER TABLE praxis_meta_task DROP COLUMN IF EXISTS task_id"
    ))
    op.execute(sa.text(
        "ALTER TABLE praxis_meta_task ALTER COLUMN meta_task_id SET NOT NULL"
    ))
    op.execute(sa.text(
        """
        DO $$ BEGIN
            ALTER TABLE praxis_meta_task
            ADD CONSTRAINT praxis_meta_task_meta_task_id_fkey
            FOREIGN KEY (meta_task_id) REFERENCES meta_task(id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    ))
    op.execute(sa.text(
        """
        DO $$ BEGIN
            ALTER TABLE praxis_meta_task
            ADD CONSTRAINT praxis_meta_task_pkey
            PRIMARY KEY (praxis_id, meta_task_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
              WHEN invalid_table_definition THEN NULL; END $$;
        """
    ))
    op.execute(sa.text(
        "ALTER TABLE meta_task DROP COLUMN IF EXISTS _source_task_id"
    ))

    # --- 3. Drop the migrated metatask Task rows. ----------------------------
    op.execute(sa.text("DELETE FROM task WHERE task_type = 'metatask'"))

    # --- 4. Drop new task columns + tasktype enum. ---------------------------
    op.execute(sa.text(
        """
        DO $$ BEGIN
            ALTER TABLE task
            DROP CONSTRAINT IF EXISTS task_metatask_faction_slug_fkey;
        EXCEPTION WHEN undefined_object THEN NULL; END $$;
        """
    ))
    op.execute(sa.text(
        "ALTER TABLE task DROP COLUMN IF EXISTS metatask_faction_slug"
    ))
    op.execute(sa.text(
        "ALTER TABLE task DROP COLUMN IF EXISTS task_type"
    ))
    op.execute(sa.text("DROP TYPE IF EXISTS tasktype"))
