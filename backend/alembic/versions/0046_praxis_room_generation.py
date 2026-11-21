"""Praxis.room_generation (#3644).

``IF NOT EXISTS`` because a fresh DB's root already built the column.

Revision ID: 0046_praxis_room_generation
Revises: 0045_push_subscription
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0046_praxis_room_generation"
down_revision: Union[str, None] = "0045_push_subscription"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE praxis ADD COLUMN IF NOT EXISTS "
        "room_generation INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE praxis DROP COLUMN IF EXISTS room_generation")
