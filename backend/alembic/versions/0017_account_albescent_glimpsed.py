"""Albescent gains a third state, and the account records the second (#2770).

Account-scoped and stamped, not derived (see ``models/account.py``). No
backfill: ``recalculate_character_stats`` stamps every qualifying account on
its next recalc. The era-owned floor is deliberately not read here.

Revision ID: 0017_account_albescent_glimpsed
Revises: 0016_faction_status_retired
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0017_account_albescent_glimpsed"
down_revision: Union[str, None] = "0016_faction_status_retired"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE account
        ADD COLUMN IF NOT EXISTS albescent_glimpsed BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS albescent_glimpsed")
