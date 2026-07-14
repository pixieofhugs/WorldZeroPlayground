"""Taunts store a structured reference, not rendered prose (ADR-0031, #451).

Taunt copy moves to the frontend react-i18next catalog
(``frontend/src/locales/en/taunts.json``). The backend stops persisting a
finished English sentence and instead stores the sender's frozen send-time
``faction_slug`` plus the existing ``trigger_type``; the frontend resolves the
words and interpolates the FK-derived names.

Existing rows hold only a baked sentence that cannot be reversed into a
(faction_slug, trigger_type) reference, so we **wipe** ``taunt_message`` before
adding the NOT NULL ``faction_slug`` column and dropping ``message``. Taunts are
ephemeral social nudges — losing the backlog is acceptable.

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
    # Wipe first: old rows can't be reversed into a structured reference, and
    # this lets faction_slug land as NOT NULL without a server default.
    op.execute(sa.text("DELETE FROM taunt_message"))
    op.add_column(
        "taunt_message",
        sa.Column("faction_slug", sa.String(), nullable=False),
    )
    op.drop_column("taunt_message", "message")


def downgrade() -> None:
    # Symmetric: restore the message column (rows are already gone) and drop
    # faction_slug. Wiping again keeps the NOT NULL message column consistent.
    op.execute(sa.text("DELETE FROM taunt_message"))
    op.add_column(
        "taunt_message",
        sa.Column("message", sa.Text(), nullable=False),
    )
    op.drop_column("taunt_message", "faction_slug")
