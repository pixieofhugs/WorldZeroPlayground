"""Squashed schema — complete baseline including Collaboration & Duel.

Replaces all prior incremental migrations with one clean baseline.
Final state: praxis (no legacy collab columns), collaboration/member/invite
tables, vote extended for duel votes, new collaborationmode enum.

Revision ID: 0001_squashed
Revises: (root)
Create Date: 2026-04-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_squashed"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ENUM_NAMES: list[str] = [
    "accountstatus", "characterstatus", "factionstatus", "taskstatus",
    "charactertaskstatus", "mediatype", "moderationstatus",
    "relationshiptype", "relationshipstatus", "taunttriggertype", "bonustype",
    "collaborationmode", "collaborationstatus", "collaborationinvitestatus",
]

FACTIONS = [
    ("ua",          "UA",           "The default starting faction. Full points on all tasks. Must leave at level 3.",    "visible"),
    ("ua_masters",  "UA Masters",   "Veterans who aged out of UA. Can sign up for any task at reduced points.",          "visible"),
    ("snide",       "Snide",        "Specialists in one-on-one competition. Bonus points for winning duels.",            "visible"),
    ("gestalt",     "Gestalt",      "Collective-minded. Excel at their own faction's tasks; reduced elsewhere.",         "visible"),
    ("journeymen",  "Journeymen",   "Explorers with access to select retired tasks (Task Vision ability).",              "visible"),
    ("analog",      "Analog",       "Depth over breadth. Can repeat one task per level for points (Double Dipper).",     "visible"),
    ("singularity", "Singularity",  "TBD",                                                                               "visible"),
    ("albescent",   "/Albescent",   "Full points and any meta tasks from any group. Unlock-only.",                        "hidden"),
    ("aged_out",    "AgedOutOfUA",  "Placeholder faction for characters who hit level 3 while offline.",                  "hidden"),
    ("na",          "None",         "Sentinel for tasks with no specific faction affiliation.",                            "hidden"),
]


def upgrade() -> None:
    # ── Tier 0: no FK deps ───────────────────────────────────────────────────

    op.create_table(
        "faction",
        sa.Column("slug", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("status", sa.Enum("visible", "hidden", "deprecated", name="factionstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Tier 1 ───────────────────────────────────────────────────────────────

    op.create_table(
        "account",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), unique=True, nullable=False),
        sa.Column("status", sa.Enum("active", "suspended", "deleted", name="accountstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "role",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), unique=True, nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 2 ───────────────────────────────────────────────────────────────

    op.create_table(
        "oauth_provider",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_user_id", sa.String(), nullable=False),
        sa.Column("access_token", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "account_role",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.id"), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("granted_by", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
    )

    op.create_table(
        "era",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("config_key", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_by", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 3 ───────────────────────────────────────────────────────────────

    op.create_table(
        "character",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("username", sa.String(), unique=True, nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.String(), nullable=False, server_default=""),
        sa.Column("location", sa.String(), nullable=False, server_default=""),
        sa.Column("faction_slug", sa.String(), sa.ForeignKey("faction.slug"), nullable=False, server_default="ua"),
        sa.Column("status", sa.Enum("active", "paused", "banned", name="characterstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 4 ───────────────────────────────────────────────────────────────

    op.create_table(
        "character_stats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("era_id", sa.Integer(), sa.ForeignKey("era.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("all_time_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("votes_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("character_id", "era_id"),
    )

    op.create_table(
        "task",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("point_value", sa.Integer(), nullable=False),
        sa.Column("level_required", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "active", "retired", name="taskstatus"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("primary_faction_slug", sa.String(), sa.ForeignKey("faction.slug"), nullable=False, server_default="na"),
        sa.Column("is_task_vision_eligible", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "meta_task",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("faction_slug", sa.String(), sa.ForeignKey("faction.slug"), nullable=False),
        sa.Column("bonus_type", sa.Enum("flat", "percentage", name="bonustype"), nullable=False),
        sa.Column("bonus_value", sa.Float(), nullable=False),
        sa.Column("level_required", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "relationship",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("to_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("type", sa.Enum("friend", "foe", name="relationshiptype"), nullable=False),
        sa.Column("status", sa.Enum("active", "blocked", name="relationshipstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("from_character_id", "to_character_id"),
    )

    op.create_table(
        "message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("to_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "taunt_message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("to_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "trigger_type",
            sa.Enum("score_overtake", "level_up", "praxis_complete", name="taunttriggertype"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "faction_defection_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("faction_slug", sa.String(), nullable=False),
        sa.Column("era_id", sa.Integer(), nullable=False),
        sa.Column("defected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["faction_slug"], ["faction.slug"]),
        sa.ForeignKeyConstraint(["era_id"], ["era.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("character_id", "faction_slug", "era_id"),
    )

    op.create_table(
        "invitation_letter",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("faction_slug", sa.String(), nullable=False),
        sa.Column("era_id", sa.Integer(), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["faction_slug"], ["faction.slug"]),
        sa.ForeignKeyConstraint(["era_id"], ["era.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("character_id", "faction_slug", "era_id"),
    )

    op.create_table(
        "analog_double_dipper",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("level_tier", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["character.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("character_id", "level_tier"),
    )

    # ── Tier 5 ───────────────────────────────────────────────────────────────

    op.create_table(
        "task_faction",
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("task.id"), primary_key=True),
        sa.Column("faction_slug", sa.String(), sa.ForeignKey("faction.slug"), primary_key=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
    )

    op.create_table(
        "character_task",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("task.id"), nullable=False),
        sa.Column("signed_up_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "status",
            sa.Enum("in_progress", "submitted", "abandoned", name="charactertaskstatus"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 6: praxis (no legacy collab columns) ─────────────────────────────

    op.create_table(
        "praxis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("task.id"), nullable=False),
        sa.Column("character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "moderation_status",
            sa.Enum("visible", "flagged", "hidden", "failed", name="moderationstatus"),
            nullable=False,
            server_default="visible",
        ),
        sa.Column("is_withdrawn", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("flagged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 7: collaboration ─────────────────────────────────────────────────

    op.create_table(
        "collaboration",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("task.id"), nullable=False),
        sa.Column(
            "mode",
            sa.Enum("collaboration", "duel", name="collaborationmode"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("in_progress", "published", name="collaborationstatus"),
            nullable=False,
            server_default="in_progress",
        ),
        sa.Column("body_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 8: collaboration members and invites ─────────────────────────────

    op.create_table(
        "collaboration_member",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaboration.id"), nullable=False),
        sa.Column("character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("has_submitted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("collaboration_id", "character_id"),
    )

    op.create_table(
        "collaboration_invite",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaboration.id"), nullable=False),
        sa.Column("inviter_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("invitee_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column(
            "type",
            sa.Enum("collaboration", "duel", name="collaborationmode", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "accepted", "declined", name="collaborationinvitestatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Tier 9: praxis dependents + vote ─────────────────────────────────────

    op.create_table(
        "media_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("praxis_id", sa.Integer(), sa.ForeignKey("praxis.id"), nullable=False),
        sa.Column("type", sa.Enum("image", "video", "audio", name="mediatype"), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "vote",
        sa.Column("id", sa.Integer(), primary_key=True),
        # praxis_id is nullable — duel votes use collaboration_id instead
        sa.Column("praxis_id", sa.Integer(), sa.ForeignKey("praxis.id"), nullable=True),
        sa.Column("collaboration_id", sa.Integer(), sa.ForeignKey("collaboration.id"), nullable=True),
        sa.Column("voter_character_id", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("voter_account_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("duel_vote_for", sa.Integer(), sa.ForeignKey("character.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        # Solo praxis votes: one vote per character per praxis
        sa.UniqueConstraint("praxis_id", "voter_character_id", name="uq_vote_solo"),
        # Duel votes: one vote per character per collaboration per target
        sa.UniqueConstraint("collaboration_id", "voter_character_id", "duel_vote_for", name="uq_vote_duel"),
    )

    op.create_table(
        "flag",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("praxis_id", sa.Integer(), sa.ForeignKey("praxis.id"), nullable=False),
        sa.Column("flagged_by", sa.Integer(), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "praxis_meta_task",
        sa.Column("praxis_id", sa.Integer(), sa.ForeignKey("praxis.id"), primary_key=True),
        sa.Column("meta_task_id", sa.Integer(), sa.ForeignKey("meta_task.id"), primary_key=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Seed factions ─────────────────────────────────────────────────────────

    conn = op.get_bind()
    for slug, name, description, status in FACTIONS:
        conn.execute(
            sa.text(
                "INSERT INTO faction (slug, name, description, status) "
                "VALUES (:slug, :name, :description, :status) "
                "ON CONFLICT (slug) DO NOTHING"
            ),
            {"slug": slug, "name": name, "description": description, "status": status},
        )


def downgrade() -> None:
    op.drop_table("praxis_meta_task")
    op.drop_table("flag")
    op.drop_table("vote")
    op.drop_table("media_item")
    op.drop_table("collaboration_invite")
    op.drop_table("collaboration_member")
    op.drop_table("collaboration")
    op.drop_table("praxis")
    op.drop_table("character_task")
    op.drop_table("task_faction")
    op.drop_table("analog_double_dipper")
    op.drop_table("invitation_letter")
    op.drop_table("faction_defection_history")
    op.drop_table("taunt_message")
    op.drop_table("message")
    op.drop_table("relationship")
    op.drop_table("meta_task")
    op.drop_table("task")
    op.drop_table("character_stats")
    op.drop_table("character")
    op.drop_table("era")
    op.drop_table("account_role")
    op.drop_table("oauth_provider")
    op.drop_table("role")
    op.drop_table("account")
    op.drop_table("contact_messages")
    op.drop_table("faction")
    for name in reversed(ENUM_NAMES):
        op.execute(f"DROP TYPE IF EXISTS {name}")
