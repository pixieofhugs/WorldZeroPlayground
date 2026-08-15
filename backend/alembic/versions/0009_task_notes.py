"""Give a proposed task the proposer's note to the admin: `task.notes` (#1823).

The propose-task form has asked "Why do you want this task to exist? What
inspired it?" since it shipped, and threw the answer away — there was nowhere to
put it. This is that column.

NOT NULL with an empty-string default, matching ``task.description``: an absent
note is "" rather than NULL, so no reader needs a None branch and the admin
queue can render it with a plain truthiness check. Every existing row gets "".

Plain ``TEXT`` — the 2,000-character trust-boundary cap is enforced on the wire
in ``schemas.task.MAX_TASK_NOTES``, so it can be raised without a migration.

``0002_squashed`` builds a *fresh* DB straight from the ORM models, so CI and
local resets already land on this shape and would hit ``DuplicateColumn`` on a
bare ``ADD COLUMN``. Hence ``IF NOT EXISTS`` — this revision exists to carry a
deployed DB, stamped at an earlier revision, forward to the shape the models
already describe. Idempotent either way.

Revision ID: 0009_task_notes
Revises: 0008_praxis_room_update
Create Date: 2026-08-15
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009_task_notes"
down_revision: Union[str, None] = "0008_praxis_room_update"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS notes")
