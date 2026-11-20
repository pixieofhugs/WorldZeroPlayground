"""comment.admin_note: the reason a removal tells the author (#3718).

``IF NOT EXISTS`` because a fresh DB's root already built the column.

Revision ID: 0044_comment_admin_note
Revises: 0043_population_dial
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0044_comment_admin_note"
down_revision: Union[str, None] = "0043_population_dial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE comment ADD COLUMN IF NOT EXISTS admin_note TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE comment DROP COLUMN IF EXISTS admin_note")
