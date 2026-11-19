"""Drop the dead ``relationship.status`` column and its enum type (#3436).

Blocks live in ``character_block`` (ADR-0077), so only ``active`` was ever written.
Idempotent: a fresh DB's root already built ``relationship`` without the column.

Revision ID: 0031_drop_relationship_status
Revises: 0030_account_secret_faction
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0031_drop_relationship_status"
down_revision: Union[str, None] = "0030_account_secret_faction"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE relationship DROP COLUMN IF EXISTS status")
    op.execute("DROP TYPE IF EXISTS relationshipstatus")


def downgrade() -> None:
    op.execute(
        "DO $$ BEGIN CREATE TYPE relationshipstatus AS ENUM ('active', 'blocked');"
        " EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )
    op.execute(
        "ALTER TABLE relationship ADD COLUMN IF NOT EXISTS status "
        "relationshipstatus NOT NULL DEFAULT 'active'"
    )
