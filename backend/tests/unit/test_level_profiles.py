import pytest

from game_config import ERA_1, LevelUnlockKind, _new_live_era
from services.era import apply_dial_sides


def _era_on(side: str):
    """A copy of ERA_1 with every dial on ``side``; CURRENT_ERA is not touched."""
    era = _new_live_era(ERA_1)
    apply_dial_sides(era, {key: side for key in era.dials})
    return era

GATE_ATTRS = [
    "collaboration_level_required",
    "vote_level_required",
    "duel_level_required",
    "comment_level_required",
    "level_to_see_retired_tasks",
    "level_to_propose_task",
    "level_to_see_pending_tasks",
    "flag_level_required",
    "second_character_level_required",
    "level_to_propose_metatask",
    "level_to_see_metatasks",
    "metatask_apply_level",
    "metatasks_per_praxis_max_level",
    "secret_faction_join_level",
    "secret_faction_glimpse_level",
]


def _ability_keys(level: int, era=ERA_1) -> set[str]:
    return {
        unlock.key
        for unlock in era.level_profiles[level].unlocks
        if unlock.kind == LevelUnlockKind.ability
    }


def test_level_profiles_index_aligned_with_thresholds():
    assert len(ERA_1.level_profiles) == len(ERA_1.level_thresholds)


def test_level_0_is_a_placeholder_never_shown():
    assert ERA_1.level_profiles[0].unlocks == ()


@pytest.mark.parametrize("level", range(1, len(ERA_1.level_thresholds)))
def test_every_real_level_has_a_rank_and_an_unlock(level):
    profile = ERA_1.level_profiles[level]
    assert profile.rank_key
    assert len(profile.unlocks) >= 1


@pytest.mark.parametrize("gate_attr", GATE_ATTRS)
def test_grounded_ability_sits_at_its_gate_constants_level(gate_attr):
    gate_level = getattr(ERA_1, gate_attr)
    assert _ability_keys(gate_level), f"no ability unlock at level {gate_level} for {gate_attr}"


@pytest.mark.parametrize("side", ["small", "full"])
@pytest.mark.parametrize(
    ("gate_attr", "ability_key"),
    [
        ("comment_level_required", "comment"),
        ("duel_level_required", "duels"),
        ("flag_level_required", "flag_praxis"),
    ],
)
def test_dial_moved_gate_and_ladder_agree_on_the_live_era(side, gate_attr, ability_key):
    era = _era_on(side)
    rungs = [
        level
        for level in range(len(era.level_profiles))
        if ability_key in _ability_keys(level, era)
    ]
    assert rungs == [getattr(era, gate_attr)]


def test_overlay_leaves_era_1_ladder_alone():
    _era_on("small")
    assert "comment" in _ability_keys(2)


def test_level_5_unlocks_the_metatask_abilities():
    assert _ability_keys(5) == {"see_metatasks", "propose_metatask", "apply_metatasks"}


def test_faction_choice_is_not_a_grounded_ability_anywhere():
    """Faction choice is gated by invitation (ADR-0022), not level."""
    for profile in ERA_1.level_profiles:
        for unlock in profile.unlocks:
            if unlock.kind == LevelUnlockKind.ability:
                assert "choose_faction" not in unlock.key
                assert "pick_faction" not in unlock.key


def test_task_signup_is_not_a_grounded_ability_anywhere():
    """#2224: the bar is per-task (``meets_task_level``); level 1 is reached *by*
    signing up, so announcing it would name an ability just used."""
    for profile in ERA_1.level_profiles:
        for unlock in profile.unlocks:
            if unlock.kind == LevelUnlockKind.ability:
                assert "sign_up" not in unlock.key
                assert "signup" not in unlock.key
