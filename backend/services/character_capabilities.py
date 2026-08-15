"""Compute character capability flags surfaced on /auth/me.

Single source of truth for the boolean flags the frontend reads to drive UI
gating (show/hide propose buttons, filter tabs, etc.). Rules live on the
active EraConfig; this helper just wires character.level → era.level_to_*.

Design choices:
- Takes ``character_level: int | None`` rather than a Character + stats row
  because the live-game level actually lives on CharacterStats, not Character.
  Passing the int keeps the function pure and DB-free (unit-testable).
- ``is_admin=True`` short-circuits every flag to True. Mirrors the existing
  ``skip_level_check`` admin escape hatch in ``services.task.propose_task``.
- ``character_level=None`` (no active character) makes every flag False.
- The faction level-jump fields (#811) take ``faction_slug`` and the stats row's
  ``level_jump_used_at_level`` for the same reason — passing the two scalars
  keeps this function pure and DB-free. The rule itself lives in
  ``services.level_jump``, shared with the sign-up gate so they cannot drift.
- Never imports CURRENT_ERA inside the function body — it is the default arg
  only, per CLAUDE.md config architecture rules.
"""
from dataclasses import dataclass

from game_config import CURRENT_ERA, EraConfig
from services.level_jump import available_level_reach, faction_level_jump_reach


@dataclass(frozen=True)
class CharacterCapabilities:
    """Boolean flags the frontend uses to gate action UI."""
    can_propose_task: bool
    can_propose_metatask: bool
    can_see_retired_tasks: bool
    can_see_pending_tasks: bool
    can_comment: bool
    # Faction level-jump allowance (#811). ``level_jump_reach`` is what the
    # faction grants at all (0 for everyone without the ability), so the frontend
    # can hide the affordance entirely rather than showing it spent forever;
    # ``level_jump_available`` is whether it is unspent at the current level.
    # Unlike the flags above, these are NOT short-circuited by is_admin: the jump
    # is a faction perk, not a level gate, and an admin claiming to hold an
    # ability their faction does not grant would be a lie in the UI.
    level_jump_reach: int
    level_jump_available: bool


def compute_capabilities(
    character_level: int | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
    faction_slug: str | None = None,
    level_jump_used_at_level: int | None = None,
) -> CharacterCapabilities:
    granted_reach = faction_level_jump_reach(faction_slug, era)
    if character_level is None:
        jump_available = False
    else:
        jump_available = (
            available_level_reach(
                faction_slug, character_level, level_jump_used_at_level, era
            )
            > 0
        )

    if is_admin:
        return CharacterCapabilities(
            can_propose_task=True,
            can_propose_metatask=True,
            can_see_retired_tasks=True,
            can_see_pending_tasks=True,
            can_comment=True,
            level_jump_reach=granted_reach,
            level_jump_available=jump_available,
        )

    if character_level is None:
        return CharacterCapabilities(
            can_propose_task=False,
            can_propose_metatask=False,
            can_see_retired_tasks=False,
            can_see_pending_tasks=False,
            can_comment=False,
            level_jump_reach=granted_reach,
            level_jump_available=False,
        )

    return CharacterCapabilities(
        can_propose_task=character_level >= era.level_to_propose_task,
        can_propose_metatask=character_level >= era.level_to_propose_metatask,
        # Both thresholds are enforced by ``services.task.list_tasks``, which is
        # what makes these two flags honest. They were not: retired was gated
        # here and by nothing there (anonymous callers could read the archive),
        # and pending was gated here by level but there by ``is_admin`` alone
        # (#1672), so a level-3 player was offered a filter tab that always
        # answered nothing.
        #
        # The faction clause mirrors the same clause in ``list_tasks`` — a
        # faction the era lets work retired tasks can reach them from level 0,
        # so the tab must be offered from level 0 too, or the flag is lying
        # again in the other direction.
        can_see_retired_tasks=(
            character_level >= era.level_to_see_retired_tasks
            or faction_slug in era.allow_praxis_on_retired_task_factions
        ),
        can_see_pending_tasks=character_level >= era.level_to_see_pending_tasks,
        can_comment=character_level >= era.comment_level_required,
        level_jump_reach=granted_reach,
        level_jump_available=jump_available,
    )
