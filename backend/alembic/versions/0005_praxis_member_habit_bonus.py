"""Stamp the habit bonus on a praxis membership: `praxis_member.habit_bonus_points` (#1617).

Written once at seal time by ``services.collab_consensus._apply_seal``. On the
member row because a collab's members each measure against their own history.
Not backfilled: no era has run under this rule. Idempotent.

Revision ID: 0005_praxis_member_habit_bonus
Revises: 0004_onboarding_cross_faction
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005_praxis_member_habit_bonus"
down_revision: Union[str, None] = "0004_onboarding_cross_faction"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE praxis_member "
        "ADD COLUMN IF NOT EXISTS habit_bonus_points INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE praxis_member DROP COLUMN IF EXISTS habit_bonus_points"
    )
