"""Add character_stats.level_jump_used_at_level for the faction level jump (#811).

The column records the level at which a character last spent their faction's
level-jump allowance; NULL means never spent this era. The allowance is
available iff it differs from ``level``, so levelling up restores it and no
reset job exists to migrate.

0001_squashed builds the schema from the live ORM models, so a *fresh* DB (CI,
local reset) already has this column and the ADD below is a no-op. An
already-deployed DB is stamped past 0001_squashed and never re-runs it, so it
needs the explicit ADD — hence IF NOT EXISTS, which makes this safe on fresh
and deployed DBs alike.

Nullable with no server default on purpose: "never spent" is genuinely absent
information, not a zero, and level 0 is a real level a jump can be spent at.
Backfilling would therefore have to invent a value; NULL says the truth.

Revision ID: 0005_character_stats_level_jump
Revises: 0004_character_faction_na
Create Date: 2026-07-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_character_stats_level_jump"
down_revision: Union[str, None] = "0004_character_faction_na"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE character_stats "
        "ADD COLUMN IF NOT EXISTS level_jump_used_at_level INTEGER"
    ))


def downgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE character_stats DROP COLUMN IF EXISTS level_jump_used_at_level"
    ))
