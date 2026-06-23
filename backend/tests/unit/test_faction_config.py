"""Unit tests for faction configuration values and modifier semantics."""

from game_config import ERA_1


def test_gestalt_solo_modifiers():
    config = ERA_1.factions["wow"]
    assert config.own_task_modifier == 1.1
    assert config.other_task_modifier == 0.7


def test_gestalt_collab_modifiers():
    config = ERA_1.factions["wow"]
    assert config.collab_own_modifier == 1.1
    assert config.collab_other_modifier == 0.9


def test_snide_duel_modifiers():
    config = ERA_1.factions["snide"]
    assert config.duel_win_modifier == 2.0   # Snide high-risk bonus
    assert config.duel_loss_modifier == 0.0  # Snide high-risk penalty


def test_snide_other_faction_penalty():
    config = ERA_1.factions["snide"]
    assert config.other_task_modifier == 0.7


def test_ua_masters_uniform_reduced():
    config = ERA_1.factions["ua_masters"]
    assert config.own_task_modifier == 0.8
    assert config.other_task_modifier == 0.8
    assert config.collab_own_modifier == 0.8
    assert config.collab_other_modifier == 0.8
    assert config.duel_win_modifier == 0.8
    assert config.duel_loss_modifier == 0.8


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
    assert config.is_selectable is False


def test_ephemerists_penalties():
    config = ERA_1.factions["ephemerists"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 0.7
    assert config.collab_other_modifier == 0.7


def test_everymen_penalties():
    config = ERA_1.factions["everymen"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 0.7
    assert config.collab_other_modifier == 0.7


def test_singularity_defaults():
    config = ERA_1.factions["singularity"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.is_selectable is True


def test_na_sentinel():
    config = ERA_1.factions["na"]
    assert config.is_selectable is False
    assert config.can_always_rejoin is False


def test_selectable_factions_count():
    selectable = [
        slug for slug, config in ERA_1.factions.items()
        if config.is_selectable
    ]
    # ua_masters, snide, wow, ephemerists, everymen, singularity = 6
    assert len(selectable) == 6


def test_can_always_rejoin_only_two():
    rejoinable = [
        slug for slug, config in ERA_1.factions.items()
        if config.can_always_rejoin
    ]
    assert set(rejoinable) == {"ua_masters", "albescent"}
