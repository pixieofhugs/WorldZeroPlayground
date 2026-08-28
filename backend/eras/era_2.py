"""
Era 2 — Metamorphosis.

Authored, not activated: ``CURRENT_ERA`` still resolves to Era 1. This file
exists so that everything which varies by era has a second ruleset to be tested
against, and so the rollover has somewhere to go when it happens.

The one rule Metamorphosis actually changes is the own/other split — 1.2 / 0.8
on solo and duel — plus a smaller roster. Everything else is Era 1's, unchanged.
"""
from eras.era_1 import ERA_1_LEVEL_PROFILES
from game_config import EraConfig, FactionConfig, TaskDef


# =============================================================================
# FACTIONS
# =============================================================================

# Five factions, and **no UA** — deliberate, not an oversight. Existing UA
# characters are not stranded: reset_faction=True below sweeps everyone to
# reset_faction_slug at rollover, which this era leaves at its `na` default.
# (`ua` is not a structurally required slug. Two are, per ADR-0087: `na`, the
# FK target for the born-unaffiliated state and for cross-faction tasks, and
# `albescent`, the endgame faction — both present below. See faction_slugs.py.)
#
# Faction names/descriptions are NOT config-owned (ADR-0038): the English words
# live in frontend/src/locales/en/factions.json (names.<slug>, descriptions.<slug>).
#
# THE POINT OF THIS ERA — the own/other split, applied to all five factions:
#
#   own_task_modifier    = 1.2   solo/duel task from your own faction
#   other_task_modifier  = 0.8   solo/duel task from another faction
#   collab_own_modifier  = 1.0   \  collaborations deliberately stay flat
#   collab_other_modifier= 1.0   /
#
# The 120/80 rule is **solo and duel only** (owner ruling). A collaboration on
# your own faction's task must not be worth less than doing it alone, which is
# what a 1.2 solo beside a 1.0 collab would mean if the collab pair were lifted
# too — and a cross-faction collab is the behaviour this game wants to
# encourage, so it is not penalised either. The asymmetry between the two pairs
# is intentional: this is exactly the shape a later "make these consistent"
# cleanup would flatten. Do not.
#
# Each faction's Era 1 ability is carried across unchanged: Snide's duel
# gamble, WOW's level jump, Everymen's Double Dipper, Albescent's rejoin.
# Note that Coven's +10% collab bonus has no counterpart here — Coven is not in
# Metamorphosis, so this is the first era with no non-1.0 collab modifier at all.
ERA_2_FACTIONS = {
    "snide": FactionConfig(
        slug="snide",
        can_always_rejoin=False,
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=2.0,        # duel win: 200% of base (Snide high-risk bonus)
        duel_loss_modifier=0.0,       # duel loss: 0% of base (Snide high-risk penalty)
        takes_duel_ties=True,         # takes the tie, as SOLE holder (#2664)
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
    # Albescent's charter carries across too (#1871): the values below are its
    # floor and `EraConfig.__post_init__` widens them to the best perk any
    # faction in THIS era holds — Snide's duel gamble (whole: 2.0 / 0.0), WOW's
    # level jump, Everymen's Double Dipper. There are no Ephemerists here, so
    # nobody holds Task Vision and Albescent does not conjure it: the era's
    # `allow_praxis_on_retired_task_factions` stays empty.
    "albescent": FactionConfig(
        slug="albescent",
        can_always_rejoin=True,       # can always be rejoined after defecting
        own_task_modifier=1.2,
        other_task_modifier=0.8,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
        # Stated, not inherited: this is Albescent's own perk. Before #1871 it
        # was a slug branch in services/praxis_metatask.py, which is how Era 2
        # came to hold it without ever saying so.
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

# Empty, for the same reason Era 1's is (era_1.py:140-152): `seed.py::sync_era_tasks`
# re-adds every config task missing from the DB and `start.sh` seeds on EVERY
# deploy, so a task listed here would resurrect itself the next deploy after an
# admin deleted it. The board is authored in the admin UI; a config list and a
# hand-curated board cannot both own the same table.
ERA_2_TASKS: tuple[TaskDef, ...] = ()


# =============================================================================
# LEVEL PROFILES
# =============================================================================

# Shared with Era 1 rather than copied. Level profiles are the *announcement* of
# the capability gates (ADR-0031: copy keys, resolved by the frontend), and
# every gate below is Era 1's value unchanged — so a divergent tuple here could
# only ever be a typo. The day Metamorphosis re-tunes a gate, fork this into its
# own ERA_2_LEVEL_PROFILES rather than editing Era 1's.
ERA_2_LEVEL_PROFILES = ERA_1_LEVEL_PROFILES


# =============================================================================
# ERA DEFINITION
# =============================================================================

ERA_2 = EraConfig(
    name="Metamorphosis",
    config_key="era_2",
    # Everything from here down is Era 1's value, deliberately unchanged: the
    # only rule Metamorphosis re-tunes is the own/other split above.
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
    # Comment gates (ADR-0006)
    comment_level_required=2,
    comment_flag_review_threshold=1,
    # Character account / faction gates
    second_character_level_required=4,
    # Inherited from Era 1 on purpose, and it means something different here.
    # The Albescent unlock has two halves (services/character.py): this level,
    # AND a submitted praxis covering every non-sentinel faction in the era.
    # That is seven factions in Era 1 but only THREE here — `na` and `albescent`
    # are the sentinels — so the coverage half becomes dramatically cheaper
    # while the level half does not. Knowingly accepted; not a bug to file.
    albescent_level_required=8,
    invitation_point_threshold=50,   # ADR-0022: 50 points from a faction's tasks
    invitation_task_threshold=2,     # ADR-0022: 2 completed tasks for that faction
    reset_score=True,
    reset_level=True,
    reset_faction=True,              # sweeps ex-UA characters to `na` at rollover
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_2_FACTIONS,
    tasks=ERA_2_TASKS,
    level_profiles=ERA_2_LEVEL_PROFILES,
    # No Ephemerists in this era, so nobody carries the Task Vision perk:
    # allow_praxis_on_retired_task_factions stays empty.
    # Collab invites reach across levels and factions (#1511), as in Era 1.
    collab_invite_bypasses_level=True,
    collab_invite_bypasses_faction=True,
    collab_invite_bypasses_task_bank=False,
)
