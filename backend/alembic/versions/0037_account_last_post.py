"""account.last_praxis_posted_at: the daily praxis cap's clock (#3474).

Idempotent (a fresh DB's root already built it).

Revision ID: 0037_account_last_post
Revises: 0036_check_constraints
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0037_account_last_post"
down_revision: Union[str, None] = "0036_check_constraints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE account ADD COLUMN IF NOT EXISTS "
        "last_praxis_posted_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS last_praxis_posted_at")
