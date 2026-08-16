"""Tell a voluntary departure from a moderator ban: `character.departed_at` (#1577).

Both paths land in ``status = banned`` — the player deleting their own life and a
moderator banning someone — so the state alone cannot say which happened. This is
the discriminator: NULL means "banned by a moderator (or still playing)", non-NULL
means "the player ended this life", and it is written by
``services.character.soft_delete_character`` alone.

Nullable, no backfill, no default. Every existing row is NULL, which is the honest
answer: the two paths were indistinguishable before this column, so claiming a
departure date for any historical row would be inventing one. Its consumer —
``services.admin_service.apply_ban``, which refuses to un-ban a departed life —
therefore treats every pre-existing ban as a moderator ban, and reversibly so.

Deliberately not a third ``CharacterStatus`` value: see the model's comment. A new
enum member would oblige every "not playable" read to learn it, and one missed read
silently readmits a departed character to a roster.

``0002_squashed`` builds a *fresh* DB straight from the ORM models, so CI and local
resets already land on this shape. A deployed DB is stamped at that revision and
never re-runs it — hence this one. Idempotent either way.

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
