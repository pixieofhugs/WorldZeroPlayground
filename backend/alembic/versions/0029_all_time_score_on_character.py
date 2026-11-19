"""Move ``all_time_score`` from ``character_stats`` to ``character`` (#3434).

Each character's value is its latest stats row's, which held the running total.
A fresh DB's root already built the new shape, so both steps are guarded.

Revision ID: 0029_all_time_score_on_character
Revises: 0028_lower_unique_handles
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0029_all_time_score_on_character"
down_revision: Union[str, None] = "0028_lower_unique_handles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE character ADD COLUMN IF NOT EXISTS all_time_score INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        """
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'character_stats' AND column_name = 'all_time_score') THEN
                UPDATE character c SET all_time_score = s.all_time_score
                FROM (SELECT DISTINCT ON (character_id) character_id, all_time_score
                      FROM character_stats ORDER BY character_id, era_id DESC) s
                WHERE s.character_id = c.id;
                ALTER TABLE character_stats DROP COLUMN all_time_score;
            END IF;
        END $$
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE character_stats ADD COLUMN IF NOT EXISTS all_time_score INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "UPDATE character_stats s SET all_time_score = c.all_time_score "
        "FROM character c WHERE c.id = s.character_id"
    )
    op.execute("ALTER TABLE character DROP COLUMN IF EXISTS all_time_score")
