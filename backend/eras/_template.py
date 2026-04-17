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
from game_config import EraConfig, FactionConfig, TaskDef


# =============================================================================
# FACTIONS
# =============================================================================
# Each faction needs a unique slug (lowercase, underscores). The slug is the
# primary key in the database and must be stable once deployed.
#
# Required system factions (include these in every era):
#   "ua"       -- default starting faction (is_selectable=False)
#   "aged_out" -- placeholder for characters who hit level 3 offline
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
    #     description="The default starting faction.",
    #     color="#6b6a7a",
    #     is_selectable=False,
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0,
    #     other_task_modifier=1.0,
    #     collab_own_modifier=1.0,
    #     collab_other_modifier=1.0,
    #     duel_win_modifier=1.0,
    #     duel_loss_modifier=1.0,
    # ),
    # "aged_out": FactionConfig(
    #     slug="aged_out",
    #     name="AgedOutOfUA",
    #     description="Placeholder for characters who hit level 3 while offline.",
    #     color="#6b6a7a",
    #     is_selectable=False,
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0, other_task_modifier=1.0,
    #     collab_own_modifier=1.0, collab_other_modifier=1.0,
    #     duel_win_modifier=1.0, duel_loss_modifier=1.0,
    # ),
    # "na": FactionConfig(
    #     slug="na",
    #     name="None",
    #     description="Sentinel for tasks with no specific faction.",
    #     color="#a9a9a9",
    #     is_selectable=False,
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
    #     color="#hexcolor",
    #     is_selectable=True,
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
#   is_task_vision_eligible -- True if Journeymen can see this after retirement

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
# TAUNT TEMPLATES
# =============================================================================
# Faction-flavored trash talk. Templates use {from_name} and {to_name}.
#
# Structure: faction_slug -> trigger_type -> list of template strings
# The "default" key provides fallbacks for factions without custom taunts.
#
# Trigger types:
#   "score_overtake"       -- when one foe passes another on the leaderboard
#   "level_up"             -- when a foe levels up
#   "praxis_complete"  -- when a foe completes a task

ERA_N_TAUNT_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "default": {
        "score_overtake": [
            # TODO: Add default score overtake taunts
        ],
        "level_up": [
            # TODO: Add default level up taunts
        ],
        "praxis_complete": [
            # TODO: Add default submission complete taunts
        ],
    },
    # TODO: Add per-faction taunts (one dict per faction slug):
    #
    # "your_faction": {
    #     "score_overtake": [
    #         "{from_name} outscored {to_name}. Classic.",
    #     ],
    #     "level_up": [
    #         "{from_name} leveled up. {to_name} didn't.",
    #     ],
    #     "praxis_complete": [
    #         "{from_name} submitted proof. {to_name} is still planning.",
    #     ],
    # },
}


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
# Vote budget formula: votes_available = base + floor(multiplier x score)

ERA_N = EraConfig(
    name="Era N",                        # TODO: Human-readable era name
    config_key="era_n",                  # TODO: Unique key stored in DB (lowercase, underscored)

    max_task_signups=20,                 # Max active task signups per character
    max_duel_participants=2,             # Max members in a duel praxis
    max_collab_participants=20,          # Max members in a collab praxis

    vote_budget_base=100,                # Starting vote budget
    vote_budget_multiplier=2.0,          # Extra votes per point of score

    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),  # TODO: Adjust

    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,          # Almost always False

    factions=ERA_N_FACTIONS,
    tasks=ERA_N_TASKS,
    taunt_templates=ERA_N_TAUNT_TEMPLATES,
)
