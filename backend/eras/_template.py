"""
Era Configuration Template — copy to era_N.py and fill in every TODO.

Steps:
  1. cp _template.py era_N.py; rename ERA_N references.
  2. In backend/game_config.py:
       - Add an `if name in ("ERA_N", "ERA_N_FACTIONS"):` branch to `__getattr__`
         like ERA_2's (lazy import avoids a circular import).
       - APPEND "era_N": "ERA_N" to _ERA_ATTRIBUTE_BY_CONFIG_KEY (order = admin
         selector order).
       - Do NOT assign CURRENT_ERA: the latest DB `Era` row picks the live era
         (ADR-0091). A mod opens it from Admin > Era, or an operator runs
         `python scripts/era_reset.py USERNAME --yes`.
  3. python seed.py --env dev; pytest tests/unit/test_era_config.py
  4. Write backend/tests/integration/eras/test_era_N_rules.py (#2709) —
     `tests/test_era_rules_modules.py` fails without it, and names every perk it
     never mentions. Pass ERA_N explicitly to every service call; patching
     CURRENT_ERA never reaches def-time defaults.
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
# Slug = DB primary key; stable once deployed. Names/descriptions go in
# frontend/src/locales/en/factions.json (ADR-0038) for every slug.
#
# Required in every era (ADR-0087; __post_init__ raises at import otherwise):
#   "na"        -- no-faction task sentinel AND birth faction (see faction_slugs.py)
#   "albescent" -- the endgame (ADR-0080); its gate is era-tunable.
#
# Modifiers (1.0 = no change): own/other_task (solo), collab_own/other,
# duel_win/loss (base points). Optional abilities, default off:
#   level_jump_reach              -- levels above own claimable, once per level
#   habit_bonus_points            -- bonus within habit_window_days of last praxis
#   can_hold_multiple_memberships -- may re-claim a task already held
#   can_always_rejoin             -- rejoinable where leaving is otherwise final
#   can_apply_metatask_at_any_level -- exempt from metatask_apply_level
#   reads_the_array               -- config in the browser console (#1869)
#   takes_duel_ties               -- the SOLE holder takes a tied duel; not inherited
#   inherits_faction_perks        -- union of every other faction's perks (#1871);
#                                    duel pair taken whole from the top duellist
#
# Perks also live in the allow_praxis_on_*_task_factions frozensets below.

ERA_N_FACTIONS = {
    # --- Required factions (BOTH must be present) ---
    #
    # "na": FactionConfig(
    #     slug="na",
    #     can_always_rejoin=False,
    #     own_task_modifier=1.0, other_task_modifier=1.0,
    #     collab_own_modifier=1.0, collab_other_modifier=1.0,
    #     duel_win_modifier=1.0, duel_loss_modifier=1.0,
    # ),
    #
    # "albescent": FactionConfig(
    #     slug="albescent",
    #     can_always_rejoin=True,
    #     own_task_modifier=1.0, other_task_modifier=1.0,
    #     collab_own_modifier=1.0, collab_other_modifier=1.0,
    #     duel_win_modifier=1.0, duel_loss_modifier=1.0,
    #     # inherits_faction_perks=True,  # Era 1 and Era 2 both grant this
    # ),
    #
    # --- TODO: Add your player-selectable factions below ---
    #
    # "your_faction": FactionConfig(
    #     slug="your_faction",
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
#   faction_slug   -- a key above; "na" for cross-faction
#   level_required -- 0 = anyone
#   point_value    -- before modifiers
#   is_task_vision_eligible -- Ephemerists see it after retirement
#
# DECIDE FIRST: tasks here are re-added by `seed.py::sync_era_tasks` on EVERY
# deploy, so an admin-UI delete won't stick. Era 1 leaves this EMPTY and
# curates in the admin UI (#1398). Level 0 is the game-wide onboarding task
# (`seed.py::ensure_onboarding_task`, #511).

ERA_N_TASKS: tuple[TaskDef, ...] = (
    # TODO: tasks, or leave empty. Example:
    #
    # TaskDef(
    #     title="Example Task",
    #     description="Do something interesting and submit proof.",
    #     faction_slug="ua",
    #     level_required=1,
    #     point_value=10,
    # ),
)


# Taunts are not config-owned (ADR-0031): see frontend locales taunts.json.


# =============================================================================
# LEVEL PROFILES
# =============================================================================
# Indexed by level like level_thresholds. Every "ability" unlock must match a
# real gate at that level; "sense" is whimsy. Keys only (ADR-0031): add
# wording to progression.json.

ERA_N_LEVEL_PROFILES = (
    LevelProfile(rank_key="", unlocks=()),  # index 0 = start state, never shown
    # TODO: one per real level. Example:
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
# level_thresholds: cumulative points per level; length = max level.
# votes_available = base + floor(multiplier x score) - votes_spent_this_era
# (services/scoring.compute_votes_available).

ERA_N = EraConfig(
    name="Era N",                        # TODO
    config_key="era_n",                  # TODO: Unique key stored in DB (lowercase, underscored)

    max_task_signups=20,

    vote_budget_base=100,
    vote_budget_multiplier=2.0,

    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),  # TODO: Adjust

    level_to_propose_task=3,
    level_to_propose_metatask=6,
    level_to_see_metatasks=6,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,
    # Hours a proposal stays admin-only (#1695).
    pending_task_admin_review_hours=48,

    duel_level_required=2,
    collaboration_level_required=1,
    collab_auto_submit_days=10,          # pending-publish silence-is-consent window (ADR-0012)
    metatask_apply_level=7,
    flag_level_required=4,
    vote_level_required=1,
    metatasks_per_praxis_base=1,
    metatasks_per_praxis_max=3,
    metatasks_per_praxis_max_level=7,
    comment_level_required=2,
    comment_flag_review_threshold=1,

    # Which sign-up gates a collab invite lifts (#1511); False enforces it.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,

    second_character_level_required=4,
    albescent_level_required=8,
    invitation_point_threshold=50,   # ADR-0022
    invitation_task_threshold=2,
    # starting_faction_slug / reset_faction_slug: OMIT — pinned to `na` (ADR-0087).

    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,          # almost always False

    factions=ERA_N_FACTIONS,
    tasks=ERA_N_TASKS,
    level_profiles=ERA_N_LEVEL_PROFILES,

    # Perks as slug sets (#1871); inheritors are added automatically.
    #
    # allow_praxis_on_retired_task_factions=frozenset({"your_faction"}),
    # allow_praxis_on_pending_task_factions=frozenset(),
)
