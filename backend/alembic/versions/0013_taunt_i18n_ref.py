"""Taunts store a structured reference, not rendered prose (ADR-0031, #451).

Taunt copy moves to the frontend react-i18next catalog
(``frontend/src/locales/en/taunts.json``). The backend stops persisting a
finished English sentence and instead stores the sender's frozen send-time
``faction_slug`` plus the existing ``trigger_type``; the frontend resolves the
words and interpolates the FK-derived names.

Existing rows hold only a baked sentence that cannot be reversed into a
(faction_slug, trigger_type) reference, so we **wipe** ``taunt_message`` before
adding the ``faction_slug`` column and dropping ``message``. Taunts are
ephemeral social nudges — losing the backlog is acceptable.

Idempotency (same pattern as ``0003_add_praxis_submitted_at``): ``0001_squashed``
builds the schema with ``Base.metadata.create_all`` from the LIVE ORM models, so
a fresh CI/dev DB already has ``taunt_message`` with ``faction_slug`` and without
``message``. The ``IF NOT EXISTS`` / ``IF EXISTS`` guards make this migration a
no-op there, while still performing the real column swap on an existing
0012-era DB. The table is empty after the DELETE, so adding ``faction_slug`` as
NOT NULL without a default is safe on the real upgrade path.

Revision ID: 0013_taunt_i18n_ref
Revises: 0012_retire_aged_out_faction
Create Date: 2026-07-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_taunt_i18n_ref"
down_revision: Union[str, None] = "0012_retire_aged_out_faction"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wipe first: old rows can't be reversed into a structured reference, and an
    # empty table lets faction_slug land as NOT NULL without a server default.
    op.execute(sa.text("DELETE FROM taunt_message"))
    # IF NOT EXISTS / IF EXISTS: on a fresh DB built from 0001_squashed the ORM
    # baseline already reflects the post-swap shape, so these become no-ops.
    op.execute(sa.text(
        "ALTER TABLE taunt_message ADD COLUMN IF NOT EXISTS faction_slug VARCHAR NOT NULL"
    ))
    op.execute(sa.text("ALTER TABLE taunt_message DROP COLUMN IF EXISTS message"))


def downgrade() -> None:
    # Symmetric: restore the message column (rows are already gone) and drop
    # faction_slug. Wiping again keeps the NOT NULL message column consistent.
    op.execute(sa.text("DELETE FROM taunt_message"))
    op.execute(sa.text(
        "ALTER TABLE taunt_message ADD COLUMN IF NOT EXISTS message TEXT NOT NULL"
    ))
    op.execute(sa.text("ALTER TABLE taunt_message DROP COLUMN IF EXISTS faction_slug"))
