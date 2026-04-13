from math import floor

from game_config import CURRENT_ERA, EraConfig


def compute_vote_budget(score: int, era: EraConfig = CURRENT_ERA) -> int:
    return era.vote_budget_base + floor(era.vote_budget_multiplier * score)


def compute_level(score: int, era: EraConfig = CURRENT_ERA) -> int:
    for level, threshold in reversed(list(enumerate(era.level_thresholds))):
        if score >= threshold:
            return level
    return 0


def compute_faction_multiplier(
    character_faction_slug: str,
    task_faction_slug: str,
    era: EraConfig,
) -> float:
    """Return the point multiplier for a character doing a given task.

    Uses own_faction_multiplier when the task belongs to the character's faction,
    other_faction_multiplier when it belongs to a different faction, and
    point_multiplier for unaffiliated ("na") tasks.
    """
    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        return 1.0
    if task_faction_slug == "na" or not task_faction_slug:
        return faction_config.point_multiplier
    if task_faction_slug == character_faction_slug:
        return faction_config.own_faction_multiplier
    return faction_config.other_faction_multiplier


def compute_submission_score(
    task_point_value: int,
    faction_multiplier: float,
    total_stars: int,
) -> float:
    """Score for a single submission.

    Base points are awarded immediately on submission (point_value × multiplier).
    Each star from community votes adds directly to the score.
    """
    return task_point_value * faction_multiplier + total_stars
