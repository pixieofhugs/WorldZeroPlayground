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
- Never imports CURRENT_ERA inside the function body — it is the default arg
  only, per CLAUDE.md config architecture rules.
"""
from dataclasses import dataclass

from game_config import CURRENT_ERA, EraConfig


@dataclass(frozen=True)
class CharacterCapabilities:
    """Boolean flags the frontend uses to gate action UI."""
    can_propose_task: bool
    can_propose_metatask: bool
    can_see_metatasks: bool
    can_see_retired_tasks: bool
    can_see_pending_tasks: bool
    can_comment: bool


def compute_capabilities(
    character_level: int | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> CharacterCapabilities:
    if is_admin:
        return CharacterCapabilities(
            can_propose_task=True,
            can_propose_metatask=True,
            can_see_metatasks=True,
            can_see_retired_tasks=True,
            can_see_pending_tasks=True,
            can_comment=True,
        )

    if character_level is None:
        return CharacterCapabilities(
            can_propose_task=False,
            can_propose_metatask=False,
            can_see_metatasks=False,
            can_see_retired_tasks=False,
            can_see_pending_tasks=False,
            can_comment=False,
        )

    return CharacterCapabilities(
        can_propose_task=character_level >= era.level_to_propose_task,
        can_propose_metatask=character_level >= era.level_to_propose_metatask,
        can_see_metatasks=character_level >= era.level_to_see_metatasks,
        can_see_retired_tasks=character_level >= era.level_to_see_retired_tasks,
        can_see_pending_tasks=character_level >= era.level_to_see_pending_tasks,
        can_comment=character_level >= era.comment_level_required,
    )
