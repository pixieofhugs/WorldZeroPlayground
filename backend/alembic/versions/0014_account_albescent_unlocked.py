"""The Albescent unlock becomes a stamped fact, and the earner is evicted (#2399).

Schema **and** data, and the two are deliberately independent of each other.

Schema: ``account.albescent_unlocked``, sticky and monotonic, defaulting to
false. See ``models/account.py`` for why the unlock cannot be derived — letters
and defection rows are era-scoped and ``apply_era_reset`` returns every life to
``na`` at level 0, so nothing survives a reset to recompute it from.

**No backfill.** The default is false for everyone, including accounts that
passed the old ADR-0021 gate. That gate asked a different question (level on
*any* life, coverage pooled across *all* of them, measured by completed praxes);
grandfathering it would import an answer to a question no longer asked. Everyone
re-qualifies under the new rule, and re-qualifying is cheap for anyone who
genuinely had it — the recalc stamps on the next scored praxis or vote.

Data — a **separate** line from the no-backfill rule above, because defaulting a
column to false does not move anybody out of a faction. #2399 makes "a level-8
character in Albescent" an unreachable state ("never the earner"), and
production held exactly one row in it. Those characters go back to ``na``.

The owner ruled this knowingly, with the consequence stated: the one affected
account then sits at 6-of-7 coverage and **Albescent is empty in production**
until that account earns the seventh. That is the New Game+ path working as
designed, not a regression — no conditional eviction, and no coverage check to
paper over the gap.

``downgrade()`` drops the column. It does **not** put anyone back into
Albescent: the ``na`` they were moved to is indistinguishable from the ``na`` of
a life that was never in it, and a downgrade that guessed would be inventing
membership. The eviction is one-way by design.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI
and local resets already have the column by the time this revision runs — hence
``IF NOT EXISTS``, and hence a data step that finds nothing there. A deployed
database is stamped at an earlier revision and gets both halves.

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
    # The ceiling is era-owned, never a literal here (CLAUDE.md "Do NOT"): read
    # the live era's bar rather than pasting the 8 it happens to hold today.
    # `era_id = (SELECT max(id) FROM era)` is the live era row — the same row
    # `services.era.get_current_era_row_safe` resolves. On a fresh database the
    # era table is empty, the subquery is NULL, and this updates nothing.
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
