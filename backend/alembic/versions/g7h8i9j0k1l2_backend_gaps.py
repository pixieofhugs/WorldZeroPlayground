"""backend gaps: relationship status, submission collab mode, taunt_message table

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-13 00:00:00.000000

Schema changes:
- relationship.status enum: pending|accepted|blocked -> active|blocked
  (existing pending/accepted rows migrate to active)
- submission: add collaboration_mode enum column + partner_character_id FK
- new taunt_message table for foe taunt system
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- 1. Alter relationship.status enum: pending|accepted|blocked -> active|blocked --
    # PostgreSQL requires creating a new type and swapping
    op.execute("CREATE TYPE relationshipstatus_new AS ENUM ('active', 'blocked')")
    op.execute(
        "ALTER TABLE relationship "
        "ALTER COLUMN status TYPE relationshipstatus_new "
        "USING CASE "
        "  WHEN status::text IN ('pending', 'accepted') THEN 'active'::relationshipstatus_new "
        "  ELSE status::text::relationshipstatus_new "
        "END"
    )
    op.execute("DROP TYPE relationshipstatus")
    op.execute("ALTER TYPE relationshipstatus_new RENAME TO relationshipstatus")

    # -- 2. Add collaboration_mode enum + columns to submission --
    op.execute("CREATE TYPE collaborationmode AS ENUM ('solo', 'collab', 'duel')")
    op.add_column(
        "submission",
        sa.Column(
            "collaboration_mode",
            sa.Enum("solo", "collab", "duel", name="collaborationmode", create_type=False),
            nullable=False,
            server_default="solo",
        ),
    )
    op.add_column(
        "submission",
        sa.Column("partner_character_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_submission_partner_character",
        "submission",
        "character",
        ["partner_character_id"],
        ["id"],
    )

    # -- 3. Create taunt_message table --
    op.execute("CREATE TYPE taunttriggertype AS ENUM ('score_overtake', 'level_up', 'submission_complete')")
    op.create_table(
        "taunt_message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("to_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "trigger_type",
            sa.Enum("score_overtake", "level_up", "submission_complete", name="taunttriggertype", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    # -- Reverse 3: drop taunt_message table --
    op.drop_table("taunt_message")
    op.execute("DROP TYPE taunttriggertype")

    # -- Reverse 2: drop submission collab columns --
    op.drop_constraint("fk_submission_partner_character", "submission", type_="foreignkey")
    op.drop_column("submission", "partner_character_id")
    op.drop_column("submission", "collaboration_mode")
    op.execute("DROP TYPE collaborationmode")

    # -- Reverse 1: restore relationship.status enum --
    op.execute("CREATE TYPE relationshipstatus_new AS ENUM ('pending', 'accepted', 'blocked')")
    op.execute(
        "ALTER TABLE relationship "
        "ALTER COLUMN status TYPE relationshipstatus_new "
        "USING CASE "
        "  WHEN status::text = 'active' THEN 'accepted'::relationshipstatus_new "
        "  ELSE status::text::relationshipstatus_new "
        "END"
    )
    op.execute("DROP TYPE relationshipstatus")
    op.execute("ALTER TYPE relationshipstatus_new RENAME TO relationshipstatus")
