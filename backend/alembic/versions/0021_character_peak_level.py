"""A character remembers the highest level it ever reached (#3102).

Voting is gated on having EVER reached ``EraConfig.vote_level_required``. Level
lives on the per-era ``character_stats`` row and ``apply_era_reset`` returns it
to 0, so the fact cannot be derived after a rollover — hence one sticky integer,
``character.peak_level``, raised wherever a level is written and lowered by
nothing. See ``models/character.py``.

**Backfilled, unlike ``0017``.** The owner's ruling is that anyone who reached
the level before this ships can vote the moment it ships, with no action from
them. ``0017`` could skip its data step because the next recalc re-stamps a
character still AT the level; here a veteran sitting at level 0 after a reset
would be re-stamped with 0 and silently lose the vote. So the peak is the max
level across that character's stats rows in every era.

The gate level itself is era-owned and deliberately *not* read here: the column
stores the peak, not a verdict against today's number, so a later era can move
``vote_level_required`` without another migration.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI and
local resets already have the column by the time this revision runs — hence
``IF NOT EXISTS``. The backfill is idempotent (``GREATEST``), so running it over
a column that already exists is harmless.

``downgrade()`` drops the column; the stats rows it was computed from are
untouched.

Revision ID: 0021_character_peak_level
Revises: 0020_copy_override
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0021_character_peak_level"
down_revision: Union[str, None] = "0020_copy_override"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Module-level so ``tests/integration/test_vote_level_gate.py`` runs the very
# statement a deployed database gets, rather than a copy of it.
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
