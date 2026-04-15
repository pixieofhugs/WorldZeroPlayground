from math import floor
from typing import Optional

from game_config import CURRENT_ERA, EraConfig

COLLABORATION_MODE_SOLO = "solo"
COLLABORATION_MODE_COLLAB = "collab"
COLLABORATION_MODE_DUEL = "duel"
UNAFFILIATED_FACTION_SLUG = "na"
SNIDE_FACTION_SLUG = "snide"


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
    collaboration_mode: str = COLLABORATION_MODE_SOLO,
) -> float:
    """Return the faction-based point multiplier for a character doing a given task.

    For duels, duel outcome is captured separately via compute_duel_multiplier — this
    function returns the own/other task modifier regardless of collaboration mode.
    Unaffiliated ("na") tasks are treated as own-faction (no penalty).
    Votes are always added flat after all multipliers are applied.
    """
    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        return 1.0

    is_own_faction = (
        task_faction_slug == character_faction_slug
        or task_faction_slug == UNAFFILIATED_FACTION_SLUG
        or not task_faction_slug
    )

    if collaboration_mode == COLLABORATION_MODE_COLLAB:
        if is_own_faction:
            return faction_config.collab_own_modifier
        return faction_config.collab_other_modifier

    # Solo and duel: use own/other task modifier (duel outcome applied separately)
    if is_own_faction:
        return faction_config.own_task_modifier
    return faction_config.other_task_modifier


def compute_duel_multiplier(
    character_faction_slug: str,
    opponent_faction_slug: str,
    is_winner: bool,
    is_tied: bool,
    era: EraConfig,
) -> float:
    """Return the duel outcome multiplier for a single participant.

    Tiebreaker rules:
    - Tie with one Snide player: Snide gets win rate, other gets loss rate.
    - Tie with no Snide, or both Snide: both get 1.0×.
    """
    if not is_tied:
        faction_config = era.factions.get(character_faction_slug)
        if faction_config is None:
            return 1.5 if is_winner else 0.5
        return faction_config.duel_win_modifier if is_winner else faction_config.duel_loss_modifier

    # Tied case
    one_is_snide = (character_faction_slug == SNIDE_FACTION_SLUG) != (
        opponent_faction_slug == SNIDE_FACTION_SLUG
    )
    if not one_is_snide:
        return 1.0

    # One Snide: Snide wins the tie
    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        return 2.0 if character_faction_slug == SNIDE_FACTION_SLUG else 0.5
    if character_faction_slug == SNIDE_FACTION_SLUG:
        return faction_config.duel_win_modifier
    return faction_config.duel_loss_modifier


def compute_praxis_score(
    task_point_value: int,
    faction_multiplier: float,
    total_stars: int,
    meta_task_points: int = 0,
    duel_multiplier: float = 1.0,
) -> float:
    """Score for a single praxis or collaboration member.

    Formula: (task_point_value + meta_task_points) × faction_multiplier × duel_multiplier + total_stars

    - Base points are awarded on publication.
    - Each star from community votes adds flat after all multipliers.
    - meta_task_points: flat bonus from an attached meta task (0 if none).
    - duel_multiplier: 1.0 for solo/collab; outcome-based for duels.
    """
    return (task_point_value + meta_task_points) * faction_multiplier * duel_multiplier + total_stars
