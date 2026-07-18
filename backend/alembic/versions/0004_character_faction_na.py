"""Carry #697 (character.faction_slug default 'ua' -> 'na') to deployed DBs.

0001_squashed builds the schema from the live ORM models, so a *fresh* DB (CI,
local reset) picks up the model's new ``server_default`` with no help. An
already-deployed DB is stamped past 0001_squashed and never re-runs it, so the
stale ``DEFAULT 'ua'`` would linger there — contradicting ADR-0019 (characters
are born Unaffiliated; factions are invite-gated).

The default is dormant in practice: services.character.create_character always
sets faction_slug explicitly. This aligns the backstop with the rule so a direct
insert can't silently mint a UA character.

Idempotent: SET DEFAULT is a no-op on any DB already built from the current
models, so it is safe on fresh and drifted DBs alike. No row data is touched —
existing characters keep whatever faction they hold.

Revision ID: 0004_character_faction_na
Revises: 0003_backfill_praxis_seal_time
Create Date: 2026-07-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0004_character_faction_na"
down_revision: Union[str, None] = "0003_backfill_praxis_seal_time"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE character ALTER COLUMN faction_slug SET DEFAULT 'na'")


def downgrade() -> None:
    op.execute("ALTER TABLE character ALTER COLUMN faction_slug SET DEFAULT 'ua'")
