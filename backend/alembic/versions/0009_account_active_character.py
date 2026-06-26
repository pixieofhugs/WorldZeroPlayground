"""Add account.active_character_id — the "last carried life" (ADR-0019, #270).

Revision ID: 0009_account_active_character
Revises: 0008_praxis_submit_proposed_at
Create Date: 2026-06-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_account_active_character"
down_revision: Union[str, None] = "0008_praxis_submit_proposed_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS: fresh DBs built from create_all already have this column.
    op.execute(sa.text(
        "ALTER TABLE account ADD COLUMN IF NOT EXISTS active_character_id INTEGER"
    ))
    # Postgres has no ADD CONSTRAINT IF NOT EXISTS — guard so create_all-built DBs
    # (which already carry the FK) don't error on re-run.
    op.execute(sa.text(
        "DO $$ BEGIN"
        " IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_account_active_character') THEN"
        " ALTER TABLE account ADD CONSTRAINT fk_account_active_character"
        " FOREIGN KEY (active_character_id) REFERENCES character (id);"
        " END IF; END $$;"
    ))


def downgrade() -> None:
    op.drop_constraint("fk_account_active_character", "account", type_="foreignkey")
    op.drop_column("account", "active_character_id")
