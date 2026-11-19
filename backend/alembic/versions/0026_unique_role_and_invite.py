"""Unique ``account_role`` and one pending ``praxis_invite`` per invitee (#3432).

Duplicates are deleted (lowest id kept) so the index can build. Idempotent.

Revision ID: 0026_unique_role_and_invite
Revises: 0025_comment_child_fk_cascade
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0026_unique_role_and_invite"
down_revision: Union[str, None] = "0025_comment_child_fk_cascade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM account_role a USING account_role b "
        "WHERE a.account_id = b.account_id AND a.role_id = b.role_id AND a.id > b.id"
    )
    op.execute("ALTER TABLE account_role DROP CONSTRAINT IF EXISTS uq_account_role")
    op.execute(
        "ALTER TABLE account_role ADD CONSTRAINT uq_account_role "
        "UNIQUE (account_id, role_id)"
    )
    op.execute(
        "DELETE FROM praxis_invite a USING praxis_invite b "
        "WHERE a.status = 'pending' AND b.status = 'pending' "
        "AND a.praxis_id = b.praxis_id AND a.invitee_id = b.invitee_id AND a.id > b.id"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_praxis_invite_pending "
        "ON praxis_invite (praxis_id, invitee_id) WHERE status = 'pending'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_praxis_invite_pending")
    op.execute("ALTER TABLE account_role DROP CONSTRAINT IF EXISTS uq_account_role")
