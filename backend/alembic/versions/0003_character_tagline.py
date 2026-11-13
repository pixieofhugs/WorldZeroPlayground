"""Give a character a slogan line: `character.tagline` (#1628).

Distinct from ``bio``; capped at 140 in ``schemas.character`` (plain ``TEXT`` so
the cap can move). Never backfilled from bio: empty taglines are hidden.
Idempotent.

Revision ID: 0003_character_tagline
Revises: 0002_squashed
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_character_tagline"
down_revision: Union[str, None] = "0002_squashed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE character ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT ''"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE character DROP COLUMN IF EXISTS tagline")
