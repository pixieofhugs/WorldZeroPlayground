"""CHECKs tying lifecycle-nullable columns to their status (#3450).

Sealed praxes missing ``era_id`` (inserted by the demo seed, which never stamped
them) are first given the era in force at ``submitted_at``, the rule
``get_era_row_for_praxis`` uses. Any other violation fails loudly, naming the row
ids: fixing or deleting rows is a human call. Idempotent (a fresh DB's root already
built the CHECKs).

Revision ID: 0040_lifecycle_checks
Revises: 0039_praxis_text_not_null
Create Date: 2026-11-19
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0040_lifecycle_checks"
down_revision: Union[str, None] = "0039_praxis_text_not_null"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, constraint name, rule)
_CHECKS = (
    (
        "duel",
        "ck_duel_declined_has_declined_at",
        "status <> 'declined' OR declined_at IS NOT NULL",
    ),
    (
        "duel",
        "ck_duel_accepted_has_acceptance",
        "status NOT IN ('active', 'settled', 'resolved') "
        "OR (accepted_at IS NOT NULL AND opponent_praxis_id IS NOT NULL)",
    ),
    (
        "duel",
        "ck_duel_resolved_has_resolution",
        "status <> 'resolved' "
        "OR (resolved_at IS NOT NULL AND resolved_era_id IS NOT NULL)",
    ),
    (
        "praxis",
        "ck_praxis_submitted_has_stamps",
        "status <> 'submitted' OR (submitted_at IS NOT NULL AND era_id IS NOT NULL)",
    ),
    (
        "task",
        "ck_task_metatask_faction_iff_metatask",
        "(task_type = 'metatask') = (metatask_faction_slug IS NOT NULL)",
    ),
)

_STAMP_ERA = """
UPDATE praxis SET era_id = COALESCE(
    (SELECT e.id FROM era e WHERE e.started_at <= praxis.submitted_at
     ORDER BY e.id DESC LIMIT 1),
    (SELECT min(e.id) FROM era e)
)
WHERE status = 'submitted' AND era_id IS NULL AND submitted_at IS NOT NULL
"""


def upgrade() -> None:
    bind = op.get_bind()
    op.execute(_STAMP_ERA)
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
