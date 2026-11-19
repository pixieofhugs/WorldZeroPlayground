"""Case-insensitive uniqueness for ``character.username`` and ``account.email`` (#3431).

Fails cleanly if case-variant duplicates exist: merging or deleting people is a
human call. Idempotent (a fresh DB's root already built the indexes).

Revision ID: 0028_lower_unique_handles
Revises: 0027_flag_reason_detail
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0028_lower_unique_handles"
down_revision: Union[str, None] = "0027_flag_reason_detail"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("character", "username", "uq_character_username"),
    ("account", "email", "uq_account_email"),
)


def upgrade() -> None:
    bind = op.get_bind()
    for table, column, constraint in _COLUMNS:
        dupes = bind.exec_driver_sql(
            f"SELECT lower({column}) FROM {table} GROUP BY 1 HAVING count(*) > 1"
        ).scalars().all()
        if dupes:
            raise RuntimeError(
                f"{table}.{column} has case-variant duplicates {dupes}; "
                "resolve them by hand, then re-run."
            )
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}")
        op.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS {constraint}_lower "
            f"ON {table} (lower({column}))"
        )


def downgrade() -> None:
    for table, column, constraint in _COLUMNS:
        op.execute(f"DROP INDEX IF EXISTS {constraint}_lower")
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}")
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {constraint} UNIQUE ({column})")
