"""Stamp the habit bonus on a praxis membership: `praxis_member.habit_bonus_points` (#1617).

Flat points a member earns for sealing a praxis within the era's habit window of
another praxis of their own. Written once, at seal time, by
``services.collab_consensus._apply_seal`` — the same single writer that stamps
``praxis.submitted_at`` and ``praxis.era_id``.

On the MEMBER row rather than on ``praxis``: a collab seals once for the group,
but the bonus is per member (each is measured against their own history), so one
collab legitimately holds a different value per member. Solo and duel praxes have
exactly one member — the author — so they are unaffected by the choice.

NOT NULL with a 0 default and **deliberately not backfilled**: no era has ever run
under this rule, so no existing membership has earned one. Backfilling from
timestamps would invent points nobody was told they were playing for, and would
also disagree with any later unsubmit/resubmit, which re-stamps.

``0002_squashed`` builds a *fresh* database straight from the ORM models, so CI and
local resets already land on this shape. A deployed database is stamped at an
earlier revision and never re-runs it — hence this one. Idempotent either way.

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
