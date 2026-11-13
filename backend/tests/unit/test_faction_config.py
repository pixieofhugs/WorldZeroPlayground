"""Faction config values. These are advertised to players (#1874).

Each perk is quoted in ``frontend/src/locales/en/factions.json``
(``{F}.invitation.perks[1]``, ``albescent.letter.perks.duties``,
``descriptions.{F}``). If a test fails, move the copy in the same change.
"""

from dataclasses import replace

from game_config import _ANY_PERK_FIELDS, ERA_1
from services.signup_eligibility import multi_membership_faction_slugs

# Albescent inherits every perk (#1871): "only X has P" means only X declares P.
INHERITORS = {
    slug for slug, config in ERA_1.factions.items() if config.inherits_faction_perks
}


def test_wow_modifiers_are_flat():
    # #811: WOW's perk is the level jump, not a multiplier.
    config = ERA_1.factions["wow"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_wow_level_jump_reach():
    # #811: once per level, one task exactly one level up.
    assert ERA_1.factions["wow"].level_jump_reach == 1


def test_coven_collab_own_bonus():
    config = ERA_1.factions["coven"]
    assert config.collab_own_modifier == 1.1
    assert config.own_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_coven_is_the_only_faction_with_a_modifier():
    # #811; duel modifiers are a separate axis.
    with_modifiers = {
        slug for slug, config in ERA_1.factions.items()
        if 1.0 != config.own_task_modifier
        or 1.0 != config.other_task_modifier
        or 1.0 != config.collab_own_modifier
        or 1.0 != config.collab_other_modifier
    }
    assert with_modifiers - INHERITORS == {"coven"}


def test_level_jump_is_wow_only():
    granted = {
        slug for slug, config in ERA_1.factions.items()
        if config.level_jump_reach > 0
    }
    assert granted - INHERITORS == {"wow"}


def test_double_dipper_is_everymen_only():
    # #1359: re-claim a task while a claim on it is still active.
    granted = {
        slug for slug, config in ERA_1.factions.items()
        if config.can_hold_multiple_memberships
    }
    assert granted - INHERITORS == {"everymen"}


def test_multi_membership_slugs_follows_the_config_not_the_slug():
    assert set(multi_membership_faction_slugs(ERA_1)) - INHERITORS == {"everymen"}

    moved = replace(
        ERA_1,
        factions={
            **ERA_1.factions,
            "everymen": replace(
                ERA_1.factions["everymen"], can_hold_multiple_memberships=False
            ),
            "snide": replace(
                ERA_1.factions["snide"], can_hold_multiple_memberships=True
            ),
        },
    )
    assert set(multi_membership_faction_slugs(moved)) - INHERITORS == {"snide"}
    # the inheritor re-derived it (#1871)
    assert set(multi_membership_faction_slugs(moved)) >= INHERITORS


def test_snide_duel_modifiers():
    config = ERA_1.factions["snide"]
    assert config.duel_win_modifier == 2.0
    assert config.duel_loss_modifier == 0.0


def test_snide_no_cross_faction_penalty():
    # #452
    config = ERA_1.factions["snide"]
    assert config.other_task_modifier == 1.0


def test_ua_masters_cut_from_era_1():
    # ADR-0004
    assert "ua_masters" not in ERA_1.factions


def test_albescent_full_access():
    """Union itself: ``test_faction_perk_inheritance.py`` (#1871)."""
    config = ERA_1.factions["albescent"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == ERA_1.factions["coven"].collab_own_modifier
    assert config.collab_other_modifier == 1.0
    assert config.can_always_rejoin is True


def test_ua_baseline():
    config = ERA_1.factions["ua"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0


def test_ua_habit_bonus_numbers_are_pinned():
    """The copy says "+5 points" and "within seven days" (#1874); other tests
    read config, so only these literals break on a re-tune."""
    assert ERA_1.factions["ua"].habit_bonus_points == 5
    assert ERA_1.habit_window_days == 7


def test_ephemerists_modifiers():
    config = ERA_1.factions["ephemerists"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_everymen_modifiers():
    config = ERA_1.factions["everymen"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_all_factions_flat_cross_faction_modifiers():
    # #452
    for slug, config in ERA_1.factions.items():
        assert config.other_task_modifier == 1.0, slug
        assert config.collab_other_modifier == 1.0, slug


def test_singularity_holds_exactly_one_perk_and_it_is_the_array():
    """The array grants information only (#1869); the joke is that
    Singularity's own row is blank, so the emptiness stays pinned."""
    config = ERA_1.factions["singularity"]

    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0
    assert config.duel_win_modifier == 1.5
    assert config.duel_loss_modifier == 0.5

    assert config.level_jump_reach == 0
    assert config.habit_bonus_points == 0

    # from the registry, so a later perk field is covered automatically
    assert config.reads_the_array is True
    for name in _ANY_PERK_FIELDS:
        if name == "reads_the_array":
            continue
        assert getattr(config, name) is False, name

    # Task Vision is an EraConfig frozenset (#1871)
    assert "singularity" not in ERA_1.allow_praxis_on_retired_task_factions


def test_the_array_is_singularity_and_its_inheritor_only():
    """#1869; Albescent via the derived inheritor set (#1871)."""
    readers = {slug for slug, config in ERA_1.factions.items() if config.reads_the_array}
    assert readers == {"singularity"} | INHERITORS


def test_na_sentinel():
    config = ERA_1.factions["na"]
    assert config.can_always_rejoin is False


def test_can_always_rejoin_only_albescent():
    rejoinable = [
        slug for slug, config in ERA_1.factions.items()
        if config.can_always_rejoin
    ]
    assert set(rejoinable) == {"albescent"}
