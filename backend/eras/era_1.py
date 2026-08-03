"""
Era 1 — the founding era of World Zero.

This file is the complete, self-contained configuration for Era 1.
Everything needed to start this era lives here: factions, tasks, taunts, and rules.
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

# Faction names/descriptions are NOT config-owned (ADR-0038): the English words
# live in frontend/src/locales/en/factions.json (names.<slug>, descriptions.<slug>).
#
# Cross-faction modifiers (other_task_modifier / collab_other_modifier) are
# deliberately flattened to 1.0 for Era 1 — no faction is penalized for working
# a task outside its own faction (issue #452). Re-tune in a future era if desired.
ERA_1_FACTIONS = {
    "ua": FactionConfig(
        slug="ua",
        # UA is an ordinary, invite-joinable faction (ADR-0030) — no starter privilege.
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    # ua_masters cut from Era 1 (deferred to Era 2 per ADR-0004); its L4–L7
    # tasks below are reassigned to ua.
    "snide": FactionConfig(
        slug="snide",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=2.0,        # duel win: 200% of base (Snide high-risk bonus)
        duel_loss_modifier=0.0,       # duel loss: 0% of base (Snide high-risk penalty)
    ),
    # Warriors of Whimsy (#811). Its perk is MECHANICAL, not multiplicative: the
    # level jump below is WOW's only perk, so every modifier drops to the Era 1
    # baseline. The +10% own/collab pair it used to carry moved to Cozy Coven.
    "wow": FactionConfig(
        slug="wow",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        level_jump_reach=1,           # once per level, claim ONE task 1 level up
    ),
    # Cozy Coven (#784) — the eighth faction. It inherited Warriors of Whimsy's
    # lo-fi pink `.exe` aesthetic in #784; #811 hands it WOW's collaboration
    # bonus too, so Coven is now the only faction in Era 1 carrying a non-1.0
    # modifier.
    "coven": FactionConfig(
        slug="coven",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.1,      # +10% on collab own-faction
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "ephemerists": FactionConfig(
        slug="ephemerists",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    # Everymen's perk is "Double Dipper": a task may be claimed again while a
    # claim on it is still active. Stated here as a FactionConfig field so the
    # sign-up predicate and the browse exclusion both inherit it (#1359).
    "everymen": FactionConfig(
        slug="everymen",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        can_hold_multiple_memberships=True,   # Double Dipper
    ),
    "singularity": FactionConfig(
        slug="singularity",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "albescent": FactionConfig(
        slug="albescent",
        can_always_rejoin=True,       # can always be rejoined after defecting
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "na": FactionConfig(
        slug="na",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
}


# =============================================================================
# TASKS
# =============================================================================

# Era 1 ships with NO era-config tasks. The real board is authored in the admin
# UI / task importer and lives only in the database, so the config must stay
# empty: `seed.py::sync_era_tasks` re-adds every config task that is missing
# from the DB, and `start.sh` runs `python seed.py --env prod --yes` on EVERY
# deploy. A task listed here would therefore reappear on the next deploy after
# an admin deleted it — a config list and a hand-curated board cannot both own
# the same table.
#
# The one exception is not here either: the game-wide level-0 onboarding task is
# seeded by `seed.py::ensure_onboarding_task` (#511), era-independent by design.
#
# `tasks` stays a real EraConfig field — a future era may well ship a fixed,
# config-owned roster. This era does not.
ERA_1_TASKS: tuple[TaskDef, ...] = ()



# =============================================================================
# LEVEL PROFILES
# =============================================================================
# Rank + unlocks announced by the level-up pop-up ("Field Stamp", #244/#287).
# Indexed by level, same convention as level_thresholds. Grounded ability
# entries are checked against the real gate constants below them; sense
# entries are pure whimsy. Bot-drafted copy — Molly may revise later
# (config-only, no code change).
#
# NOTE: issue #287's table paired level 3 with "choose a faction", but
# `services/faction_service.py::defect_to_faction` has no level check at all —
# faction choice is gated purely by invitation (ADR-0022), not by level. Dropped
# from the grounded abilities below rather than citing a gate that isn't
# actually enforced.

# ADR-0031: profiles carry copy KEYS, never prose. The English words live in
# frontend/src/locales/en/progression.json (ranks.<rank_key>,
# unlocks.<key>.name/.desc). rank_key="" at index 0 is the start state, never
# shown. Ability keys stay gate-aligned; sense keys are short semantic slugs.
ERA_1_LEVEL_PROFILES = (
    LevelProfile(rank_key="", unlocks=()),  # index 0 = start state, never shown
    LevelProfile(
        rank_key="trailhead",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "sign_up_task"),
            LevelUnlock(LevelUnlockKind.ability, "start_collaboration"),
            LevelUnlock(LevelUnlockKind.sense, "worn_paths"),
        ),
    ),
    LevelProfile(
        rank_key="ranger",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "duels"),
            LevelUnlock(LevelUnlockKind.ability, "comment"),
            LevelUnlock(LevelUnlockKind.ability, "retired_tasks"),
            LevelUnlock(LevelUnlockKind.sense, "weather_early"),
        ),
    ),
    LevelProfile(
        rank_key="surveyor",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "propose_task"),
            LevelUnlock(LevelUnlockKind.ability, "pending_tasks"),
            LevelUnlock(LevelUnlockKind.sense, "shortcut_sense"),
        ),
    ),
    LevelProfile(
        rank_key="warden",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "flag_praxis"),
            LevelUnlock(LevelUnlockKind.ability, "second_character"),
            LevelUnlock(LevelUnlockKind.sense, "lie_pitch"),
        ),
    ),
    LevelProfile(
        rank_key="voyager",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "see_metatasks"),
            LevelUnlock(LevelUnlockKind.ability, "propose_metatask"),
            LevelUnlock(LevelUnlockKind.ability, "apply_metatasks"),
            LevelUnlock(LevelUnlockKind.sense, "distance_taste"),
        ),
    ),
    LevelProfile(
        rank_key="chronicler",
        unlocks=(
            LevelUnlock(LevelUnlockKind.sense, "place_memory"),
        ),
    ),
    LevelProfile(
        rank_key="luminary",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "multiple_metatasks"),
            LevelUnlock(LevelUnlockKind.sense, "three_plans"),
        ),
    ),
    LevelProfile(
        rank_key="paragon",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "join_albescent"),
            LevelUnlock(LevelUnlockKind.sense, "underline_foresight"),
        ),
    ),
)


# =============================================================================
# ERA DEFINITION
# =============================================================================

ERA_1 = EraConfig(
    name="Renaissance",
    # Display prose above, identity below: `config_key` is matched against
    # Era.config_key in the database (seed.py, routers/admin.py on rollover), so
    # renaming it would orphan the existing row. Rename the era, never the key.
    config_key="era_1",
    max_task_signups=20,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    # Capability level gates (see SPEC-game-rules.md "Level privileges")
    level_to_propose_task=3,
    level_to_propose_metatask=5,
    level_to_see_metatasks=5,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,
    # Praxis / moderation / metatask gates
    duel_level_required=2,
    collaboration_level_required=1,
    collab_auto_submit_days=10,
    metatask_apply_level=5,
    flag_level_required=4,
    # Metatask-per-praxis cap: 1 until L7, then up to 3.
    metatasks_per_praxis_base=1,
    metatasks_per_praxis_max=3,
    metatasks_per_praxis_max_level=7,
    # Comment gates (ADR-0006) — social layer opens at L2 in the vault
    comment_level_required=2,
    comment_flag_review_threshold=1,
    # Character account / faction gates
    second_character_level_required=4,
    albescent_level_required=8,
    invitation_point_threshold=50,   # ADR-0022: 50 points from a faction's tasks
    invitation_task_threshold=2,     # ADR-0022: 2 completed tasks for that faction
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
    tasks=ERA_1_TASKS,
    level_profiles=ERA_1_LEVEL_PROFILES,
    # Ephemerists' Task Vision perk: they may create praxes on retired tasks.
    allow_praxis_on_retired_task_factions=frozenset({"ephemerists"}),
    # Collab invites reach across levels and factions on purpose (#1511) — a
    # level-1 character of any faction may be invited onto a level-6 task and
    # submit. The task bank is the one gate the invite does not lift, and it is
    # charged on accept.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,
)
