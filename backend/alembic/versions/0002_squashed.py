"""Squashed baseline #2 — the whole schema, built straight from the ORM models.

Collapses ``0001_squashed`` plus ``0002``–``0011`` (11 files, past the ~10-file
trigger in ``docs/agents/db-migrations.md``) into one root revision. A fresh
database reaches the current schema with a single ``alembic upgrade head``;
``seed.py`` then loads reference data (factions, era, admin, the onboarding
task) from the live era config.

**Every revision it replaces was a carry-forward.** ``0002``–``0011`` existed
solely to bring *already-deployed* databases up to a shape that
``Base.metadata.create_all`` had been producing on fresh ones since the model
changed. Nothing in them is lost here: this file builds from the same metadata,
so it emits all of it and more.

Tables come from ``Base.metadata`` so the baseline can never drift from the
models (``alembic check`` stays clean). Enum types are created explicitly first:
by repo convention migrations — not SQLAlchemy — own every ``CREATE TYPE``
(models use ``create_type=False`` and ``env.py`` enforces it). The DO blocks
keep the type creation idempotent.

**This revision invalidates every existing database's stamp, by design.** Under
Strategy A (``docs/agents/db-migrations.md``) production data is disposable, so
recovery is a human running ``scripts/reset_db.sh --url <dsn>`` and
redeploying. ``scripts/check_db_stamp.py`` runs before ``alembic upgrade`` in
``start.sh`` and will refuse the deploy until that happens — that refusal is the
feature. Nothing here auto-stamps, auto-drops or self-heals.

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


# PostgreSQL enum type name (lowercase model class name) -> values, in
# declaration order (Postgres sorts an enum by the order its values are added).
#
# Three values the previous baseline declared are gone (#1388, #1398):
# ``accountstatus.deleted``, ``characterstatus.paused`` and
# ``factionstatus.deprecated``. No code path ever wrote any of them, so they
# were states the database would accept and the application could not produce.
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
    # Section A — own every CREATE TYPE (idempotent; safe on partial states).
    for typname, values in ENUMS:
        vals = ", ".join(f"'{value}'" for value in values)
        op.execute(sa.text(
            f"DO $$ BEGIN CREATE TYPE {typname} AS ENUM ({vals});"
            f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
        ))

    # Section B — every table, FK-ordered, straight from the ORM metadata.
    # This carries the naming convention, the BIGINT identity keys and the
    # secondary indexes with it, because all three live on the models.
    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
    for typname, _ in reversed(ENUMS):
        op.execute(f"DROP TYPE IF EXISTS {typname}")
