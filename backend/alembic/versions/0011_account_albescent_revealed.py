"""Sticky Albescent reveal flag — add ``account.albescent_revealed`` (ADR-0027, #390).

Non-null boolean, server default false. Flips True the first time any character
on the account joins Albescent (the secret society) and is never unset; gates
whether the faction listing/page surfaces Albescent at all.

Idempotent (like 0006/0010): the squashed baseline ``create_all`` reflects the
current ORM, so on a fresh DB the column already exists and ``ADD COLUMN IF NOT
EXISTS`` is a no-op. On an existing DB it adds the column, backfilling every
existing row to false via the server default.

Revision ID: 0011_account_albescent_revealed
Revises: 0010_duel_forfeited_by
Create Date: 2026-07-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_account_albescent_revealed"
down_revision: Union[str, None] = "0010_duel_forfeited_by"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE account ADD COLUMN IF NOT EXISTS albescent_revealed"
        " BOOLEAN NOT NULL DEFAULT false"
    ))


def downgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE account DROP COLUMN IF EXISTS albescent_revealed"
    ))
