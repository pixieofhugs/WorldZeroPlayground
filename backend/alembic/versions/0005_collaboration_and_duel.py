"""Add collaboration/duel tables; drop legacy praxis collab fields; extend vote table.

Revision ID: 0005_collaboration_and_duel
Revises: 0004_rename_submission_to_praxis
Create Date: 2026-04-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_collaboration_and_duel"
down_revision: Union[str, None] = "0004_rename_submission_to_praxis"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. New enum types ────────────────────────────────────────────────────
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE collaborationmode AS ENUM ('collaboration', 'duel');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE collaborationstatus AS ENUM ('in_progress', 'published');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE collaborationinvitestatus AS ENUM ('pending', 'accepted', 'declined');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    # ── 2. collaboration table ───────────────────────────────────────────────
    op.create_table(
        "collaboration",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("task.id"), nullable=False),
        sa.Column(
            "mode",
            sa.Enum("collaboration", "duel", name="collaborationmode", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("in_progress", "published", name="collaborationstatus", create_type=False),
            nullable=False,
            server_default="in_progress",
        ),
        sa.Column("body_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_by_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── 3. collaboration_member table ────────────────────────────────────────
    op.create_table(
        "collaboration_member",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "collaboration_id",
            sa.Integer(),
            sa.ForeignKey("collaboration.id"),
            nullable=False,
        ),
        sa.Column("character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column(
            "has_submitted", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("collaboration_id", "character_id"),
    )

    # ── 4. collaboration_invite table ────────────────────────────────────────
    op.create_table(
        "collaboration_invite",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "collaboration_id",
            sa.Integer(),
            sa.ForeignKey("collaboration.id"),
            nullable=False,
        ),
        sa.Column("inviter_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("invitee_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column(
            "type",
            sa.Enum("collaboration", "duel", name="collaborationmode", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "accepted",
                "declined",
                name="collaborationinvitestatus",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── 5. Praxis: drop legacy collaboration columns ─────────────────────────
    op.drop_column("praxis", "collaboration_mode")
    op.drop_column("praxis", "partner_character_id")
    op.drop_column("praxis", "invite_status")

    # ── 6. Vote: extend for duel votes ───────────────────────────────────────
    # Make praxis_id nullable (duel votes reference collaboration_id instead)
    op.alter_column("vote", "praxis_id", existing_type=sa.Integer(), nullable=True)

    # Add collaboration_id FK
    op.add_column(
        "vote",
        sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaboration.id"), nullable=True),
    )

    # Drop the old unique constraint (was unnamed, so drop by column definition)
    op.drop_constraint("vote_praxis_id_voter_character_id_key", "vote", type_="unique")

    # Add new named unique constraints
    op.create_unique_constraint("uq_vote_solo", "vote", ["praxis_id", "voter_character_id"])
    op.create_unique_constraint(
        "uq_vote_duel", "vote", ["collaboration_id", "voter_character_id", "duel_vote_for"]
    )

    # Drop obsolete legacy enum types from praxis
    op.execute("DROP TYPE IF EXISTS collaborationmode_old CASCADE")
    op.execute("DROP TYPE IF EXISTS invitestatus CASCADE")


def downgrade() -> None:
    # ── Vote: revert ─────────────────────────────────────────────────────────
    op.drop_constraint("uq_vote_duel", "vote", type_="unique")
    op.drop_constraint("uq_vote_solo", "vote", type_="unique")
    op.drop_column("vote", "collaboration_id")
    op.alter_column("vote", "praxis_id", existing_type=sa.Integer(), nullable=False)
    op.create_unique_constraint(
        "vote_praxis_id_voter_character_id_key", "vote", ["praxis_id", "voter_character_id"]
    )

    # ── Praxis: restore legacy columns ───────────────────────────────────────
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE collaborationmode_old AS ENUM ('solo', 'collab', 'duel');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE invitestatus AS ENUM ('pending', 'accepted', 'declined');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.add_column(
        "praxis",
        sa.Column(
            "collaboration_mode",
            sa.Enum("solo", "collab", "duel", name="collaborationmode_old", create_type=False),
            nullable=False,
            server_default="solo",
        ),
    )
    op.add_column(
        "praxis",
        sa.Column(
            "partner_character_id",
            sa.Integer(),
            sa.ForeignKey("character.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "praxis",
        sa.Column(
            "invite_status",
            sa.Enum("pending", "accepted", "declined", name="invitestatus", create_type=False),
            nullable=True,
        ),
    )

    # ── Drop new tables ───────────────────────────────────────────────────────
    op.drop_table("collaboration_invite")
    op.drop_table("collaboration_member")
    op.drop_table("collaboration")

    # ── Drop new enum types ───────────────────────────────────────────────────
    op.execute("DROP TYPE IF EXISTS collaborationinvitestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS collaborationstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS collaborationmode CASCADE")
