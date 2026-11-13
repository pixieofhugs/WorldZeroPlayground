"""The level-gate predicates, stated exactly once (#2867/#2868).

Both the advertise side (``character_capabilities``, ``/auth/me``) and the
enforce side read these, so they can't drift (#1672). Pure functions of
``(level, faction_slug, is_admin, era)``; the uniform shape stops a caller
forgetting which inputs a gate reads.

**Must stay a leaf**: it's on the per-request auth path via
``services.current_user``, so it imports only ``game_config`` and reads faction
perks from ``era.factions`` directly.
"""
from game_config import CURRENT_ERA, EraConfig


def may_propose_task(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.level_to_propose_task`` — admin bypasses, no character never meets it."""
    if is_admin:
        return True
    if level is None:
        return False
    return level >= era.level_to_propose_task


def may_propose_metatask(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.level_to_propose_metatask`` — admin bypasses, no character meets it."""
    if is_admin:
        return True
    if level is None:
        return False
    return level >= era.level_to_propose_metatask


def may_see_retired_tasks(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.level_to_see_retired_tasks`` OR the archive-access faction perk.

    A faction allowed to work retired tasks must be able to find them (#1672).
    ``list_tasks`` passes ``-1`` for "no viewer"; same effect as ``None``.
    """
    if is_admin:
        return True
    if level is not None and level >= era.level_to_see_retired_tasks:
        return True
    return faction_slug in era.allow_praxis_on_retired_task_factions


def may_see_pending_tasks(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.level_to_see_pending_tasks`` — admins watch the moderation queue too.

    Admin bypass is ruled (#2863): the pending queue is the moderation queue.
    No faction bypass, so ``pending_visibility_clause`` passes ``None``.
    """
    if is_admin:
        return True
    if level is None:
        return False
    return level >= era.level_to_see_pending_tasks


def may_comment(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.comment_level_required`` — admin bypasses, no character never meets it."""
    if is_admin:
        return True
    if level is None:
        return False
    return level >= era.comment_level_required


def may_apply_metatask(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.metatask_apply_level`` OR the faction bypass — admin does not bypass.

    ``apply_metatask`` has no admin escape hatch, so neither does this (#1973).
    """
    if level is None:
        return False
    faction = era.factions.get(faction_slug) if faction_slug is not None else None
    if faction is not None and faction.can_apply_metatask_at_any_level:
        return True
    return level >= era.metatask_apply_level


def may_create_collab_praxis(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.collaboration_level_required`` — a flat floor, no bypass.

    Read by ``allowed_praxis_modes`` and ``change_praxis_type`` (solo -> collab).
    """
    if level is None:
        return False
    return level >= era.collaboration_level_required


def may_create_duel(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.duel_level_required`` — a flat floor, no bypass (challenge + accept)."""
    if level is None:
        return False
    return level >= era.duel_level_required


def meets_albescent_level(
    level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.albescent_level_required`` — a level FACT, not a permission (#2868).

    Read in opposite directions: a **floor** in ``character_earns_albescent``
    (only half that rule; it also needs every faction covered) and a
    **ceiling** in ``defect_to_faction`` (#2399: the earner may not take
    Albescent). Stated once so both mean the same number. No admin bypass.
    """
    if level is None:
        return False
    return level >= era.albescent_level_required


def may_vote(
    peak_level: int | None,
    faction_slug: str | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """``era.vote_level_required`` against the highest level EVER reached (#3102).

    Peak, not current, level: ``reset_level`` zeroes everyone at rollover, which
    would leave nobody able to vote on day one. No admin bypass.
    """
    if peak_level is None:
        return False
    return peak_level >= era.vote_level_required
