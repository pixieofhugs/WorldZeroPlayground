"""``taskstatus`` gains ``deleted`` (#3305).

Admin "Delete" now sets this status instead of dropping the row. Same shape as
``0016_faction_status_retired``: ``0002_squashed.ENUMS`` stays frozen, and a
deployed database gets the new member here. ``ADD VALUE IF NOT EXISTS`` keeps a
fresh database (squash + this revision) idempotent.

``downgrade()`` is a no-op: Postgres cannot remove an enum member.

Revision ID: 0024_task_status_deleted
Revises: 0023_character_location_code
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0024_task_status_deleted"
down_revision: Union[str, None] = "0023_character_location_code"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'deleted'")


def downgrade() -> None:
    pass
