from game_config import ERA_1
from services.scoring import compute_faction_multiplier, compute_level, compute_submission_score, compute_vote_budget


def test_vote_budget_base():
    assert compute_vote_budget(score=0, era=ERA_1) == ERA_1.vote_budget_base


def test_vote_budget_with_score():
    score = 50
    expected = ERA_1.vote_budget_base + int(ERA_1.vote_budget_multiplier * score)
    assert compute_vote_budget(score=score, era=ERA_1) == expected


def test_vote_budget_floors_fractional():
    # multiplier=2.0 is exact, test with a custom era to verify floor()
    from game_config import EraConfig, ERA_1_FACTIONS
    era = EraConfig(
        name="test",
        config_key="test",
        max_task_signups=20,
        task_submit_level_gap=2,
        vote_budget_base=10,
        vote_budget_multiplier=1.5,
        level_thresholds=ERA_1.level_thresholds,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
        factions=ERA_1_FACTIONS,
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


def test_submission_score_no_votes():
    # Base points awarded on submission even with zero votes
    assert compute_submission_score(task_point_value=10, faction_multiplier=1.0, total_stars=0) == 10.0


def test_submission_score_with_votes():
    # 10 base + 3 stars from one vote
    assert compute_submission_score(task_point_value=10, faction_multiplier=1.0, total_stars=3) == 13.0


def test_submission_score_multiple_votes():
    # 20 base + 5+4 = 9 total stars from two votes
    assert compute_submission_score(task_point_value=20, faction_multiplier=1.0, total_stars=9) == 29.0


def test_submission_score_with_multiplier():
    # ua_masters gets 0.8 multiplier: 10 * 0.8 + 5 stars = 13.0
    assert compute_submission_score(task_point_value=10, faction_multiplier=0.8, total_stars=5) == 13.0


def test_faction_multiplier_unaffiliated_task():
    # "na" tasks use point_multiplier
    assert compute_faction_multiplier("ua_masters", "na", ERA_1) == ERA_1.factions["ua_masters"].point_multiplier


def test_faction_multiplier_own_faction():
    # gestalt doing a gestalt task gets own_faction_multiplier
    assert compute_faction_multiplier("gestalt", "gestalt", ERA_1) == ERA_1.factions["gestalt"].own_faction_multiplier


def test_faction_multiplier_other_faction():
    # gestalt doing a ua task gets other_faction_multiplier
    assert compute_faction_multiplier("gestalt", "ua", ERA_1) == ERA_1.factions["gestalt"].other_faction_multiplier


def test_faction_multiplier_unknown_faction():
    # Unknown faction slug falls back to 1.0
    assert compute_faction_multiplier("nonexistent", "ua", ERA_1) == 1.0
