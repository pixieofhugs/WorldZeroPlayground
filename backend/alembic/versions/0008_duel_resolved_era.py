"""Stamp the closing era on a frozen duel: `duel.resolved_era_id` (#823).

#824 froze the duel *outcome* at era close but left "which era was this duel
fought in?" to ``resolved_at``. That timestamp cannot answer it: ``apply_era_reset``
inserts the new ``Era`` row (whose ``started_at`` defaults to the transaction
clock) *before* stamping ``resolved_at``, so every frozen duel timestamps just
*after* the incoming era's start and a boundary comparison attributes it to the
era it did not belong to. This column records the closing era explicitly.

Nullable and never backfilled: no era has ever closed, so no ``resolved`` duel
exists in any environment.

0001_squashed builds a *fresh* DB straight from the ORM models, so CI and local
resets already land on this shape. A deployed DB is stamped further down the
chain and never re-runs it — hence this revision. Idempotent either way.

Revision ID: 0008_duel_resolved_era
Revises: 0007_duel_frozen_outcome
Create Date: 2026-07-21
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008_duel_resolved_era"
down_revision: Union[str, None] = "0007_duel_frozen_outcome"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE duel ADD COLUMN IF NOT EXISTS resolved_era_id INTEGER")

    # ADD CONSTRAINT has no IF NOT EXISTS in Postgres; guard on the catalog so a
    # DB already built from the models (constraint present) is a no-op.
    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE duel
                ADD CONSTRAINT duel_resolved_era_id_fkey
                FOREIGN KEY (resolved_era_id) REFERENCES era (id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE duel DROP CONSTRAINT IF EXISTS duel_resolved_era_id_fkey")
    op.execute("ALTER TABLE duel DROP COLUMN IF EXISTS resolved_era_id")
