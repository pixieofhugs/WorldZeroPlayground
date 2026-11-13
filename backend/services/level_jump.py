"""The faction level-jump allowance (#811): sign up for tasks up to
``level_jump_reach`` levels above your own, once per level.

Available iff ``level_jump_used_at_level != stats.level`` (levelling up or an era
reset restores it; no counter). Spent on sign-up and never refunded, else it
could be farmed. Gate and UI both read :func:`available_level_reach`.
"""
from typing import Optional

from game_config import CURRENT_ERA, EraConfig
from models.character_stats import CharacterStats


def faction_level_jump_reach(
    faction_slug: Optional[str],
    era: EraConfig = CURRENT_ERA,
) -> int:
    """Reach this faction grants, ignoring whether it is spent; 0 for unknown slugs."""
    if faction_slug is None:
        return 0
    faction_config = era.factions.get(faction_slug)
    if faction_config is None:
        return 0
    return faction_config.level_jump_reach


def is_level_jump_available(
    character_level: int,
    level_jump_used_at_level: Optional[int],
) -> bool:
    """Whether the once-per-level allowance is unspent at ``character_level``."""
    return level_jump_used_at_level != character_level


def available_level_reach(
    faction_slug: Optional[str],
    character_level: int,
    level_jump_used_at_level: Optional[int],
    era: EraConfig = CURRENT_ERA,
) -> int:
    """Levels above ``character_level`` this character may reach *right now*.

    0 when the faction grants none or it's spent; gate and UI both use it.
    """
    reach = faction_level_jump_reach(faction_slug, era)
    if reach <= 0:
        return 0
    if not is_level_jump_available(character_level, level_jump_used_at_level):
        return 0
    return reach


def consume_level_jump(stats: CharacterStats) -> None:
    """Record the allowance as spent at the character's current level.

    Idempotent. Call only when the claim needed the jump (see ``create_praxis``).
    """
    stats.level_jump_used_at_level = stats.level
