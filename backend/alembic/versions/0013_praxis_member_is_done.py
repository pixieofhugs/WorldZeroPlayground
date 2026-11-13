"""Done is its own flag, beside the approval it was tangled with (ADR-0079, #1810).

ADR-0079 splits ``has_submitted``: approval stays there, "my part is finished"
moves here, because edits/withdraws/kicks clear approvals but not done-ness.
``false`` for existing rows. Idempotent.

Revision ID: 0013_praxis_member_is_done
Revises: 0012_character_block
Create Date: 2026-08-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0013_praxis_member_is_done"
down_revision: Union[str, None] = "0012_character_block"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE praxis_member "
        "ADD COLUMN IF NOT EXISTS is_done BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE praxis_member DROP COLUMN IF EXISTS is_done")
