"""Tell a voluntary departure from a moderator ban: `character.departed_at` (#1577).

Both paths land in ``status = banned``; non-NULL means the player ended this
life (written only by ``soft_delete_character``). No backfill: history can't
tell them apart, so old bans read as moderator bans. Not a third
``CharacterStatus``: every "not playable" read would have to learn it.
Idempotent.

Revision ID: 0011_character_departed_at
Revises: 0010_terms_acceptance
Create Date: 2026-08-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0011_character_departed_at"
down_revision: Union[str, None] = "0010_terms_acceptance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE character "
        "ADD COLUMN IF NOT EXISTS departed_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE character DROP COLUMN IF EXISTS departed_at")
