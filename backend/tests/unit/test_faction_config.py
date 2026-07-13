"""Unit tests for faction configuration values and modifier semantics."""

from game_config import ERA_1


def test_wow_solo_modifiers():
    config = ERA_1.factions["wow"]
    assert config.own_task_modifier == 1.1
    assert config.other_task_modifier == 1.0


def test_wow_collab_modifiers():
    config = ERA_1.factions["wow"]
    assert config.collab_own_modifier == 1.1
    assert config.collab_other_modifier == 1.0


def test_snide_duel_modifiers():
    config = ERA_1.factions["snide"]
    assert config.duel_win_modifier == 2.0   # Snide high-risk bonus
    assert config.duel_loss_modifier == 0.0  # Snide high-risk penalty


def test_snide_no_cross_faction_penalty():
    # Flattened to 1.0 for Era 1 (issue #452).
    config = ERA_1.factions["snide"]
    assert config.other_task_modifier == 1.0


def test_ua_masters_cut_from_era_1():
    # ua_masters deferred to Era 2 per ADR-0004 — must not be in the Era 1 roster.
    assert "ua_masters" not in ERA_1.factions


def test_albescent_full_access():
    config = ERA_1.factions["albescent"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0
    assert config.can_always_rejoin is True


def test_ua_baseline():
    config = ERA_1.factions["ua"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0


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
    # Era-1 decision (issue #452): no cross-faction penalty for any faction.
    for slug, config in ERA_1.factions.items():
        assert config.other_task_modifier == 1.0, slug
        assert config.collab_other_modifier == 1.0, slug


def test_singularity_defaults():
    config = ERA_1.factions["singularity"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0


def test_na_sentinel():
    config = ERA_1.factions["na"]
    assert config.can_always_rejoin is False


def test_can_always_rejoin_only_albescent():
    rejoinable = [
        slug for slug, config in ERA_1.factions.items()
        if config.can_always_rejoin
    ]
    assert set(rejoinable) == {"albescent"}
