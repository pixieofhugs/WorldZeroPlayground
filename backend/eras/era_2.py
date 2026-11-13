"""
Era 2 — Metamorphosis. Authored, offerable, not necessarily live (ADR-0091).

Changes only the own/other split (1.2 / 0.8, solo and duel) and the roster.
"""
from eras.era_1 import ERA_1_LEVEL_PROFILES
from game_config import EraConfig, FactionConfig, TaskDef


# =============================================================================
# FACTIONS
# =============================================================================

# No UA, deliberately: reset_faction sweeps everyone to `na` at rollover.
#
# The 1.2/0.8 split is SOLO AND DUEL ONLY (owner ruling): collab stays 1.0 so
# a collab never pays less than solo and cross-faction collabs aren't
# penalised. Don't "make these consistent".
ERA_2_FACTIONS = {
    "snide": FactionConfig(
        slug="snide",
        can_always_rejoin=False,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=2.0,
        duel_loss_modifier=0.0,
        takes_duel_ties=True,         # as SOLE holder (#2664)
    ),
    "wow": FactionConfig(
        slug="wow",
        can_always_rejoin=False,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        level_jump_reach=1,           # once per level, claim ONE task 1 level up
    ),
    "everymen": FactionConfig(
        slug="everymen",
        can_always_rejoin=False,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        can_hold_multiple_memberships=True,   # Double Dipper
    ),
    # Floor values; widened by inheritance (#1871). No Ephemerists, so no Task
    # Vision to inherit.
    "albescent": FactionConfig(
        slug="albescent",
        can_always_rejoin=True,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        # Albescent's own perk, not inherited.
        can_apply_metatask_at_any_level=True,
        inherits_faction_perks=True,
    ),
    "na": FactionConfig(
        slug="na",
        can_always_rejoin=False,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
}


# =============================================================================
# TASKS
# =============================================================================

# Empty for the same reason as Era 1's (see era_1.py).
ERA_2_TASKS: tuple[TaskDef, ...] = ()


# =============================================================================
# LEVEL PROFILES
# =============================================================================

# Shared with Era 1 while every gate matches; fork when a gate is re-tuned.
ERA_2_LEVEL_PROFILES = ERA_1_LEVEL_PROFILES


# =============================================================================
# ERA DEFINITION
# =============================================================================

ERA_2 = EraConfig(
    name="Metamorphosis",
    config_key="era_2",
    # Everything below is Era 1's value, deliberately unchanged.
    max_task_signups=20,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    level_to_propose_task=3,
    level_to_propose_metatask=5,
    level_to_see_metatasks=5,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,
    pending_task_admin_review_hours=48,
    duel_level_required=2,
    collaboration_level_required=1,
    collab_auto_submit_days=10,
    metatask_apply_level=5,
    flag_level_required=4,
    vote_level_required=1,
    metatasks_per_praxis_base=1,
    metatasks_per_praxis_max=3,
    metatasks_per_praxis_max_level=7,
    comment_level_required=2,
    comment_flag_review_threshold=1,
    second_character_level_required=4,
    # Knowingly accepted: the coverage half of the Albescent unlock covers only
    # three factions here, so it's far cheaper than in Era 1.
    albescent_level_required=8,
    invitation_point_threshold=50,   # ADR-0022
    invitation_task_threshold=2,
    reset_score=True,
    reset_level=True,
    reset_faction=True,              # sweeps ex-UA characters to `na` at rollover
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_2_FACTIONS,
    tasks=ERA_2_TASKS,
    level_profiles=ERA_2_LEVEL_PROFILES,
    # allow_praxis_on_retired_task_factions stays empty: no Ephemerists.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,
)
