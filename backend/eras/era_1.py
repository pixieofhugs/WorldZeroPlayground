"""Era 1 — the founding era of World Zero."""
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

# Cross-faction modifiers are flattened to 1.0 in Era 1 (#452).
ERA_1_FACTIONS = {
    "ua": FactionConfig(
        slug="ua",
        # Ordinary invite-joinable faction (ADR-0030).
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        # UA's only perk (#1617).
        habit_bonus_points=5,
    ),
    "snide": FactionConfig(
        slug="snide",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=2.0,
        duel_loss_modifier=0.0,
        takes_duel_ties=True,         # as SOLE holder (#2664)
    ),
    # WOW's only perk is the level jump (#811).
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
    # Coven is Era 1's only faction with a non-1.0 modifier (#811).
    "coven": FactionConfig(
        slug="coven",
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.1,
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
        reads_the_array=True,   # #1869
    ),
    # Values below are Albescent's FLOOR: `inherits_faction_perks` widens them
    # (#1871), so read `ERA_1.factions["albescent"]`, never this literal. Rejoin
    # and the metatask bypass are its own. Snide's duel deal comes WHOLE (2.0 win
    # AND 0.0 loss) — owner ruling.
    "albescent": FactionConfig(
        slug="albescent",
        can_always_rejoin=True,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        can_apply_metatask_at_any_level=True,
        inherits_faction_perks=True,
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

# Must stay EMPTY: the board is curated in the admin UI, and
# `seed.py::sync_era_tasks` re-adds config tasks on every deploy, undoing
# deletes. The level-0 onboarding task is seeded separately (#511).
ERA_1_TASKS: tuple[TaskDef, ...] = ()



# =============================================================================
# LEVEL PROFILES
# =============================================================================
# Level-up pop-up ("Field Stamp", #244/#287), indexed like level_thresholds.
# Keys only (ADR-0031); wording in progression.json.
#
# An ability rung must name a real gate (an `era.*` constant or service check);
# otherwise it's a sense or nothing. Faction choice (invitation-gated, ADR-0022)
# and task sign-up (per-task level) have no level gate, so neither is a rung.
# `tests/unit/test_level_profiles.py` holds tripwires.
ERA_1_LEVEL_PROFILES = (
    LevelProfile(rank_key="", unlocks=()),  # index 0 = start state, never shown
    LevelProfile(
        rank_key="trailhead",
        unlocks=(
            LevelUnlock(LevelUnlockKind.ability, "start_collaboration"),
            LevelUnlock(LevelUnlockKind.ability, "vote"),
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
            LevelUnlock(LevelUnlockKind.ability, "albescent_glimpse"),
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
    # Matched against Era.config_key in the DB: rename the era, never the key.
    config_key="era_1",
    max_task_signups=20,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    # See SPEC-game-rules.md "Level privileges"
    level_to_propose_task=3,
    level_to_propose_metatask=5,
    level_to_see_metatasks=5,
    level_to_see_retired_tasks=2,
    level_to_see_pending_tasks=3,
    # Hours (#1695).
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
    albescent_level_required=8,
    # Moves together with the level-6 `albescent_glimpse` rung (#2770).
    albescent_glimpse_level=6,
    invitation_point_threshold=50,   # ADR-0022
    invitation_task_threshold=2,
    # Stated though it matches the default: the cadence is the era's (#1617).
    habit_window_days=7,
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
    tasks=ERA_1_TASKS,
    level_profiles=ERA_1_LEVEL_PROFILES,
    # Ephemerists' Task Vision: a perk outside FactionConfig (#1871). Albescent
    # is added by inheritance; don't list it.
    allow_praxis_on_retired_task_factions=frozenset({"ephemerists"}),
    # Invites reach across levels and factions on purpose (#1511).
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,
)
