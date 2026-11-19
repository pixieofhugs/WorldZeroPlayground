"""vote.era_id: the era a vote was cast in (ADR-0099).

Backfilled from ``created_at`` against ``era.started_at``; a vote older than
every era falls to the first. Idempotent (a fresh DB's root already built it).

Revision ID: 0038_vote_era_id
Revises: 0037_account_last_post
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0038_vote_era_id"
down_revision: Union[str, None] = "0037_account_last_post"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE vote ADD COLUMN IF NOT EXISTS era_id BIGINT")
    op.execute(
        """
        UPDATE vote SET era_id = COALESCE(
            (SELECT e.id FROM era e WHERE e.started_at <= vote.created_at
             ORDER BY e.id DESC LIMIT 1),
            (SELECT MIN(id) FROM era)
        ) WHERE era_id IS NULL
        """
    )
    op.execute("ALTER TABLE vote ALTER COLUMN era_id SET NOT NULL")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vote_era_id_era') THEN "
        "ALTER TABLE vote ADD CONSTRAINT fk_vote_era_id_era "
        "FOREIGN KEY (era_id) REFERENCES era (id); "
        "END IF; END $$"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_vote_era_id ON vote (era_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_vote_era_id")
    op.execute("ALTER TABLE vote DROP COLUMN IF EXISTS era_id")
