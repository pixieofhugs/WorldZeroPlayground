"""A character remembers the highest level it ever reached (#3102).

Voting needs EVER having reached ``vote_level_required``, but resets zero the
per-era level. Sticky, lowered by nothing (see ``models/character.py``).
**Backfilled** (owner ruling), unlike ``0017``: a veteran at level 0 after a
reset would otherwise lose the vote. Stores the peak, not a verdict, so the
gate can move. Idempotent (``GREATEST``).

Revision ID: 0022_character_peak_level
Revises: 0021_task_seed_key
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0022_character_peak_level"
down_revision: Union[str, None] = "0021_task_seed_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Module-level so ``test_vote_level_gate.py`` runs the very statement.
BACKFILL_SQL: str = """
    UPDATE character
    SET peak_level = GREATEST(character.peak_level, peaks.peak)
    FROM (
        SELECT character_id, MAX(level) AS peak
        FROM character_stats
        GROUP BY character_id
    ) AS peaks
    WHERE peaks.character_id = character.id
"""


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE character
        ADD COLUMN IF NOT EXISTS peak_level INTEGER NOT NULL DEFAULT 0
        """
    )
    op.execute(BACKFILL_SQL)


def downgrade() -> None:
    op.execute("ALTER TABLE character DROP COLUMN IF EXISTS peak_level")
