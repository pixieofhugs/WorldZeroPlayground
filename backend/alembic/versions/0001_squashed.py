"""Squashed baseline — full schema built straight from the ORM models.

Collapses the entire prior migration chain (legacy 0001–0010) into one root
revision. A fresh database reaches the current schema with a single
``alembic upgrade head``; ``seed.py`` then loads reference data (factions, era,
admin, tasks) from the live era config.

Tables are created from ``Base.metadata`` so the baseline can never drift from
the models (``alembic check`` stays clean). Enum types are created explicitly
first: by repo convention migrations — not SQLAlchemy — own every ``CREATE
TYPE`` (models use ``create_type=False`` and ``env.py`` enforces it). The DO
blocks keep the type creation idempotent.

Revision ID: 0001_squashed
Revises: (root)
Create Date: 2026-06-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from models.base import Base
import models  # noqa: F401 — registers every mapped class on Base.metadata

revision: str = "0001_squashed"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# PostgreSQL enum type name (lowercase model class name) -> values.
ENUMS: list[tuple[str, list[str]]] = [
    ("accountstatus", ["active", "suspended", "deleted"]),
    ("characterstatus", ["active", "paused", "banned"]),
    ("factionstatus", ["visible", "hidden", "deprecated"]),
    ("taskstatus", ["pending", "active", "retired"]),
    ("tasktype", ["standard", "metatask"]),
    ("praxistype", ["solo", "collab", "duel"]),
    ("praxisstatus", ["in_progress", "submitted"]),
    ("praxisinvitestatus", ["pending", "accepted", "declined"]),
    ("mediatype", ["image", "video", "audio"]),
    ("moderationstatus", ["visible", "flagged", "hidden", "failed"]),
    ("relationshiptype", ["friend", "foe"]),
    ("relationshipstatus", ["active", "blocked"]),
    ("taunttriggertype", ["score_overtake", "level_up", "praxis_complete"]),
]


def upgrade() -> None:
    # Section A — own every CREATE TYPE (idempotent; safe on partial states).
    for typname, values in ENUMS:
        vals = ", ".join(f"'{value}'" for value in values)
        op.execute(sa.text(
            f"DO $$ BEGIN CREATE TYPE {typname} AS ENUM ({vals});"
            f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
        ))

    # Section B — every table, FK-ordered, straight from the ORM metadata.
    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
    for typname, _ in reversed(ENUMS):
        op.execute(f"DROP TYPE IF EXISTS {typname}")
