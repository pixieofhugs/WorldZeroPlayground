import pytest

from game_config import ERA_1, LevelUnlockKind

GATE_ATTRS = [
    "collaboration_level_required",
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
    "albescent_level_required",
    "albescent_glimpse_level",
]


def _ability_keys(level: int) -> set[str]:
    return {
        unlock.key
        for unlock in ERA_1.level_profiles[level].unlocks
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
    """Each capability gate must have a matching ability unlock at that exact level."""
    gate_level = getattr(ERA_1, gate_attr)
    assert _ability_keys(gate_level), f"no ability unlock at level {gate_level} for {gate_attr}"


def test_level_5_unlocks_the_metatask_abilities():
    """The three metatask gates (see / propose / apply) all land at level 5."""
    assert _ability_keys(5) == {"see_metatasks", "propose_metatask", "apply_metatasks"}


def test_faction_choice_is_not_a_grounded_ability_anywhere():
    """services/faction_service.py has no level check on faction choice — it is
    gated by invitation (ADR-0022), so no level may cite it as a grounded gate."""
    for profile in ERA_1.level_profiles:
        for unlock in profile.unlocks:
            if unlock.kind == LevelUnlockKind.ability:
                assert "choose_faction" not in unlock.key
                assert "pick_faction" not in unlock.key


def test_task_signup_is_not_a_grounded_ability_anywhere():
    """Sign-up has no era-wide level gate, so no level may announce it (#2224).

    The bar is per-task — ``task.level_required``, read through
    ``services/praxis.py::meets_task_level``. There is no
    ``signup_level_required`` in GATE_ATTRS above because no such constant
    exists. A character reaches level 1 *by* signing up for the level-0
    onboarding task and posting a praxis for it, so a level-1 "sign up for a
    task" unlock announces an ability the player has just finished using. Same
    call as ``choose_faction`` above (#287).
    """
    for profile in ERA_1.level_profiles:
        for unlock in profile.unlocks:
            if unlock.kind == LevelUnlockKind.ability:
                assert "sign_up" not in unlock.key
                assert "signup" not in unlock.key
