"""Add the `feed_dismissal` table (#1193).

One row per activity-feed item a character has archived. See
``models/feed_dismissal.py`` for why the archive is a table rather than
per-device storage, and ``services/activity_feed.py::build_item_key`` for the
shape of ``item_key``.

``0001_squashed`` builds a *fresh* DB with ``Base.metadata.create_all``, so CI
and a local reset land on this shape the moment the model exists. A deployed DB
is stamped further down the chain and never re-runs the baseline — hence this
revision. Idempotent on both: ``IF NOT EXISTS`` throughout, and the FK is
created inside a DO block because Postgres has no
``ADD CONSTRAINT IF NOT EXISTS`` (the 0008 / 0009 pattern).

No enum, no backfill: the table starts empty everywhere, and an empty archive
is exactly the pre-feature behaviour.

Revision ID: 0010_feed_dismissal
Revises: 0009_nudge_table
Create Date: 2026-07-29
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0010_feed_dismissal"
down_revision: Union[str, None] = "0009_nudge_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS feed_dismissal (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL,
            item_key VARCHAR(128) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE feed_dismissal
                ADD CONSTRAINT feed_dismissal_character_id_fkey
                FOREIGN KEY (character_id) REFERENCES character (id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    # Doubles as the read index: every query is "this character's archive".
    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE feed_dismissal
                ADD CONSTRAINT uq_feed_dismissal_character_item_key
                UNIQUE (character_id, item_key);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS feed_dismissal")
