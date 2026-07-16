"""Backfill praxis.submitted_at on legacy submitted rows (#658).

The invariant ``status == submitted ⟹ submitted_at IS NOT NULL`` holds in code
— ``services.collab_consensus._apply_seal`` is the only writer of
``submitted_at`` and sits on the only path to ``status=submitted`` — but it was
never true of the *data*. ``submitted_at`` predates the squash; 0001_squashed
builds from ``Base.metadata.create_all`` so fresh DBs are fine, but nothing ever
backfilled rows written before the column existed. (The tell is 0002, which
backfills ``praxis_member.submitted_at`` as
``COALESCE(praxis.submitted_at, praxis_member.joined_at)`` — you don't write a
backstop unless the real thing can be null.)

The #658 praxis feed sorts on ``submitted_at``, so any such row would sort as a
NULL. ``created_at`` is the best available approximation of the seal time for a
row that never recorded one: it is the only timestamp those rows carry, and it
at least preserves their relative order.

After this runs, the invariant is true in the data, which is what lets
``list_praxes`` sort with a plain ``ORDER BY`` and lets its
``submitted_at IS NOT NULL`` guard only ever catch a genuine future bug.

Idempotent: a no-op on any DB where the invariant already holds.

Revision ID: 0003_backfill_praxis_seal_time  (<=32 chars: alembic_version.version_num is varchar(32))
Revises: 0002_praxis_pending_submitted
Create Date: 2026-07-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_backfill_praxis_seal_time"
down_revision: Union[str, None] = "0002_praxis_pending_submitted"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE praxis
           SET submitted_at = created_at
         WHERE status = 'submitted'
           AND submitted_at IS NULL
        """
    )


def downgrade() -> None:
    # ponytail: no rollback. The backfilled value is indistinguishable from a
    # genuinely-sealed one, so there is nothing to un-set without also
    # destroying real seal times.
    pass
