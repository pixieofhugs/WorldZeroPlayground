"""``ON DELETE CASCADE`` from ``comment_mention`` and ``flag`` into ``comment`` (#3430).

``comment.praxis_id`` already cascades; these two refused the cascade, so
``delete_praxis`` 500'd for a praxis whose comment had a mention or a flag.
Same shape as ``0006``. Idempotent.

Revision ID: 0025_comment_child_fk_cascade
Revises: 0024_task_status_deleted
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0025_comment_child_fk_cascade"
down_revision: Union[str, None] = "0024_task_status_deleted"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COMMENT_CHILDREN: tuple[tuple[str, str], ...] = (
    ("comment_mention", "comment_id"),
    ("flag", "comment_id"),
)


def _repoint(table: str, column: str, ondelete: str | None) -> None:
    name = f"fk_{table}_{column}_comment"
    op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name}")
    clause = f" ON DELETE {ondelete}" if ondelete else ""
    op.execute(
        f"ALTER TABLE {table} ADD CONSTRAINT {name} "
        f"FOREIGN KEY ({column}) REFERENCES comment (id){clause}"
    )


def upgrade() -> None:
    for table, column in COMMENT_CHILDREN:
        _repoint(table, column, "CASCADE")


def downgrade() -> None:
    for table, column in COMMENT_CHILDREN:
        _repoint(table, column, None)
