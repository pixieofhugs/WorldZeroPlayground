"""Notification preferences land on the account (#1047).

One JSONB column (see ``models/account.py``, ``services/notification_prefs.py``).
No backfill: ``resolve_prefs`` reads an absent key as its default.

Revision ID: 0018_account_notification_prefs
Revises: 0017_account_albescent_glimpsed
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0018_account_notification_prefs"
down_revision: Union[str, None] = "0017_account_albescent_glimpsed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE account
        ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL
        DEFAULT '{}'::jsonb
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS notification_prefs")
