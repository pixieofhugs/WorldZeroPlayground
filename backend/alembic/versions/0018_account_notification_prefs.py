"""Notification preferences land on the account (#1047).

Schema only — one JSONB column, ``account.notification_prefs``, defaulting to
``{}``. See ``models/account.py`` for why it is one column rather than a table
or eighteen booleans, and ``services/notification_prefs.py`` for the registry
that resolves it.

**No backfill, and there is nothing to back-fill.** ``{}`` is not a missing
value here: ``resolve_prefs`` reads an absent key as that event's default, so
every existing account already holds every default the moment this column
exists. Writing the defaults into each row would be a second copy of the same
table of numbers, in a place that can never be re-run when one of them changes.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI
and local resets already have the column by the time this revision runs — hence
``IF NOT EXISTS``. A deployed database is stamped earlier and gets it here.

``downgrade()`` drops the column, and drops the preferences with it. That is
the honest undo: there is nowhere else for them to live.

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
