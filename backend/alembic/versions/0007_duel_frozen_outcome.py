"""Freeze duel outcomes at era close: `resolved` status + outcome snapshot (ADR-0052).

Adds the terminal ``duelstatus.resolved`` value and the four columns
``apply_era_reset`` writes when it freezes a duel:
``winner_character_id`` (NULL = tie / no-contest), ``resolved_at``, and the
per-side ``challenger_final_points`` / ``opponent_final_points`` vote snapshot.

0001_squashed builds a *fresh* DB straight from the ORM models, so CI and local
resets already land on this shape (its ENUMS list carries ``resolved`` too). A
deployed DB is stamped at 0001 and never re-runs it, and ``create_all`` skips
tables that already exist — hence this revision. Idempotent either way.

Revision ID: 0007_duel_frozen_outcome
Revises: 0006_faction_drop_prose
Create Date: 2026-07-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0007_duel_frozen_outcome"
down_revision: Union[str, None] = "0006_faction_drop_prose"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE cannot be followed by a *use* of the new value in the same
    # transaction; autocommit_block keeps it out of the migration's txn.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE duelstatus ADD VALUE IF NOT EXISTS 'resolved'")

    op.execute("ALTER TABLE duel ADD COLUMN IF NOT EXISTS winner_character_id INTEGER")
    op.execute("ALTER TABLE duel ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ")
    op.execute("ALTER TABLE duel ADD COLUMN IF NOT EXISTS challenger_final_points INTEGER")
    op.execute("ALTER TABLE duel ADD COLUMN IF NOT EXISTS opponent_final_points INTEGER")

    # ADD CONSTRAINT has no IF NOT EXISTS in Postgres; guard on the catalog so a
    # DB already built from the models (constraint present) is a no-op.
    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE duel
                ADD CONSTRAINT duel_winner_character_id_fkey
                FOREIGN KEY (winner_character_id) REFERENCES character (id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE duel DROP CONSTRAINT IF EXISTS duel_winner_character_id_fkey")
    op.execute("ALTER TABLE duel DROP COLUMN IF EXISTS opponent_final_points")
    op.execute("ALTER TABLE duel DROP COLUMN IF EXISTS challenger_final_points")
    op.execute("ALTER TABLE duel DROP COLUMN IF EXISTS resolved_at")
    op.execute("ALTER TABLE duel DROP COLUMN IF EXISTS winner_character_id")
    # ponytail: no enum rollback — Postgres cannot DROP a value from a type, and
    # rows already written as 'resolved' would have nowhere to land.
