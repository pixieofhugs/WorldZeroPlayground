"""praxis.title / body_text / admin_note: NOT NULL, default '' (#3449).

NULL and '' meant the same thing, so existing NULLs become ''. Idempotent: a fresh
DB's root already built the columns NOT NULL.

Revision ID: 0038_praxis_text_not_null
Revises: 0037_enums_to_varchar_check
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0038_praxis_text_not_null"
down_revision: Union[str, None] = "0037_enums_to_varchar_check"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = ("title", "body_text", "admin_note")


def upgrade() -> None:
    for column in _COLUMNS:
        op.execute(f"UPDATE praxis SET {column} = '' WHERE {column} IS NULL")
        op.execute(f"ALTER TABLE praxis ALTER COLUMN {column} SET DEFAULT ''")
        op.execute(f"ALTER TABLE praxis ALTER COLUMN {column} SET NOT NULL")


def downgrade() -> None:
    for column in _COLUMNS:
        op.execute(f"ALTER TABLE praxis ALTER COLUMN {column} DROP NOT NULL")
        op.execute(f"ALTER TABLE praxis ALTER COLUMN {column} DROP DEFAULT")
