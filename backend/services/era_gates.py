"""The nine level-gate predicates, named and stated exactly once (#2867).

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
flags) and, in #2868, the *enforce* side can read the same answer.

**This module must stay a leaf.** ``character_capabilities`` is imported by
``services.current_user``, the auth dependency that runs on every request.
Importing, say, ``services.task`` (which already imports ``services.praxis``,
the heaviest module in the backend) to reuse its existing
``viewer_sees_pending_tasks`` would drag that whole graph into the auth path
for every request, admin or anonymous. So this module imports ``game_config``
and nothing else — not even the sibling helpers in ``services.level_jump`` or
``services.meta_task``, which are themselves leaves but still one hop further
than this needs. Where a predicate here needs a faction perk (metatask
apply's bypass, retired-tasks' archive perk), it reads ``era.factions``
directly rather than importing the service that also reads it.

Nine era fields, nine predicates — but only six get repointed here:

- ``level_to_propose_task``, ``level_to_propose_metatask``,
  ``level_to_see_retired_tasks``, ``level_to_see_pending_tasks``,
  ``comment_level_required``, ``metatask_apply_level`` — all six are
  advertised inline in ``character_capabilities.compute_capabilities`` today,
  so this PR repoints that one file onto the predicates below.
- ``collaboration_level_required`` and ``duel_level_required`` — both sites
  for each live in ``praxis.py`` / ``duel.py``, files this ticket does not
  touch (enforcement moves in #2868). Their predicates are included here,
  unwired, as a pure level floor matching today's enforcement
  (``services.praxis.available_creation_modes``,
  ``services.duel.accept_duel``/``create_duel_challenge``) — no admin or
  faction bypass exists at either site today.
- ``albescent_level_required`` is deliberately **not** given a predicate here.
  Its two sites read the SAME era field in OPPOSITE directions for two
  different questions: ``services.character.character_earns_albescent``
  (character.py:209) is a floor ("has this life, plus a DB-backed
  covers-every-faction check, earned the door") and
  ``services.faction_service`` (faction_service.py:248) is a ceiling ("this
  life's climb must still be ahead of it — the only maximum-level gate in the
  game"). The floor question is not answerable without a session (it unions
  two tables against the character's history), so it does not fit the pure
  ``(level, faction_slug, is_admin, era)`` shape this module promises. Forcing
  a partial predicate here would invite #2868 to reuse it as the whole rule
  when it is at most half of one. Left to #2868 to reconcile with a session
  in hand.
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
    ``services.task.list_tasks``'s ``viewer_sees_retired`` clause exactly
    (``skip_level_check or level >= threshold or faction in the set``, with
    ``is_admin`` this module's name for ``skip_level_check`` and ``level is
    None`` this module's shape for "no viewer").
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

    Matches today's enforcement (``services.task.viewer_sees_pending_tasks``)
    exactly: ``is_admin or level >= threshold``. #2863 (not yet landed) may
    revisit whether the advertised side should agree with a faction bypass;
    until it does, this predicate states the rule as both sides implement it
    today.
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

    Matches ``services.praxis.available_creation_modes``'s
    ``character_level >= era.collaboration_level_required`` clause. Not yet
    read by any caller — both the advertise and enforce sites live in
    ``praxis.py``, which is out of scope for this ticket (#2868).
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

    Matches the identical checks in ``services.duel`` at both the challenge
    (create) and accept sites: ``stats.level < era.duel_level_required`` ->
    403. Not yet read by any caller — both sites live in ``duel.py``, which is
    out of scope for this ticket (#2868).
    """
    if level is None:
        return False
    return level >= era.duel_level_required
