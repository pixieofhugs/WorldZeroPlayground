"""Capability flags surfaced on /auth/me for frontend UI gating.

Takes scalars (level lives on CharacterStats) to stay pure and DB-free.
``is_admin`` short-circuits propose/see flags only; fields noted below opt out.
"""
from dataclasses import dataclass

from game_config import CURRENT_ERA, EraConfig
from services.era_gates import (
    may_apply_metatask,
    may_comment,
    may_propose_metatask,
    may_propose_task,
    may_see_pending_tasks,
    may_see_retired_tasks,
    may_vote,
)
from services.level_jump import available_level_reach, faction_level_jump_reach


@dataclass(frozen=True)
class CharacterCapabilities:
    """Boolean flags the frontend uses to gate action UI."""
    can_propose_task: bool
    can_propose_metatask: bool
    can_see_retired_tasks: bool
    can_see_pending_tasks: bool
    can_comment: bool
    # Uses peak_level (#3102). No admin bypass: the API has none either.
    can_vote: bool
    # Pinning an existing metatask (#1973), not authoring one. No admin bypass:
    # ``apply_metatask`` has none either.
    can_apply_metatask: bool
    # Faction level jump (#811): reach is 0 without the ability (hide the UI);
    # available = unspent at current level. A faction perk: no admin bypass.
    level_jump_reach: int
    level_jump_available: bool
    # Task browse opens filtered to sign-up-able tasks (#2025). A UI default,
    # not enforcement; no admin bypass.
    task_browse_defaults_to_eligible: bool


def compute_capabilities(
    character_level: int | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
    faction_slug: str | None = None,
    level_jump_used_at_level: int | None = None,
    peak_level: int | None = None,
) -> CharacterCapabilities:
    granted_reach = faction_level_jump_reach(faction_slug, era)
    # Level 0 is the tutorial (one onboarding task); it is the scale's floor,
    # not an EraConfig value. ``None == 0`` is False: no character, no default.
    browse_defaults_to_eligible = character_level == 0
    if character_level is None:
        jump_available = False
    else:
        jump_available = (
            available_level_reach(
                faction_slug, character_level, level_jump_used_at_level, era
            )
            > 0
        )

    # Thresholds and admin/None handling live in ``services.era_gates`` (#2867).
    return CharacterCapabilities(
        can_propose_task=may_propose_task(
            character_level, faction_slug, is_admin, era
        ),
        can_propose_metatask=may_propose_metatask(
            character_level, faction_slug, is_admin, era
        ),
        # ``services.task.list_tasks`` enforces these with the same calls.
        can_see_retired_tasks=may_see_retired_tasks(
            character_level, faction_slug, is_admin, era
        ),
        can_see_pending_tasks=may_see_pending_tasks(
            character_level, faction_slug, is_admin, era
        ),
        can_comment=may_comment(character_level, faction_slug, is_admin, era),
        can_vote=may_vote(peak_level, faction_slug, is_admin, era),
        can_apply_metatask=may_apply_metatask(
            character_level, faction_slug, is_admin, era
        ),
        level_jump_reach=granted_reach,
        level_jump_available=jump_available,
        task_browse_defaults_to_eligible=browse_defaults_to_eligible,
    )
