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
        # UA rewards showing up (#1617): a flat +5 on any praxis sealed within
        # the era's habit window of another of the member's own. Its modifiers
        # all sit at the Era 1 baseline, so this is UA's only perk.
        habit_bonus_points=5,
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
        takes_duel_ties=True,         # takes the tie, as SOLE holder (#2664)
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
        reads_the_array=True,   # the array: reads this config in the console (#1869)
    ),
    # Albescent holds every OTHER faction's perk (#1871). The values below are
    # its FLOOR, not its final deal: `inherits_faction_perks` makes
    # `EraConfig.__post_init__` widen each axis to the best any faction in this
    # era holds, so UA's habit bonus, WOW's level jump, Coven's collab bonus,
    # Everymen's Double Dipper, Snide's duel gamble and Ephemerists' Task Vision
    # all arrive here without being pasted — and so does the perk of a faction
    # added to this dict tomorrow. Read `ERA_1.factions["albescent"]`, never
    # this literal.
    #
    # Two perks are Albescent's OWN and so are declared, not inherited: the
    # rejoin, and the metatask level bypass. Snide's duel deal comes across
    # WHOLE — 2.0 win AND 0.0 loss, not the softer 0.5 a per-axis maximum would
    # keep. Owner ruling: "they have so many other advantages, they can deal
    # with the full snide deal."
    "albescent": FactionConfig(
        slug="albescent",
        can_always_rejoin=True,       # can always be rejoined after defecting
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        can_apply_metatask_at_any_level=True,   # may apply metatasks at any level
        inherits_faction_perks=True,            # every other faction's perk, too
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
# NOTE: an ability rung must name a gate that exists. Two have been dropped
# rather than reworded, because the alternative is announcing a door that was
# never locked:
#
#   * issue #287's table paired level 3 with "choose a faction", but
#     `services/faction_service.py::defect_to_faction` has no level check at
#     all — faction choice is gated purely by invitation (ADR-0022).
#   * issue #2224 dropped "sign up for a task" from level 1. Sign-up has no
#     era-wide level gate; the bar is per-task (`task.level_required`, read via
#     `services/praxis.py::meets_task_level`). A character reaches level 1 *by*
#     signing up for the level-0 onboarding task and posting a praxis for it,
#     so the rung announced an ability the player had just finished using.
#
# `tests/unit/test_level_profiles.py` holds a tripwire for each. Before adding
# an ability rung, find the `era.*` constant or the service-level check it
# names; if there isn't one, it belongs in the sense list or nowhere.
#
# 2026-08-27 (#2770): level 6 gained its FIRST hard gate — `albescent_glimpse`,
# grounded in `albescent_glimpse_level` below. The tripwire that asserted level 6
# was whimsy-only (`test_level_6_has_no_hard_gate_sense_only`) was deleted with
# this change; it guarded a fact that stopped being true.

# ADR-0031: profiles carry copy KEYS, never prose. The English words live in
# frontend/src/locales/en/progression.json (ranks.<rank_key>,
# unlocks.<key>.name/.desc). rank_key="" at index 0 is the start state, never
# shown. Ability keys stay gate-aligned; sense keys are short semantic slugs.
ERA_1_LEVEL_PROFILES = (
    LevelProfile(rank_key="", unlocks=()),  # index 0 = start state, never shown
    LevelProfile(
        rank_key="trailhead",
        unlocks=(
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
    # Admin-only window on a fresh proposal, in hours (#1695).
    pending_task_admin_review_hours=48,
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
    # The floor on PERCEIVING the order, against the ceiling on joining it
    # above (#2770). The `albescent_glimpse` rung at level 6 in
    # ERA_1_LEVEL_PROFILES is this constant's announcement — move one and move
    # the other, which is what `test_grounded_ability_sits_at_its_gate_constants_level`
    # holds you to.
    albescent_glimpse_level=6,
    invitation_point_threshold=50,   # ADR-0022: 50 points from a faction's tasks
    invitation_task_threshold=2,     # ADR-0022: 2 completed tasks for that faction
    # "Habitually" means weekly in Era 1 (#1617). Stated here even though it
    # matches the EraConfig default: the cadence is the era's rule, and a later
    # era that disagrees should be able to see what it is disagreeing with.
    habit_window_days=7,
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
    tasks=ERA_1_TASKS,
    level_profiles=ERA_1_LEVEL_PROFILES,
    # Ephemerists' Task Vision perk: they may create praxes on retired tasks.
    #
    # THIS IS A PERK, AND IT DOES NOT LIVE ON FactionConfig (#1871). Perks have
    # two homes — the dataclass fields above and this frozenset — and an audit
    # that reads only the first half misses it, which is exactly how Albescent
    # came to be missing Task Vision. Albescent is NOT listed here by hand: it
    # carries `inherits_faction_perks`, so `EraConfig.__post_init__` adds it
    # whenever anyone else is in this set.
    allow_praxis_on_retired_task_factions=frozenset({"ephemerists"}),
    # Collab invites reach across levels and factions on purpose (#1511) — a
    # level-1 character of any faction may be invited onto a level-6 task and
    # submit. The task bank is the one gate the invite does not lift, and it is
    # charged on accept.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,
)
