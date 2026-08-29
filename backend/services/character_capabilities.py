"""Compute character capability flags surfaced on /auth/me.

Single source of truth for the boolean flags the frontend reads to drive UI
gating (show/hide propose buttons, filter tabs, etc.). Rules live on the
active EraConfig; this helper just wires character.level → era.level_to_*.

Design choices:
- Takes ``character_level: int | None`` rather than a Character + stats row
  because the live-game level actually lives on CharacterStats, not Character.
  Passing the int keeps the function pure and DB-free (unit-testable).
- ``is_admin=True`` short-circuits the propose/see flags to True. Mirrors the
  existing ``skip_level_check`` admin escape hatch in
  ``services.task.propose_task``. The fields whose comments say so opt out.
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
from services.era_gates import (
    may_apply_metatask,
    may_comment,
    may_propose_metatask,
    may_propose_task,
    may_see_pending_tasks,
    may_see_retired_tasks,
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
    # The metatask APPLY gate (#1973) — pinning an existing metatask to a
    # praxis, which is NOT ``can_propose_metatask`` (authoring a new one).
    # Mirrors ``services.praxis_metatask._check_metatask_eligibility``: the
    # level gate, OR a faction that carries the bypass. Like the level-jump
    # fields below and unlike the propose/see flags, is_admin does NOT
    # short-circuit it — ``apply_metatask`` has no admin escape hatch, so True
    # here would offer an admin a control the API answers 403 to.
    can_apply_metatask: bool
    # Faction level-jump allowance (#811). ``level_jump_reach`` is what the
    # faction grants at all (0 for everyone without the ability), so the frontend
    # can hide the affordance entirely rather than showing it spent forever;
    # ``level_jump_available`` is whether it is unspent at the current level.
    # Unlike the flags above, these are NOT short-circuited by is_admin: the jump
    # is a faction perk, not a level gate, and an admin claiming to hold an
    # ability their faction does not grant would be a lie in the UI.
    level_jump_reach: int
    level_jump_available: bool
    # Does the task browse OPEN narrowed to "tasks I can sign up for" (#2025)?
    # A default, not a gate: ``GET /tasks`` still takes ``can_sign_up`` from the
    # client and there is no server branch paired with this, so nothing here is
    # enforcement. Named for what it decides rather than the level that decides
    # it, per the house rule at ``frontend/src/api/auth.ts`` — the client must
    # not compare ``character.level`` itself.
    #
    # Not short-circuited by is_admin, like the two fields above: an admin at
    # level 5 has run the loop like everyone else, and the tutorial board would
    # be a lie for them.
    task_browse_defaults_to_eligible: bool


def compute_capabilities(
    character_level: int | None,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
    faction_slug: str | None = None,
    level_jump_used_at_level: int | None = None,
) -> CharacterCapabilities:
    granted_reach = faction_level_jump_reach(faction_slug, era)
    # Level 0 is the tutorial state, and it has precisely one thing to do: a
    # character reaches level 1 *by* signing up for the game-wide level-0
    # onboarding task and posting a praxis for it (era_1.py, level profiles).
    # Not an EraConfig value — level 0 is the bottom of the scale itself
    # (`level_thresholds[0] = 0`, "everyone starts at level 0"), so there is no
    # `era.*` to read here. ``None == 0`` is False, which is the answer a viewer
    # carrying no character wants: no character, no eligibility to compute.
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

    # Every threshold comparison below is stated exactly once, in
    # ``services.era_gates`` — this function only wires character state onto
    # the named predicate for each unlock (#2867). ``is_admin`` and
    # ``character_level is None`` are each predicate's own concern (see that
    # module's docstrings for which gates admin bypasses and which it does
    # not — ``may_apply_metatask`` deliberately does not).
    return CharacterCapabilities(
        can_propose_task=may_propose_task(
            character_level, faction_slug, is_admin, era
        ),
        can_propose_metatask=may_propose_metatask(
            character_level, faction_slug, is_admin, era
        ),
        # Enforced by ``services.task.list_tasks``, which is what makes these
        # two flags honest. They were not: retired was gated here and by
        # nothing there (anonymous callers could read the archive), and
        # pending was gated here by level but there by ``is_admin`` alone
        # (#1672), so a level-3 player was offered a filter tab that always
        # answered nothing. The two enforcement sites still restate these
        # clauses today — #2868 repoints them onto the same predicates.
        can_see_retired_tasks=may_see_retired_tasks(
            character_level, faction_slug, is_admin, era
        ),
        can_see_pending_tasks=may_see_pending_tasks(
            character_level, faction_slug, is_admin, era
        ),
        can_comment=may_comment(character_level, faction_slug, is_admin, era),
        can_apply_metatask=may_apply_metatask(
            character_level, faction_slug, is_admin, era
        ),
        level_jump_reach=granted_reach,
        level_jump_available=jump_available,
        task_browse_defaults_to_eligible=browse_defaults_to_eligible,
    )
