"""
Unit tests for Era reset logic.

These tests validate the reset flag semantics from SPEC-game-rules.md § 11.
They do NOT hit the DB — they test the logic of what *should* happen to
a character dict given a particular EraConfig's reset flags.

Vote budget is on-read (see services/scoring.compute_votes_available), so
reset_vote_budget zeros `votes_spent_this_era`, not a stored budget counter.
"""
from dataclasses import replace

import pytest

from game_config import ERA_1, ERA_1_FACTIONS, EraConfig


def apply_era_reset(character: dict, new_era: EraConfig) -> dict:
    """
    Pure function representation of reset logic (mirrors what services/era.py will do).
    Operates on a plain dict to avoid DB dependencies in unit tests.
    """
    result = dict(character)
    if new_era.reset_score:
        result["score"] = 0
    if new_era.reset_level:
        result["level"] = 0
    if new_era.reset_faction:
        result["faction_slug"] = "na"
    if new_era.reset_vote_budget:
        result["votes_spent_this_era"] = 0
    if new_era.reset_all_time_score:
        result["all_time_score"] = 0
    return result


@pytest.fixture
def sample_character():
    return {
        "score": 500,
        "level": 4,
        "faction_slug": "gestalt",
        "votes_spent_this_era": 50,
        "all_time_score": 2000,
    }


@pytest.fixture
def full_reset_era():
    return replace(
        ERA_1,
        reset_score=True,
        reset_level=True,
        reset_faction=True,
        reset_vote_budget=True,
        reset_all_time_score=True,
    )


@pytest.fixture
def no_reset_era():
    return replace(
        ERA_1,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
    )


def test_full_reset_zeroes_score(sample_character, full_reset_era):
    result = apply_era_reset(sample_character, full_reset_era)
    assert result["score"] == 0


def test_full_reset_zeroes_level(sample_character, full_reset_era):
    result = apply_era_reset(sample_character, full_reset_era)
    assert result["level"] == 0


def test_full_reset_sets_faction_to_aged_out(sample_character, full_reset_era):
    result = apply_era_reset(sample_character, full_reset_era)
    assert result["faction_slug"] == "na"


def test_full_reset_zeroes_votes_spent_this_era(sample_character, full_reset_era):
    result = apply_era_reset(sample_character, full_reset_era)
    assert result["votes_spent_this_era"] == 0


def test_full_reset_zeroes_all_time_score(sample_character, full_reset_era):
    result = apply_era_reset(sample_character, full_reset_era)
    assert result["all_time_score"] == 0


def test_no_reset_preserves_all_fields(sample_character, no_reset_era):
    result = apply_era_reset(sample_character, no_reset_era)
    assert result == sample_character


def test_era1_reset_does_not_touch_all_time_score(sample_character):
    """ERA_1 has reset_all_time_score=False — all_time_score must be preserved."""
    assert ERA_1.reset_all_time_score is False
    result = apply_era_reset(sample_character, ERA_1)
    assert result["all_time_score"] == sample_character["all_time_score"]


def test_era1_reset_clears_score(sample_character):
    assert ERA_1.reset_score is True
    result = apply_era_reset(sample_character, ERA_1)
    assert result["score"] == 0


def test_era1_reset_clears_level(sample_character):
    assert ERA_1.reset_level is True
    result = apply_era_reset(sample_character, ERA_1)
    assert result["level"] == 0


def test_era1_reset_clears_faction(sample_character):
    assert ERA_1.reset_faction is True
    result = apply_era_reset(sample_character, ERA_1)
    assert result["faction_slug"] == "na"


def test_era1_reset_zeroes_votes_spent_this_era(sample_character):
    assert ERA_1.reset_vote_budget is True
    result = apply_era_reset(sample_character, ERA_1)
    assert result["votes_spent_this_era"] == 0


def test_selective_reset_only_score():
    era = replace(
        ERA_1,
        reset_score=True,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
    )
    char = {"score": 300, "level": 3, "faction_slug": "snide", "votes_spent_this_era": 25, "all_time_score": 1000}
    result = apply_era_reset(char, era)
    assert result["score"] == 0
    assert result["level"] == 3
    assert result["faction_slug"] == "snide"
    assert result["votes_spent_this_era"] == 25
    assert result["all_time_score"] == 1000
