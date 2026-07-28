"""Add the `nudge` table (#1083).

One row per poke: sender, recipient, the praxis the recipient owes, and when.
See ``models/nudge.py`` for why this is its own table rather than a `kind` enum
on ``Message`` — the short version is that a new enum value would have to be
added to ``0001_squashed``'s ``ENUMS`` list as well as the model, for the same
one migration, and it would weld a system poke to a future DM inbox.

``0001_squashed`` builds a *fresh* DB with ``Base.metadata.create_all``, so CI
and a local reset already land on this shape the moment the model exists. A
deployed DB is stamped further down the chain and never re-runs the baseline —
hence this revision. Idempotent on both: ``IF NOT EXISTS`` throughout, and the
FK constraints are created inside DO blocks because Postgres has no
``ADD CONSTRAINT IF NOT EXISTS`` (the 0008 pattern).

No enum, no backfill: the table starts empty everywhere.

Revision ID: 0009_nudge_table
Revises: 0008_duel_resolved_era
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009_nudge_table"
down_revision: Union[str, None] = "0008_duel_resolved_era"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS nudge (
            id SERIAL PRIMARY KEY,
            from_character_id INTEGER NOT NULL,
            to_character_id INTEGER NOT NULL,
            praxis_id INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    for constraint, column, target in (
        ("nudge_from_character_id_fkey", "from_character_id", "character (id)"),
        ("nudge_to_character_id_fkey", "to_character_id", "character (id)"),
        ("nudge_praxis_id_fkey", "praxis_id", "praxis (id)"),
    ):
        op.execute(
            f"""
            DO $$ BEGIN
                ALTER TABLE nudge
                    ADD CONSTRAINT {constraint}
                    FOREIGN KEY ({column}) REFERENCES {target};
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_nudge_sender_recipient_praxis"
        " ON nudge (from_character_id, to_character_id, praxis_id, created_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_nudge_recipient_created"
        " ON nudge (to_character_id, created_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_nudge_recipient_created")
    op.execute("DROP INDEX IF EXISTS ix_nudge_sender_recipient_praxis")
    op.execute("DROP TABLE IF EXISTS nudge")
