"""CHECK constraints for ``vote.value``, ``task.point_value`` and no-self relationships (#3441).

Era-independent invariants only; star maximums and point caps live in ``EraConfig``.
Fails loudly, naming the row ids, if existing data violates one: fixing or deleting
rows is a human call. Idempotent (a fresh DB's root already built them).

Revision ID: 0036_check_constraints
Revises: 0035_index_hot_foreign_keys
Create Date: 2026-11-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0036_check_constraints"
down_revision: Union[str, None] = "0035_index_hot_foreign_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, constraint name, rule)
_CHECKS = (
    ("vote", "ck_vote_value_positive", "value > 0"),
    ("task", "ck_task_point_value_nonnegative", "point_value >= 0"),
    (
        "relationship",
        "ck_relationship_no_self_relationship",
        "from_character_id <> to_character_id",
    ),
)


def upgrade() -> None:
    bind = op.get_bind()
    for table, name, rule in _CHECKS:
        exists = bind.execute(
            sa.text("SELECT 1 FROM pg_constraint WHERE conname = :name"), {"name": name}
        ).first()
        if exists:
            continue
        offenders = bind.exec_driver_sql(
            f"SELECT id FROM {table} WHERE NOT ({rule})"
        ).scalars().all()
        if offenders:
            raise RuntimeError(
                f"{table} has {len(offenders)} rows violating `{rule}`, row ids "
                f"{offenders}; resolve them by hand, then re-run."
            )
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {name} CHECK ({rule})")


def downgrade() -> None:
    for table, name, _ in _CHECKS:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name}")
