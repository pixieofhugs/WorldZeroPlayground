"""Split ``flag.reason`` into the enum value and a nullable ``reason_detail`` (#3433).

Non-enum ``reason`` text moves to ``reason_detail`` and the reason becomes ``other``.
Idempotent: the squashed root already builds the column from the models.

Revision ID: 0027_flag_reason_detail
Revises: 0026_unique_role_and_invite
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0027_flag_reason_detail"
down_revision: Union[str, None] = "0026_unique_role_and_invite"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE flag ADD COLUMN IF NOT EXISTS reason_detail TEXT")
    op.execute(
        "UPDATE flag SET reason_detail = NULLIF(btrim(reason), ''), reason = 'other' "
        "WHERE reason NOT IN ('spam', 'harassment', 'nsfw', 'slop', 'other')"
    )
    op.execute("ALTER TABLE flag ALTER COLUMN reason SET DEFAULT 'other'")


def downgrade() -> None:
    op.execute(
        "UPDATE flag SET reason = reason_detail "
        "WHERE reason = 'other' AND reason_detail IS NOT NULL"
    )
    op.execute("ALTER TABLE flag ALTER COLUMN reason SET DEFAULT ''")
    op.execute("ALTER TABLE flag DROP COLUMN IF EXISTS reason_detail")
