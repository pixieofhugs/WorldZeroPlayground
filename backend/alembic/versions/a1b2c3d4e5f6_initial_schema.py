"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    taskstatus = sa.Enum("pending", "active", "retired", name="taskstatus")
    ctask = sa.Enum("in_progress", "submitted", "abandoned", name="charactertaskstatus")
    mediatype = sa.Enum("image", "video", "audio", name="mediatype")
    reltype = sa.Enum("friend", "foe", name="relationshiptype")
    relstatus = sa.Enum("pending", "accepted", "blocked", name="relationshipstatus")
    bonustype = sa.Enum("flat", "percentage", name="bonustype")

    op.create_table(
        "faction",
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("slug"),
    )

    op.create_table(
        "account",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "role",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "oauth_provider",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_user_id", sa.String(), nullable=False),
        sa.Column("access_token", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "account_role",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("granted_by", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["granted_by"], ["account.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["role.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "era",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("config_key", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("started_by", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["started_by"], ["account.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "character",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("all_time_score", sa.Integer(), nullable=False),
        sa.Column("votes_available", sa.Integer(), nullable=False),
        sa.Column("faction_slug", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["faction_slug"], ["faction.slug"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_table(
        "task",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("point_value", sa.Integer(), nullable=False),
        sa.Column("level_required", sa.Integer(), nullable=False),
        sa.Column("status", taskstatus, nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("primary_faction_slug", sa.String(), nullable=True),
        sa.Column("is_task_vision_eligible", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["character.id"]),
        sa.ForeignKeyConstraint(["primary_faction_slug"], ["faction.slug"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "meta_task",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("faction_slug", sa.String(), nullable=False),
        sa.Column("bonus_type", bonustype, nullable=False),
        sa.Column("bonus_value", sa.Float(), nullable=False),
        sa.Column("level_required", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["faction_slug"], ["faction.slug"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "relationship",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_character_id", sa.Integer(), nullable=False),
        sa.Column("to_character_id", sa.Integer(), nullable=False),
        sa.Column("type", reltype, nullable=False),
        sa.Column("status", relstatus, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["from_character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["to_character_id"], ["character.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("from_character_id", "to_character_id"),
    )

    op.create_table(
        "message",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_character_id", sa.Integer(), nullable=False),
        sa.Column("to_character_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["from_character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["to_character_id"], ["character.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "task_faction",
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("faction_slug", sa.String(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["faction_slug"], ["faction.slug"]),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("task_id", "faction_slug"),
    )

    op.create_table(
        "character_task",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("signed_up_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("status", ctask, nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "submission",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("is_flagged", sa.Boolean(), nullable=False),
        sa.Column("flagged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "media_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("type", mediatype, nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submission.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "vote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("voter_character_id", sa.Integer(), nullable=False),
        sa.Column("voter_account_id", sa.Integer(), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("duel_vote_for", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["duel_vote_for"], ["character.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submission.id"]),
        sa.ForeignKeyConstraint(["voter_account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["voter_character_id"], ["character.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", "voter_character_id"),
    )

    op.create_table(
        "flag",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("flagged_by", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["flagged_by"], ["character.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submission.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "submission_meta_task",
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("meta_task_id", sa.Integer(), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["meta_task_id"], ["meta_task.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submission.id"]),
        sa.PrimaryKeyConstraint("submission_id", "meta_task_id"),
    )


def downgrade() -> None:
    op.drop_table("submission_meta_task")
    op.drop_table("flag")
    op.drop_table("vote")
    op.drop_table("media_item")
    op.drop_table("submission")
    op.drop_table("character_task")
    op.drop_table("task_faction")
    op.drop_table("message")
    op.drop_table("relationship")
    op.drop_table("meta_task")
    op.drop_table("task")
    op.drop_table("character")
    op.drop_table("era")
    op.drop_table("account_role")
    op.drop_table("oauth_provider")
    op.drop_table("role")
    op.drop_table("account")
    op.drop_table("faction")

    sa.Enum(name="bonustype").drop(op.get_bind())
    sa.Enum(name="relationshipstatus").drop(op.get_bind())
    sa.Enum(name="relationshiptype").drop(op.get_bind())
    sa.Enum(name="mediatype").drop(op.get_bind())
    sa.Enum(name="charactertaskstatus").drop(op.get_bind())
    sa.Enum(name="taskstatus").drop(op.get_bind())
