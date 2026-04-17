"""R.5 — Vote budget: on-read recomputation.

Replaces the running `votes_available` counter on `character_stats` with a
monotonic `votes_spent_this_era` column. Spendable votes are now computed on
every read via services.scoring.compute_votes_available:

    votes_available = era.vote_budget_base
                    + floor(era.vote_budget_multiplier * stats.score)
                    - stats.votes_spent_this_era

Data migration strategy:
- For each existing CharacterStats row, compute the historical cap from the
  current era's `vote_budget_base` and `vote_budget_multiplier` (stored on
  the `era` table via EraConfig → values at seed time), then derive
  `votes_spent_this_era = max(0, cap - votes_available)`.
- Where the era row does not carry the formula inputs (older data), we
  fall back to zero. The exact historical drift is unrecoverable; zero is
  conservative — it credits the player the full new on-read budget.

Downgrade:
- Re-adds `votes_available`. Populates it from the recomputation formula
  using `vote_budget_base` / `vote_budget_multiplier` from the current
  EraConfig (CURRENT_ERA) imported at runtime. This produces a correct
  snapshot for the live era; stats for prior eras are recalculated against
  the live era's parameters (best effort — prior-era formula values are not
  persisted on the era row).

Revision ID: 0005_vote_budget_recompute
Revises: 0004_praxis_unification
Create Date: 2026-04-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_vote_budget_recompute"
down_revision: Union[str, None] = "0004_praxis_unification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the new monotonic column with a zero default. Idempotent.
    op.execute(sa.text("""
        ALTER TABLE character_stats
        ADD COLUMN IF NOT EXISTS votes_spent_this_era INTEGER NOT NULL DEFAULT 0
    """))

    # 2. Best-effort data recovery. The era row does not persist the EraConfig
    #    values (vote_budget_base / multiplier), so we cannot reconstruct the
    #    exact historical cap from the DB alone. We import CURRENT_ERA at
    #    migration time and apply its formula uniformly. If existing
    #    `votes_available` is less than the computed cap, treat the delta as
    #    votes spent. Never go negative.
    #
    #    Rationale: the old counter drifted from the formula over time, so it
    #    is not a reliable signal either. Setting votes_spent_this_era = 0 for
    #    every row would be the safest choice, but it would give every player
    #    the full fresh budget. Using max(0, cap - votes_available) is a
    #    closer approximation: players who had spent votes will see their
    #    spend preserved against the new cap.
    from game_config import CURRENT_ERA

    base = CURRENT_ERA.vote_budget_base
    multiplier = float(CURRENT_ERA.vote_budget_multiplier)

    op.execute(sa.text(f"""
        UPDATE character_stats
        SET votes_spent_this_era = GREATEST(
            0,
            ({base} + FLOOR({multiplier} * score)::INTEGER) - votes_available
        )
    """))

    # 3. Drop the legacy counter.
    op.execute(sa.text("""
        ALTER TABLE character_stats
        DROP COLUMN IF EXISTS votes_available
    """))


def downgrade() -> None:
    # 1. Re-add votes_available with a zero default.
    op.execute(sa.text("""
        ALTER TABLE character_stats
        ADD COLUMN IF NOT EXISTS votes_available INTEGER NOT NULL DEFAULT 0
    """))

    # 2. Recompute votes_available for existing rows from CURRENT_ERA formula.
    #    This is a best-effort reconstruction — prior eras' formula values are
    #    not persisted on the era row. Clamped at zero.
    from game_config import CURRENT_ERA

    base = CURRENT_ERA.vote_budget_base
    multiplier = float(CURRENT_ERA.vote_budget_multiplier)

    op.execute(sa.text(f"""
        UPDATE character_stats
        SET votes_available = GREATEST(
            0,
            ({base} + FLOOR({multiplier} * score)::INTEGER) - votes_spent_this_era
        )
    """))

    # 3. Drop the new column.
    op.execute(sa.text("""
        ALTER TABLE character_stats
        DROP COLUMN IF EXISTS votes_spent_this_era
    """))
