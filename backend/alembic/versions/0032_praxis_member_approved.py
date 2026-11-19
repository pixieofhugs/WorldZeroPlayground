"""``praxis_member.has_submitted`` and ``submitted_at`` become ``has_approved`` and ``approved_at`` (#3437).

Both mean approval of the live proposal (ADR-0079). Idempotent: a fresh DB's root
already built the new names.

Revision ID: 0032_praxis_member_approved
Revises: 0031_drop_relationship_status
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0032_praxis_member_approved"
down_revision: Union[str, None] = "0031_drop_relationship_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_RENAMES = (("has_submitted", "has_approved"), ("submitted_at", "approved_at"))


def _rename(old: str, new: str) -> None:
    op.execute(
        f"""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'praxis_member' AND column_name = '{old}') THEN
                ALTER TABLE praxis_member RENAME COLUMN {old} TO {new};
            END IF;
        END $$
        """
    )


def upgrade() -> None:
    for old, new in _RENAMES:
        _rename(old, new)


def downgrade() -> None:
    for old, new in _RENAMES:
        _rename(new, old)
