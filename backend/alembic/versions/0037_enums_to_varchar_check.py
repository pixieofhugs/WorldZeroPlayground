"""Native Postgres enums -> VARCHAR(32) + CHECK (#3448).

Member names equal their values, so stored data is unchanged. Idempotent: a fresh
DB's root already built the VARCHAR columns and CHECKs (it still creates the old
types first, which this drops).

Revision ID: 0037_enums_to_varchar_check
Revises: 0036_check_constraints
Create Date: 2026-11-19
"""
import re
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0037_enums_to_varchar_check"
down_revision: Union[str, None] = "0036_check_constraints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ENUMS: dict[str, list[str]] = {
    "accountstatus": ["active", "suspended", "deleted"],
    "characterstatus": ["active", "banned"],
    "factionstatus": ["visible", "retired", "hidden"],
    "taskstatus": ["pending", "active", "retired", "deleted"],
    "tasktype": ["standard", "metatask"],
    "moderationstatus": ["visible", "flagged", "hidden", "failed", "deleted"],
    "praxistype": ["solo", "collab", "duel"],
    "praxisstatus": ["in_progress", "pending", "submitted"],
    "mediatype": ["image", "video", "audio"],
    "praxisinvitestatus": ["pending", "accepted", "declined"],
    "duelstatus": ["pending", "active", "settled", "declined", "resolved"],
    "taunttriggertype": ["score_overtake", "level_up", "praxis_complete"],
    "relationshiptype": ["friend", "foe"],
}
# (table, column, enum type); the CHECK is ck_<table>_<type>.
_COLUMNS = (
    ("account", "status", "accountstatus"),
    ("character", "status", "characterstatus"),
    ("faction", "status", "factionstatus"),
    ("task", "status", "taskstatus"),
    ("task", "task_type", "tasktype"),
    ("comment", "moderation_status", "moderationstatus"),
    ("praxis", "type", "praxistype"),
    ("praxis", "status", "praxisstatus"),
    ("praxis", "moderation_status", "moderationstatus"),
    ("media_item", "type", "mediatype"),
    ("praxis_invite", "status", "praxisinvitestatus"),
    ("duel", "status", "duelstatus"),
    ("taunt_message", "trigger_type", "taunttriggertype"),
    ("relationship", "type", "relationshiptype"),
)
# The only index whose predicate names an enum column; Postgres can't re-cast it.
_PENDING_INDEX = (
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_praxis_invite_pending ON praxis_invite "
    "(praxis_id, invitee_id) WHERE status = 'pending'"
)


def _column(bind, table: str, column: str) -> tuple[str, str | None]:
    udt, default = bind.execute(
        sa.text(
            "SELECT udt_name, column_default FROM information_schema.columns "
            "WHERE table_schema = current_schema() "
            "AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).one()
    return udt, default


def _retype(bind, table: str, column: str, to: str, using: str) -> None:
    _, default = _column(bind, table, column)
    op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT")
    op.execute(
        f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {to} USING {column}{using}"
    )
    if default is not None:
        literal = re.sub(r"::[\w ]+$", "", default)
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {literal}")


def _in_list(values: list[str]) -> str:
    return ", ".join(f"'{v}'" for v in values)


def upgrade() -> None:
    bind = op.get_bind()
    op.execute("DROP INDEX IF EXISTS uq_praxis_invite_pending")
    for table, column, typname in _COLUMNS:
        udt, _ = _column(bind, table, column)
        if udt == typname:
            _retype(bind, table, column, "varchar(32)", "::text")
        name = f"ck_{table}_{typname}"
        if bind.execute(
            sa.text("SELECT 1 FROM pg_constraint WHERE conname = :n"), {"n": name}
        ).first():
            continue
        rule = f"{column} IN ({_in_list(_ENUMS[typname])})"
        key = "slug" if table == "faction" else "id"
        offenders = bind.exec_driver_sql(
            f"SELECT {key} FROM {table} WHERE NOT ({rule})"
        ).scalars().all()
        if offenders:
            raise RuntimeError(
                f"{table} has {len(offenders)} rows violating `{rule}`, row ids "
                f"{offenders}; resolve them by hand, then re-run."
            )
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {name} CHECK ({rule})")
    op.execute(_PENDING_INDEX)
    for typname in _ENUMS:
        op.execute(f"DROP TYPE IF EXISTS {typname}")


def downgrade() -> None:
    bind = op.get_bind()
    for typname, values in _ENUMS.items():
        op.execute(
            f"DO $$ BEGIN CREATE TYPE {typname} AS ENUM ({_in_list(values)});"
            " EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
    op.execute("DROP INDEX IF EXISTS uq_praxis_invite_pending")
    for table, column, typname in _COLUMNS:
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_{typname}"
        )
        _retype(bind, table, column, typname, f"::{typname}")
    op.execute(_PENDING_INDEX)
