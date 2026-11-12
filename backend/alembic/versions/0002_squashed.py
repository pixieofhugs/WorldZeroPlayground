"""Squashed baseline #2 — the whole schema, built straight from the ORM models.

Replaces ``0001``–``0011``, which only carried deployed DBs to what
``create_all`` already built. Tables come from ``Base.metadata`` so the baseline
cannot drift; enum types are created explicitly first because migrations own
every ``CREATE TYPE`` (see ``env.py``).

Invalidates every existing stamp by design (Strategy A, db-migrations.md):
``scripts/check_db_stamp.py`` refuses the deploy until a human runs
``scripts/reset_db.sh``. Nothing here auto-stamps or self-heals.

Revision ID: 0002_squashed
Revises: (root)
Create Date: 2026-08-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from models.base import Base
import models  # noqa: F401 — registers every mapped class on Base.metadata

revision: str = "0002_squashed"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum type name -> values in declaration order (Postgres sorts enums by it).
ENUMS: list[tuple[str, list[str]]] = [
    ("accountstatus", ["active", "suspended"]),
    ("characterstatus", ["active", "banned"]),
    ("factionstatus", ["visible", "hidden"]),
    ("taskstatus", ["pending", "active", "retired"]),
    ("tasktype", ["standard", "metatask"]),
    ("praxistype", ["solo", "collab", "duel"]),
    ("praxisstatus", ["in_progress", "pending", "submitted"]),
    ("praxisinvitestatus", ["pending", "accepted", "declined"]),
    ("mediatype", ["image", "video", "audio"]),
    ("moderationstatus", ["visible", "flagged", "hidden", "failed", "deleted"]),
    ("relationshiptype", ["friend", "foe"]),
    ("relationshipstatus", ["active", "blocked"]),
    ("taunttriggertype", ["score_overtake", "level_up", "praxis_complete"]),
    ("duelstatus", ["pending", "active", "settled", "declined", "resolved"]),
]


def upgrade() -> None:
    # Idempotent; safe on partial states.
    for typname, values in ENUMS:
        vals = ", ".join(f"'{value}'" for value in values)
        op.execute(sa.text(
            f"DO $$ BEGIN CREATE TYPE {typname} AS ENUM ({vals});"
            f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
        ))

    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
    for typname, _ in reversed(ENUMS):
        op.execute(f"DROP TYPE IF EXISTS {typname}")
