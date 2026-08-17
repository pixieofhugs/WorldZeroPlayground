"""Done is its own flag, beside the approval it was tangled with (ADR-0079, #1810).

``praxis_member.has_submitted`` was one boolean doing three jobs. ADR-0079 splits
it: the *approval* stays on ``has_submitted``, the *proposal* is already
``praxis.submit_proposed_at``, and the social "my part is finished" becomes this
column.

It has to be its own column rather than a third reading of the old one because
the two are cleared by different events. An edit, a Withdraw or a kick clears
every approval — the group is not ready to publish — and none of them means a
member's own part became unfinished.

``false`` for every existing row, which is the honest answer: nobody has ever
been able to say it.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI and
local resets already have this column by the time this revision runs — hence
``IF NOT EXISTS``. A deployed database is stamped earlier and gets the ALTER.

Revision ID: 0013_praxis_member_is_done
Revises: 0012_character_block
Create Date: 2026-08-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0013_praxis_member_is_done"
down_revision: Union[str, None] = "0012_character_block"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE praxis_member "
        "ADD COLUMN IF NOT EXISTS is_done BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE praxis_member DROP COLUMN IF EXISTS is_done")
