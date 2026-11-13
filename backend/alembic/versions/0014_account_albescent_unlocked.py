"""The Albescent unlock becomes a stamped fact, and the earner is evicted (#2399).

Schema: ``account.albescent_unlocked``, sticky; can't be derived because resets
wipe its inputs (see ``models/account.py``). **No backfill**: the old ADR-0021
gate asked a different question; everyone re-qualifies on the next recalc.

Data: level-8+ characters in Albescent move to ``na`` (owner ruling; Albescent
may sit empty). One-way: ``downgrade()`` drops the column but restores no one.

Revision ID: 0014_account_albescent_unlocked
Revises: 0013_praxis_member_is_done
Create Date: 2026-08-22
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op
from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA

revision: str = "0014_account_albescent_unlocked"
down_revision: Union[str, None] = "0013_praxis_member_is_done"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE account
        ADD COLUMN IF NOT EXISTS albescent_unlocked BOOLEAN NOT NULL DEFAULT false
        """
    )
    # Era-owned ceiling, never a literal. max(id) is the live era row; NULL (no-op)
    # on a fresh database.
    op.execute(
        sa.text(
            """
            UPDATE character
            SET faction_slug = :na_slug
            WHERE faction_slug = :albescent_slug
              AND id IN (
                  SELECT character_id FROM character_stats
                  WHERE level >= :ceiling
                    AND era_id = (SELECT max(id) FROM era)
              )
            """
        ).bindparams(
            na_slug=UNAFFILIATED_FACTION_SLUG,
            albescent_slug=ALBESCENT_FACTION_SLUG,
            ceiling=CURRENT_ERA.albescent_level_required,
        )
    )


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS albescent_unlocked")
