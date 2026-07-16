"""Carry #590 (praxisstatus.pending) and #571 (praxis_member.submitted_at) to deployed DBs.

0001_squashed builds the schema from the live ORM models, so a *fresh* DB (CI,
local reset) always lands on the current shape. An already-deployed DB is
stamped at 0001_squashed and never re-runs it — so #590 and #571, which edited
the baseline/models in place rather than adding a revision, never reached prod.
Prod's DB predates both (squash 2026-07-14; both landed 2026-07-16), which is
why every praxis-touching query 500s with:

    invalid input value for enum praxisstatus: "pending"

Idempotent by design: a no-op on any DB already built from the current models,
so it is safe on fresh and drifted DBs alike.

Revision ID: 0002_praxis_pending_submitted
Revises: 0001_squashed
Create Date: 2026-07-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_praxis_pending_submitted"
down_revision: Union[str, None] = "0001_squashed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE can't be followed by a *use* of the new value in the same
    # transaction; autocommit_block keeps it out of the migration's txn so the
    # backfill below can never trip that rule. BEFORE 'submitted' matches the
    # member order in models/praxis.py (enum sort order follows declaration).
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE praxisstatus ADD VALUE IF NOT EXISTS 'pending' BEFORE 'submitted'"
        )

    op.execute(
        "ALTER TABLE praxis_member ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ"
    )

    # Backfill (#571): members sealed before this migration would otherwise read
    # as never-submitted and sort wrong in the collaborator-submitted feed.
    # praxis.submitted_at is the real seal time; joined_at is the backstop.
    op.execute(
        """
        UPDATE praxis_member
           SET submitted_at = COALESCE(praxis.submitted_at, praxis_member.joined_at)
          FROM praxis
         WHERE praxis.id = praxis_member.praxis_id
           AND praxis_member.has_submitted
           AND praxis_member.submitted_at IS NULL
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE praxis_member DROP COLUMN IF EXISTS submitted_at")
    # ponytail: no enum rollback — Postgres can't DROP a value from a type, and
    # undoing it means recreating praxisstatus + rewriting every dependent
    # column. Rows written as 'pending' would have nowhere to land anyway.
