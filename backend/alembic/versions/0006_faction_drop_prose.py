"""Drop the legacy faction.name / faction.description columns (ADR-0038).

ADR-0038 moved faction prose to the frontend locale catalog and removed both
columns from the model — but no migration ever dropped them from databases that
predate the 0001 squash. The squash builds tables via ``metadata.create_all``,
which skips tables that already exist, so deployed DBs kept a NOT NULL ``name``
column the ORM no longer writes. Every existing row already had a name, so this
stayed invisible until Cozy Coven (#810) inserted a brand-new slug and hit a
NotNullViolation in ``seed.py``.

Idempotent: fresh DBs built from 0001 never had these columns.

Revision ID: 0006_faction_drop_prose
Revises: 0005_character_stats_level_jump
Create Date: 2026-07-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006_faction_drop_prose"
down_revision: Union[str, None] = "0005_character_stats_level_jump"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE faction DROP COLUMN IF EXISTS name")
    op.execute("ALTER TABLE faction DROP COLUMN IF EXISTS description")


def downgrade() -> None:
    # ponytail: prose lives in the locale catalog now — restore the shape, not the data.
    op.execute("ALTER TABLE faction ADD COLUMN IF NOT EXISTS name VARCHAR")
    op.execute("ALTER TABLE faction ADD COLUMN IF NOT EXISTS description VARCHAR")
