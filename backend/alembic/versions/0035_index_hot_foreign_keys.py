"""Index the five foreign keys that back per-request reads (#3440).

Only these five; the other unindexed FKs are not worth the write cost at this
size. ``IF NOT EXISTS`` because a fresh DB's root already built them.

Revision ID: 0035_index_hot_foreign_keys
Revises: 0034_fk_id_suffix
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0035_index_hot_foreign_keys"
down_revision: Union[str, None] = "0034_fk_id_suffix"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = (
    ("praxis_member", "character_id"),
    ("vote", "voter_account_id"),
    ("praxis_invite", "invitee_id"),
    ("taunt_message", "to_character_id"),
    ("relationship", "to_character_id"),
)


def upgrade() -> None:
    for table, column in _INDEXES:
        op.execute(
            f"CREATE INDEX IF NOT EXISTS ix_{table}_{column} ON {table} ({column})"
        )


def downgrade() -> None:
    for table, column in _INDEXES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_{column}")
