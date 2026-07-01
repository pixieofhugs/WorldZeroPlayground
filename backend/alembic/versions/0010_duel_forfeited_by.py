"""Sticky duel forfeit — add ``duel.forfeited_by_character_id`` (ADR-0011 §Forfeit, #307).

Nullable FK → ``character.id``. Set when a settled duel side unsubmits or its
owner is banned; the opponent then wins by default and the duel stays settled.

Idempotent (like 0006): the squashed baseline ``create_all`` reflects the
current ORM, so on a fresh DB the column already exists and ``ADD COLUMN IF
NOT EXISTS`` is a no-op. On an existing DB it adds the column.

Revision ID: 0010_duel_forfeited_by
Revises: 0009_account_active_character
Create Date: 2026-07-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_duel_forfeited_by"
down_revision: Union[str, None] = "0009_account_active_character"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE duel ADD COLUMN IF NOT EXISTS forfeited_by_character_id"
        " INTEGER REFERENCES character(id)"
    ))


def downgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE duel DROP COLUMN IF EXISTS forfeited_by_character_id"
    ))
