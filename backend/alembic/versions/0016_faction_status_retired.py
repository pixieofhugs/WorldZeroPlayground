"""``factionstatus`` gains ``retired`` (#2706, ADR-0087).

Migrations own the PG type (``create_type=False``). Appended, so it sorts last;
no reader orders by status. No data step: seed writes the first ``retired``
row. ``downgrade()`` is a no-op, as in ``0015``.

Revision ID: 0016_faction_status_retired
Revises: 0015_account_tombstone
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0016_faction_status_retired"
down_revision: Union[str, None] = "0015_account_tombstone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE factionstatus ADD VALUE IF NOT EXISTS 'retired'")


def downgrade() -> None:
    pass
