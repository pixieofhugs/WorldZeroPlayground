"""Put ``ON DELETE CASCADE`` on every FK into ``praxis.id`` that is part of the praxis.

Without it ``delete_praxis`` failed: FK violations for unloaded children, and a
NOT NULL violation for ``media_item`` (SQLAlchemy de-associates loaded
children). In the DB rather than ORM ``delete-orphan`` cascades, which only
fire for loaded collections; mappings use ``passive_deletes=True``.

Duel FKs stay NO ACTION on purpose: a duel is a contract between two players
and should refuse the delete. Idempotent.

Revision ID: 0006_praxis_child_fk_cascade
Revises: 0005_praxis_member_habit_bonus
Create Date: 2026-08-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006_praxis_child_fk_cascade"
down_revision: Union[str, None] = "0005_praxis_member_habit_bonus"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


#: FKs into ``praxis.id`` that name a *part* of the praxis.
PRAXIS_CHILDREN: tuple[tuple[str, str], ...] = (
    ("comment", "praxis_id"),
    ("flag", "praxis_id"),
    ("media_item", "praxis_id"),
    ("nudge", "praxis_id"),
    ("praxis_invite", "praxis_id"),
    ("praxis_member", "praxis_id"),
    ("praxis_meta_task", "praxis_id"),
    ("vote", "praxis_id"),
)


def _constraint_name(table: str, column: str) -> str:
    return f"fk_{table}_{column}_praxis"


def _repoint(table: str, column: str, ondelete: str | None) -> None:
    name = _constraint_name(table, column)
    op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name}")
    clause = f" ON DELETE {ondelete}" if ondelete else ""
    op.execute(
        f"ALTER TABLE {table} ADD CONSTRAINT {name} "
        f"FOREIGN KEY ({column}) REFERENCES praxis (id){clause}"
    )


def upgrade() -> None:
    for table, column in PRAXIS_CHILDREN:
        _repoint(table, column, "CASCADE")


def downgrade() -> None:
    for table, column in PRAXIS_CHILDREN:
        _repoint(table, column, None)
