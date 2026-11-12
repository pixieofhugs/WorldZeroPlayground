"""Give a proposed task the proposer's note to the admin: `task.notes` (#1823).

NOT NULL default "" like ``task.description``, so readers need no None branch.
The 2,000-char cap lives in ``schemas.task.MAX_TASK_NOTES``. Idempotent.

Revision ID: 0009_task_notes
Revises: 0008_praxis_room_update
Create Date: 2026-08-15
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009_task_notes"
down_revision: Union[str, None] = "0008_praxis_room_update"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS notes")
