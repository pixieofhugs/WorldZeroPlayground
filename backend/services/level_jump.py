"""The faction level-jump allowance (#811) — one home for the whole ability.

A faction may grant its members the right to reach ``level_jump_reach`` levels
ABOVE their own when signing up for a task, once per level. Era 1 gives this to
Warriors of Whimsy (reach 1); every other faction sits at the 0 baseline.

Two rules and no more:

- **Availability.** The allowance is available iff
  ``stats.level_jump_used_at_level != stats.level``. Levelling up changes
  ``stats.level``, which restores it — there is deliberately no counter and no
  reset job. Stats rows are per-(character, era), so an era reset clears it too.
- **Consumption.** Spending is recorded by stamping the *current* level. It
  happens on sign-up and is never refunded: abandoning or deleting the praxis
  does not give it back, otherwise it could be farmed by claiming and backing
  out.

Both callers (the sign-up gate in ``services.praxis`` and the capability flags in
``services.character_capabilities``) read :func:`available_level_reach`, so the
enforcement and the UI affordance cannot drift apart. Nothing here branches on a
faction slug — the reach is a ``FactionConfig`` field read off ``era``.
"""
from typing import Optional

from game_config import CURRENT_ERA, EraConfig
from models.character_stats import CharacterStats


def faction_level_jump_reach(
    faction_slug: Optional[str],
    era: EraConfig = CURRENT_ERA,
) -> int:
    """The reach this faction grants at all, ignoring whether it is spent.

    Returns 0 for anonymous/unaffiliated characters and for any slug the era does
    not define (a character carrying a slug from a previous era gets no ability
    rather than an error).
    """
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

    0 when the faction grants no jump or when the allowance is already spent at
    this level. This is the number the task-level gate adds to the character's
    level, so it is also the number the UI shows.
    """
    reach = faction_level_jump_reach(faction_slug, era)
    if reach <= 0:
        return 0
    if not is_level_jump_available(character_level, level_jump_used_at_level):
        return 0
    return reach


def consume_level_jump(stats: CharacterStats) -> None:
    """Record the allowance as spent at the character's current level.

    Idempotent within a level: stamping the same level twice is a no-op. Callers
    must only invoke this when the claim actually *needed* the jump — see
    :func:`services.praxis.create_praxis`.
    """
    stats.level_jump_used_at_level = stats.level
