"""Drop ``task.is_task_vision_eligible``, which had no reader (#3438).

Task Vision is a parked v2 feature; the column returns with it. Idempotent: a
fresh DB's root never built it.

Revision ID: 0033_drop_task_vision_flag
Revises: 0032_praxis_member_approved
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0033_drop_task_vision_flag"
down_revision: Union[str, None] = "0032_praxis_member_approved"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS is_task_vision_eligible")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS is_task_vision_eligible "
        "BOOLEAN NOT NULL DEFAULT false"
    )
