from dataclasses import dataclass

from game_config import ERA_1
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_DUEL,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_level,
    compute_praxis_score,
    compute_vote_budget,
    compute_votes_available,
)


@dataclass
class _StatsStub:
    """Minimal CharacterStats-shaped stub for scoring unit tests."""
    score: int
    votes_spent_this_era: int


def test_vote_budget_base():
    assert compute_vote_budget(score=0, era=ERA_1) == ERA_1.vote_budget_base


def test_vote_budget_with_score():
    score = 50
    expected = ERA_1.vote_budget_base + int(ERA_1.vote_budget_multiplier * score)
    assert compute_vote_budget(score=score, era=ERA_1) == expected


# ---------------------------------------------------------------------------
# compute_votes_available — on-read recomputation (R.5)
# ---------------------------------------------------------------------------


def test_votes_available_zero_score_no_spend():
    """score=0, votes_spent=0 → vote_budget_base."""
    stats = _StatsStub(score=0, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == ERA_1.vote_budget_base


def test_votes_available_formula():
    """base=10, multiplier=0.1, score=100, spent=3 → 10 + 10 - 3 = 17."""
    from game_config import EraConfig, ERA_1_FACTIONS
    era = EraConfig(
        name="test",
        config_key="test",
        max_task_signups=20,
        max_duel_participants=2,
        vote_budget_base=10,
        vote_budget_multiplier=0.1,
        level_thresholds=ERA_1.level_thresholds,
        level_to_propose_task=3,
        level_to_propose_metatask=6,
        level_to_see_retired_tasks=2,
        level_to_see_pending_tasks=3,
        duel_level_required=2,
        collaboration_level_required=1,
        collab_auto_submit_days=10,
        metatask_apply_level=7,
        flag_level_required=4,
        comment_level_required=2,
        comment_flag_review_threshold=1,
        second_character_level_required=4,
        albescent_level_required=8,
        faction_graduation_level=3,
        invitation_point_threshold=20,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
        factions=ERA_1_FACTIONS,
        tasks=(),
        taunt_templates={},
    )
    stats = _StatsStub(score=100, votes_spent_this_era=3)
    assert compute_votes_available(stats, era=era) == 17


def test_votes_available_clamps_at_zero_when_overspent():
    """votes_spent > cap → 0 (never negative).

    Can occur after a score rollback or admin stat patch. Callers treat 0
    as 'no votes remaining'.
    """
    # base=100, multiplier=2.0, score=0 → cap=100; spent=500 → would be -400
    stats = _StatsStub(score=0, votes_spent_this_era=500)
    assert compute_votes_available(stats, era=ERA_1) == 0


def test_votes_available_grows_with_score():
    """Budget grows as score grows without any explicit refresh."""
    low = _StatsStub(score=10, votes_spent_this_era=0)
    high = _StatsStub(score=100, votes_spent_this_era=0)
    assert compute_votes_available(high, era=ERA_1) > compute_votes_available(low, era=ERA_1)


def test_votes_available_matches_compute_vote_budget_when_no_spend():
    """When nothing has been spent, available == cap."""
    stats = _StatsStub(score=50, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == compute_vote_budget(50, era=ERA_1)


def test_vote_budget_floors_fractional():
    # multiplier=2.0 is exact, test with a custom era to verify floor()
    from game_config import EraConfig, ERA_1_FACTIONS
    era = EraConfig(
        name="test",
        config_key="test",
        max_task_signups=20,
        max_duel_participants=2,
        vote_budget_base=10,
        vote_budget_multiplier=1.5,
        level_thresholds=ERA_1.level_thresholds,
        level_to_propose_task=3,
        level_to_propose_metatask=6,
        level_to_see_retired_tasks=2,
        level_to_see_pending_tasks=3,
        duel_level_required=2,
        collaboration_level_required=1,
        collab_auto_submit_days=10,
        metatask_apply_level=7,
        flag_level_required=4,
        comment_level_required=2,
        comment_flag_review_threshold=1,
        second_character_level_required=4,
        albescent_level_required=8,
        faction_graduation_level=3,
        invitation_point_threshold=20,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
        factions=ERA_1_FACTIONS,
        tasks=(),
        taunt_templates={},
    )
    # 1.5 * 3 = 4.5 → floor = 4, total = 14
    assert compute_vote_budget(score=3, era=era) == 14


def test_level_zero_at_start():
    assert compute_level(score=0, era=ERA_1) == 0


def test_level_boundaries():
    for level, threshold in enumerate(ERA_1.level_thresholds):
        assert compute_level(score=threshold, era=ERA_1) == level
        if level > 0:
            assert compute_level(score=threshold - 1, era=ERA_1) == level - 1


def test_level_max():
    max_level = len(ERA_1.level_thresholds) - 1
    assert compute_level(score=ERA_1.level_thresholds[-1] + 10000, era=ERA_1) == max_level


def test_praxis_score_no_votes():
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=0) == 10.0


def test_praxis_score_with_votes():
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=3) == 13.0


def test_praxis_score_multiple_votes():
    assert compute_praxis_score(task_point_value=20, faction_multiplier=1.0, total_stars=9) == 29.0


def test_praxis_score_with_multiplier():
    # 0.8 faction multiplier: 10 * 0.8 + 5 stars = 13.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=0.8, total_stars=5) == 13.0


def test_praxis_score_with_meta_task_points():
    # (10 + 5) * 1.0 * 1.0 + 3 = 18.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=3, meta_task_points=5) == 18.0


def test_praxis_score_with_duel_multiplier():
    # (10 + 0) * 1.0 * 1.5 + 4 = 19.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=4, duel_multiplier=1.5) == 19.0


# ---------------------------------------------------------------------------
# Solo mode faction multiplier tests
# ---------------------------------------------------------------------------


def test_faction_multiplier_unaffiliated_task():
    # "na" tasks use own_task_modifier (treated as own-faction, no penalty)
    result = compute_faction_multiplier("wow", "na", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


def test_faction_multiplier_own_faction():
    result = compute_faction_multiplier("wow", "wow", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier
    assert result == 1.1


def test_faction_multiplier_other_faction():
    result = compute_faction_multiplier("wow", "ua", ERA_1)
    assert result == ERA_1.factions["wow"].other_task_modifier
    assert result == 1.0  # flattened for Era 1 (issue #452)


def test_faction_multiplier_unknown_faction():
    assert compute_faction_multiplier("nonexistent", "ua", ERA_1) == 1.0


def test_faction_multiplier_empty_task_faction():
    result = compute_faction_multiplier("wow", "", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


# ---------------------------------------------------------------------------
# Collab mode faction multiplier tests
# ---------------------------------------------------------------------------


def test_collab_own_faction():
    result = compute_faction_multiplier(
        "wow", "wow", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_own_modifier
    assert result == 1.1


def test_collab_other_faction():
    result = compute_faction_multiplier(
        "wow", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_other_modifier
    assert result == 1.0  # flattened for Era 1 (issue #452)


def test_collab_unaffiliated_task():
    result = compute_faction_multiplier(
        "wow", "na", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_own_modifier


# ---------------------------------------------------------------------------
# Duel multiplier tests (compute_duel_multiplier)
# ---------------------------------------------------------------------------


def test_duel_win_snide():
    result = compute_duel_multiplier("snide", "wow", is_winner=True, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["snide"].duel_win_modifier
    assert result == 2.0


def test_duel_loss_snide():
    result = compute_duel_multiplier("snide", "wow", is_winner=False, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["snide"].duel_loss_modifier
    assert result == 0.0


def test_duel_win_standard():
    result = compute_duel_multiplier("wow", "snide", is_winner=True, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["wow"].duel_win_modifier
    assert result == 1.5


def test_duel_loss_standard():
    result = compute_duel_multiplier("wow", "snide", is_winner=False, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["wow"].duel_loss_modifier
    assert result == 0.5


def test_duel_tie_no_snide():
    # No Snide involved → both get 1.0
    result_a = compute_duel_multiplier("wow", "ephemerists", is_winner=False, is_tied=True, era=ERA_1)
    result_b = compute_duel_multiplier("ephemerists", "wow", is_winner=False, is_tied=True, era=ERA_1)
    assert result_a == 1.0
    assert result_b == 1.0


def test_duel_tie_one_snide_snide_wins():
    # Tie with one Snide: Snide gets win rate (2.0), other gets loss rate (0.5)
    snide_result = compute_duel_multiplier("snide", "wow", is_winner=False, is_tied=True, era=ERA_1)
    other_result = compute_duel_multiplier("wow", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert snide_result == ERA_1.factions["snide"].duel_win_modifier
    assert other_result == ERA_1.factions["wow"].duel_loss_modifier


def test_duel_tie_both_snide():
    # Both Snide → both get 1.0 (not one-is-snide rule)
    result = compute_duel_multiplier("snide", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert result == 1.0


def test_duel_faction_multiplier_ignores_duel_mode():
    # compute_faction_multiplier with duel context uses own/other task logic (not duel win/loss)
    result = compute_faction_multiplier("wow", "wow", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


# ---------------------------------------------------------------------------
# Cross-faction collaboration examples from spec
# ---------------------------------------------------------------------------


def test_cross_faction_collab_example():
    """Spec example: Warriors of Whimsy + Ephemerists collaborate on a Snide task."""
    wow_mult = compute_faction_multiplier(
        "wow", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    ephemerists_mult = compute_faction_multiplier(
        "ephemerists", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert wow_mult == 1.0   # collab_other_modifier for wow (flattened, #452)
    assert ephemerists_mult == 1.0  # collab_other_modifier for ephemerists (flattened, #452)


def test_ua_full_points():
    """UA gets 1.0 on everything."""
    config = ERA_1.factions["ua"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_albescent_no_penalties():
    """Albescent gets 1.0 on everything — no penalties."""
    config = ERA_1.factions["albescent"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_ephemerists_no_other_faction_penalty():
    """Ephemerists get full points on other-faction tasks (flattened, #452)."""
    config = ERA_1.factions["ephemerists"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_everymen_no_other_faction_penalty():
    """Everymen get full points on other-faction tasks (flattened, #452)."""
    config = ERA_1.factions["everymen"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
