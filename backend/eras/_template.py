"""
Era Configuration Template
==========================
Copy this file to create a new era configuration.

Steps:
  1. Copy this file: cp _template.py era_N.py  (where N is the era number)
  2. Rename all ERA_N references to match (e.g. ERA_2, ERA_2_FACTIONS, etc.)
  3. Fill in every section marked with TODO
  4. Update backend/game_config.py:
       - Add: from eras.era_N import ERA_N
       - Change: CURRENT_ERA = ERA_N
  5. Run: python seed.py --env dev
  6. Run tests: pytest tests/unit/test_era_config.py

Each era defines:
  - Factions: the groups players can join, with their point modifiers
  - Tasks: the activities players can sign up for and complete
  - Taunt templates: the faction-flavored trash talk between foes
  - Game rules: task limits, vote budget formula, level thresholds, reset behavior
"""
from game_config import (
    EraConfig,
    FactionConfig,
    LevelProfile,
    LevelUnlock,
    LevelUnlockKind,
    TaskDef,
)


# =============================================================================
# FACTIONS
# =============================================================================
# Each faction needs a unique slug (lowercase, underscores). The slug is the
# primary key in the database and must be stable once deployed.
#
# Required system factions (include these in every era):
#   "ua"       -- an ordinary invite-joinable faction (no starter privilege, ADR-0030)
#   "na"       -- sentinel for tasks with no faction affiliation
#
# Modifier guide (1.0 = no change, >1.0 = bonus, <1.0 = penalty):
#   own_task_modifier       -- solo task from your own faction
#   other_task_modifier     -- solo task from another faction
#   collab_own_modifier     -- collaborative task from your own faction
#   collab_other_modifier   -- collaborative task from another faction
#   duel_win_modifier       -- base points when you win a duel
#   duel_loss_modifier      -- base points when you lose a duel

ERA_N_FACTIONS = {
    # --- Required system factions (copy and customize) ---
    #
    # "ua": FactionConfig(
    #     slug="ua",
    #     name="UA",
    #     description="The Gilt Salon — an ordinary invite-joinable faction.",
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0,
    #     other_task_modifier=1.0,
    #     collab_own_modifier=1.0,
    #     collab_other_modifier=1.0,
    #     duel_win_modifier=1.0,
    #     duel_loss_modifier=1.0,
    # ),
    # "na": FactionConfig(
    #     slug="na",
    #     name="None",
    #     description="Sentinel for tasks with no specific faction.",
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0, other_task_modifier=1.0,
    #     collab_own_modifier=1.0, collab_other_modifier=1.0,
    #     duel_win_modifier=1.0, duel_loss_modifier=1.0,
    # ),
    #
    # --- TODO: Add your player-selectable factions below ---
    #
    # "your_faction": FactionConfig(
    #     slug="your_faction",
    #     name="Your Faction",
    #     description="What makes this faction unique.",
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0,
    #     other_task_modifier=1.0,
    #     collab_own_modifier=1.0,
    #     collab_other_modifier=1.0,
    #     duel_win_modifier=1.0,
    #     duel_loss_modifier=1.0,
    # ),
}


# =============================================================================
# TASKS
# =============================================================================
# Each task defines an activity players can sign up for and submit proof of.
#
#   title               -- display name (unique within this era)
#   description         -- full task description shown to players
#   faction_slug        -- which faction owns this task (must match a key above)
#                          Use "na" for cross-faction tasks
#   level_required      -- minimum character level to sign up (0 = anyone)
#   point_value         -- base points awarded on completion (before modifiers)
#   is_task_vision_eligible -- True if Ephemerists can see this after retirement

ERA_N_TASKS = (
    # TODO: Define your tasks. Example:
    #
    # TaskDef(
    #     title="Example Task",
    #     description="Do something interesting and submit proof.",
    #     faction_slug="ua",
    #     level_required=1,
    #     point_value=10,
    # ),
)


# =============================================================================
# TAUNTS — NOT config-owned (ADR-0031)
# =============================================================================
# Taunt copy is no longer authored here. Per ADR-0031 the template strings live
# in frontend/src/locales/en/taunts.json (faction_slug -> trigger_type ->
# [variants], with a "default" fallback). The backend persists a structured
# (faction_slug, trigger_type) reference and the frontend catalog resolves the
# words. There is nothing to define in this file for taunts.


# =============================================================================
# LEVEL PROFILES
# =============================================================================
# Rank + unlocks shown by the level-up pop-up, indexed by level like
# level_thresholds (index 0 = start state, never shown). Every "ability"
# unlock must match a real gate constant above at that same level — don't
# invent one. "sense" unlocks are pure whimsy, no mechanics required.
#
# ADR-0031: profiles carry copy KEYS, never prose. The English words live in
# frontend/src/locales/en/progression.json (ranks.<rank_key>,
# unlocks.<key>.name/.desc). Add matching entries there for every key below.

ERA_N_LEVEL_PROFILES = (
    LevelProfile(rank_key="", unlocks=()),  # index 0 = start state, never shown
    # TODO: One LevelProfile per real level. Example:
    #
    # LevelProfile(
    #     rank_key="your_rank_slug",
    #     unlocks=(
    #         LevelUnlock(LevelUnlockKind.ability, "ability_slug"),
    #         LevelUnlock(LevelUnlockKind.sense, "sense_slug"),
    #     ),
    # ),
)


# =============================================================================
# ERA DEFINITION
# =============================================================================
# Combine everything above into a single EraConfig instance.
#
# Level thresholds: index = level number, value = cumulative points to reach it.
#   level_thresholds[0] = 0 (everyone starts at level 0)
#   level_thresholds[1] = points to reach level 1, etc.
#   The tuple length determines the maximum achievable level.
#
# Reset flags: what happens to characters when THIS era begins.
#   reset_all_time_score should almost always be False.
#
# Vote budget formula (on-read, see services/scoring.compute_votes_available):
#   votes_available = base + floor(multiplier x score) - votes_spent_this_era

ERA_N = EraConfig(
    name="Era N",                        # TODO: Human-readable era name
    config_key="era_n",                  # TODO: Unique key stored in DB (lowercase, underscored)

    max_task_signups=20,                 # Max active task signups per character
    max_duel_participants=2,             # Max members in a duel praxis

    vote_budget_base=100,                # Starting vote budget
    vote_budget_multiplier=2.0,          # Extra votes per point of score

    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),  # TODO: Adjust

    # Capability level gates — minimum level to unlock each action.
    level_to_propose_task=3,
    level_to_propose_metatask=6,
    level_to_see_metatasks=6,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,

    # Praxis / moderation / metatask gates
    duel_level_required=2,
    collaboration_level_required=1,
    collab_auto_submit_days=10,          # pending-publish silence-is-consent window (ADR-0012)
    metatask_apply_level=7,
    flag_level_required=4,
    # Comment gates (ADR-0006)
    comment_level_required=2,
    comment_flag_review_threshold=1,

    # Character account / faction gates
    second_character_level_required=4,
    albescent_level_required=8,
    faction_graduation_level=3,
    invitation_point_threshold=50,   # ADR-0022: points from a faction's tasks
    invitation_task_threshold=2,     # ADR-0022: completed tasks for that faction

    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,          # Almost always False

    factions=ERA_N_FACTIONS,
    tasks=ERA_N_TASKS,
    level_profiles=ERA_N_LEVEL_PROFILES,
)
