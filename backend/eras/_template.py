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
       - Add the key to _ERA_ATTRIBUTE_BY_CONFIG_KEY ("era_N": "ERA_N") -- this
         is the registry every era-aware tool walks, step 7 included
       - Change: CURRENT_ERA = ERA_N
  5. Run: python seed.py --env dev
  6. Run tests: pytest tests/unit/test_era_config.py
  7. Write this era's rules module (#2709). It is not optional:
         backend/tests/integration/eras/test_era_N_rules.py
     `tests/test_era_rules_modules.py` fails while it is missing, and fails
     again naming every perk this era grants that the module never mentions.
     Copy the shape from test_era_1_rules.py / test_era_2_rules.py.

**Why step 7 is a step and not a nice-to-have.** Era 2 was authored granting
four faction perks and not one of them was ever exercised, because nothing in
the repo knew which tests an era owes. Worse, a rule can lose its *subject* at a
rollover and its guard then passes vacuously: `test_coven_collab_banks_half_up`
could not have failed under Era 2, since Coven's 1.1 collab bonus was the only
fraction in Era 1 for the half-up rounding to round. So the module must name
**your** era -- pass ERA_N explicitly into every service call. Never read
CURRENT_ERA there, and do not try to monkeypatch it: `services/era.py` and
`scripts/era_reset.py` bind it as a default argument at def time, so patching
the module attribute never reaches them.

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
# Faction names/descriptions are NOT config-owned (ADR-0038): the English words
# live in frontend/src/locales/en/factions.json (names.<slug>, descriptions.<slug>).
# Config owns which factions exist + their mechanics; add matching name/description
# entries there for every slug below.
#
# The two structurally required factions (ADR-0087). EraConfig.__post_init__
# raises at IMPORT if either is missing, so an era file that drops one never
# boots the app:
#   "na"        -- answers two questions at once (see backend/faction_slugs.py):
#                  the sentinel for a task with no faction affiliation, AND the
#                  unaffiliated state every character is born into (ADR-0019).
#                  Omit it and both the default birth faction and every
#                  cross-faction task lose their FK target.
#   "albescent" -- the endgame faction (ADR-0080/ADR-0082). Its GATE is yours to
#                  tune -- albescent_level_required and the coverage rule are
#                  ordinary era fields, and Era 2's roster makes the coverage
#                  half far cheaper than Era 1's. What you may not do is leave
#                  the era with no endgame.
#
# Modifier guide (1.0 = no change, >1.0 = bonus, <1.0 = penalty):
#   own_task_modifier       -- solo task from your own faction
#   other_task_modifier     -- solo task from another faction
#   collab_own_modifier     -- collaborative task from your own faction
#   collab_other_modifier   -- collaborative task from another faction
#   duel_win_modifier       -- base points when you win a duel
#   duel_loss_modifier      -- base points when you lose a duel
#   level_jump_reach        -- levels above own level this faction may reach when
#                              signing up, once per level. Optional, defaults to 0
#                              (no ability). Era 1 gives wow 1; everyone else 0.
#
# Non-modifier abilities (all optional, all default to "no ability"):
#   habit_bonus_points            -- flat bonus on a praxis sealed within
#                                    habit_window_days of another of your own
#   can_hold_multiple_memberships -- may re-claim a task you already hold
#   can_always_rejoin             -- rejoinable after leaving, where leaving is
#                                    otherwise era-final
#   can_apply_metatask_at_any_level -- exempt from metatask_apply_level
#   reads_the_array               -- "the array" (#1869): members read this era's
#                                    config in the browser console. Purely
#                                    client-side — /game-config already ships to
#                                    everyone, so there is no server door to add
#   inherits_faction_perks        -- holds every OTHER faction's perk in this era
#                                    (#1871). Declare the faction's own floor and
#                                    EraConfig resolves the union; the duel pair
#                                    is inherited WHOLE from the highest
#                                    duel_win_modifier, downside included.
#
# ** Perks live in TWO places. ** The fields above are one; the other is the
# pair of EraConfig frozensets in the ERA_N block below,
# `allow_praxis_on_retired_task_factions` / `..._pending_task_factions`. Any
# audit of "what can faction X do" must read both — #1871 exists because one
# read only the first.

ERA_N_FACTIONS = {
    # --- Required factions (copy and customize; BOTH must be present) ---
    #
    # Every OTHER faction is this era's own choice: Era 2 drops "ua" entirely
    # (#1618) and nothing structural objects. These two are not a choice.
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
# Each task defines an activity players can sign up for and submit proof of.
#
#   title               -- display name (unique within this era)
#   description         -- full task description shown to players
#   faction_slug        -- which faction owns this task (must match a key above)
#                          Use "na" for cross-faction tasks
#   level_required      -- minimum character level to sign up (0 = anyone)
#   point_value         -- base points awarded on completion (before modifiers)
#   is_task_vision_eligible -- True if Ephemerists can see this after retirement
#
# DECIDE FIRST: does this era own its board, or does the admin UI?
#
# `seed.py::sync_era_tasks` adds every task named here that is missing from the
# database, and `start.sh` runs the seeder on EVERY deploy. A task listed here is
# therefore *permanent*: deleting it in the admin UI lasts until the next deploy
# brings it back. That is the right behaviour for a fixed, authored era roster,
# and the wrong behaviour for a board someone curates by hand.
#
# Era 1 chose the latter and leaves this tuple EMPTY (#1398). Keep the field
# wired up either way — `EraConfig.tasks` is not going anywhere.
#
# Level 0 is reserved: the one game-wide onboarding task is seeded by
# `seed.py::ensure_onboarding_task` (#511) and belongs to no era.

ERA_N_TASKS: tuple[TaskDef, ...] = (
    # TODO: Define your tasks, or leave this empty and author them in the admin
    # UI. Example:
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

    vote_budget_base=100,                # Starting vote budget
    vote_budget_multiplier=2.0,          # Extra votes per point of score

    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),  # TODO: Adjust

    # Capability level gates — minimum level to unlock each action.
    level_to_propose_task=3,
    level_to_propose_metatask=6,
    level_to_see_metatasks=6,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,
    # How long a fresh proposal stays admin-only, in hours (#1695) — the WHEN
    # to the gate above's WHO. Admins are exempt.
    pending_task_admin_review_hours=48,

    # Praxis / moderation / metatask gates
    duel_level_required=2,
    collaboration_level_required=1,
    collab_auto_submit_days=10,          # pending-publish silence-is-consent window (ADR-0012)
    metatask_apply_level=7,
    flag_level_required=4,
    # Metatask-per-praxis cap: base until the max-level, then max.
    metatasks_per_praxis_base=1,
    metatasks_per_praxis_max=3,
    metatasks_per_praxis_max_level=7,
    # Comment gates (ADR-0006)
    comment_level_required=2,
    comment_flag_review_threshold=1,

    # Collab invites: which sign-up gates an invite lifts (#1511). Era 1 lets an
    # invited collaborator onto a task they could never claim themselves — any
    # level, any faction — and charges only the task bank, on accept. Set a flag
    # False to make the invite door enforce that gate like sign-up does.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,

    # Character account / faction gates
    second_character_level_required=4,
    albescent_level_required=8,
    invitation_point_threshold=50,   # ADR-0022: points from a faction's tasks
    invitation_task_threshold=2,     # ADR-0022: completed tasks for that faction
    # starting_faction_slug — OMIT IT. Characters are born unaffiliated
    # (ADR-0019/ADR-0030) and the EraConfig default already says `na`. #1559
    # made this an era override; ADR-0087 pinned it back, so naming anything
    # other than `na` now raises when your era file is imported. The field
    # survives so that failure can explain itself.

    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,          # Almost always False
    # reset_faction_slug — OMIT IT, same as starting_faction_slug above and for
    # the same reason (#1580 opened it, ADR-0087 pinned it). A rollover returns
    # the outgoing era's players to `na`; whether it returns them at all is
    # still yours, via `reset_faction` just above.

    factions=ERA_N_FACTIONS,
    tasks=ERA_N_TASKS,
    level_profiles=ERA_N_LEVEL_PROFILES,

    # The SECOND home a faction perk can have (#1871) — a frozenset of slugs
    # rather than a FactionConfig field. Both default to empty; name a faction
    # here only if your era grants it. A faction carrying
    # `inherits_faction_perks` is added automatically whenever anyone else is
    # listed, so do not list it by hand.
    #
    # allow_praxis_on_retired_task_factions=frozenset({"your_faction"}),
    # allow_praxis_on_pending_task_factions=frozenset(),
)
