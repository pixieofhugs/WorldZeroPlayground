"""The nine level-gate predicates, named and stated exactly once (#2867/#2868).

Every level gate in the game was written twice — once in
``services.character_capabilities`` to *advertise* the action, once in
whichever service enforces it — joined only by a comment ("mirrors the same
clause in ``list_tasks``"). #1672 is what that drift costs: anonymous callers
could read the retired-task archive, and a level-3 player was offered a
pending-tasks filter tab that always answered nothing, because the two sides
disagreed and nothing caught it.

This module is the one statement of each gate. Every predicate here is a pure
function of ``(level, faction_slug, is_admin, era)`` — no DB, no session, no
character/stats row — so both the *advertise* side (``/auth/me`` capability
flags) and the *enforce* side (#2868) read the same answer.

**This module must stay a leaf.** ``character_capabilities`` is imported by
``services.current_user``, the auth dependency that runs on every request.
Importing, say, ``services.task`` (which already imports ``services.praxis``,
the heaviest module in the backend) to reuse the pending-tasks predicate it
used to own would drag that whole graph into the auth path
for every request, admin or anonymous. So this module imports ``game_config``
and nothing else — not even the sibling helpers in ``services.level_jump`` or
``services.meta_task``, which are themselves leaves but still one hop further
than this needs. Where a predicate here needs a faction perk (metatask
apply's bypass, retired-tasks' archive perk), it reads ``era.factions``
directly rather than importing the service that also reads it.

Nine era fields, nine predicates, and since #2868 every one of them is read
rather than restated:

- ``level_to_propose_task``, ``level_to_propose_metatask``,
  ``level_to_see_retired_tasks``, ``level_to_see_pending_tasks``,
  ``comment_level_required``, ``metatask_apply_level`` — advertised by
  ``character_capabilities.compute_capabilities`` (#2867) and enforced by
  ``services.task``, ``services.comment`` and ``services.praxis_metatask``
  (#2868).
- ``collaboration_level_required`` and ``duel_level_required`` — no capability
  flag advertises either, but each still had two statements of its own
  (``services.signup_eligibility.allowed_praxis_modes`` +
  ``services.praxis.change_praxis_type``; the challenge and the accept sites
  in ``services.duel``). All four now read the predicate. No admin or faction
  bypass exists at any of them.
- ``albescent_level_required`` gets ``meets_albescent_level``, and it is the
  one predicate here that is **not** a permission — see its docstring. #2867
  left it out because the *earn* question it half-answers needs a session;
  #2868 reconciles that by keeping the session-backed half in
  ``services.character`` and naming only the level comparison here, which is
  the half the floor (``character_earns_albescent``) and the ceiling
  (``faction_service.defect_to_faction``) must agree about.

Every predicate takes the same ``(level, faction_slug, is_admin, era)`` shape
even where it ignores an argument, so a call site cannot pick a predicate and
then forget which of the three inputs that particular gate happens to read.
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

    The faction clause (#1672) is not an exception to the level gate, it is the
    only way the perk means anything: a faction the era lets work retired tasks
    cannot be forbidden from finding them. Reads
    ``era.allow_praxis_on_retired_task_factions`` directly, matching
    ``services.task.list_tasks``'s ``viewer_sees_retired`` clause, which since
    #2868 *is* this call (``skip_level_check or level >= threshold or faction
    in the set``, with ``is_admin`` this module's name for
    ``skip_level_check``). ``list_tasks`` spells "no viewer" as ``-1`` rather
    than ``None`` — both sit below every floor, and it passes its own spelling
    straight through so the arithmetic is unchanged.
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

    ``is_admin or level >= threshold``, and the admin clause is **ruled**, not
    merely inherited: #2863 (owner, 2026-08-31) settled that it stays on both
    sides, because the pending queue is the moderation queue and an admin who
    has to watch it should not be gated on their character's level. The
    ADR-0041 counter-reading — capabilities are per-Character, admin is
    per-Account — was considered and loses to the concrete failure #1672
    names: the two sides disagreeing is the bug.

    The same ruling closed the faction question this docstring used to raise:
    neither side reads ``faction_slug``, so there is no faction bypass here to
    agree or disagree about. ``services.task.pending_visibility_clause`` calls
    this and passes ``None`` for that reason.
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

    Unlike every predicate above, ``is_admin`` does not bypass this one:
    ``services.praxis_metatask.apply_metatask`` has no admin escape hatch, so
    True here would offer an admin a control the API answers 403 to (#1973).
    The faction clause reads ``era.factions[...].can_apply_metatask_at_any_level``
    directly — the same field ``services.meta_task.faction_bypasses_metatask_level``
    reads — rather than importing that helper, which would pull in
    ``services.meta_task``'s SQLAlchemy/model imports for no reason a pure
    predicate needs.
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
    """``era.collaboration_level_required`` — a flat floor, no bypass today.

    Read by both sites (#2868): ``services.signup_eligibility.allowed_praxis_modes``,
    which decides whether ``collab`` is offered at all, and
    ``services.praxis.change_praxis_type``, which re-asks it when an existing
    praxis is flipped ``solo -> collab``. There is no capability flag for this
    gate; ``allowed_praxis_modes`` is what the ``TaskOut`` field derives from.
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
    """``era.duel_level_required`` — a flat floor, no admin/faction bypass today.

    Read by both sites in ``services.duel`` (#2868) — the challenge
    (``issue_duel_challenge``) and the accept
    (``respond_to_duel_challenge``), which previously stated the same
    ``stats.level < era.duel_level_required`` -> 403 twice. Neither has a
    ``Character`` in hand at the check, so both pass ``None`` for
    ``faction_slug``; nothing here reads it.
    """
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

    The only field here whose two sites read it in OPPOSITE directions, which
    is why this one is named for the fact rather than for an action:

    - :func:`services.character.character_earns_albescent` asks it as a
      **floor** — "has this life climbed far enough" — and then ANDs a
      session-backed check that the same life has covered every joinable
      faction. This predicate is at most half of that rule and is never on its
      own an answer to "did this life earn Albescent".
    - :func:`services.faction_service.defect_to_faction` asks it as a
      **ceiling**, the game's only maximum-level gate (#2399, "never the
      earner"): a life that meets this level may NOT take Albescent, because
      Albescent is the New Game+ faction, taken by a sibling who starts over.

    Stated once so the floor and the ceiling cannot come to mean different
    numbers — a drift that either bars every life from the door or opens it to
    the one life it exists to exclude.

    ``is_admin`` does not bypass: neither site has an admin escape hatch, and a
    ceiling an admin can step over is not a ceiling. ``level is None`` is False
    on the same convention as every predicate above, which is what
    ``character_earns_albescent``'s ``(level or 0)`` already meant.
    """
    if level is None:
        return False
    return level >= era.albescent_level_required
