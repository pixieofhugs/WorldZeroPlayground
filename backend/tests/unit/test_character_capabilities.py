"""Unit tests for services.character_capabilities.compute_capabilities.

Pure function — no DB, no fixtures. Table-driven against the level thresholds
defined on ``CURRENT_ERA`` (Era 1: propose_task=3, propose_metatask=5,
see_retired=2, see_pending=3, comment=2).

``era.level_to_see_metatasks`` is deliberately absent: the metatask gate is
enforced server-side in ``services.task`` (#453), and the ``can_see_metatasks``
flag that mirrored it onto /auth/me had no client reader (#1387).
"""
import pytest

from game_config import CURRENT_ERA
from services.character_capabilities import (
    CharacterCapabilities,
    compute_capabilities,
)


# (level, is_admin) -> expected (can_propose_task, can_propose_metatask,
#                                can_see_retired_tasks, can_see_pending_tasks,
#                                can_comment)
# Era 1 thresholds: 3 / 5 / 2 / 3 / 2.
_TABLE = [
    # No character at all -> everything False.
    (None, False, False, False, False, False, False),
    # Below every threshold.
    (0, False, False, False, False, False, False),
    (1, False, False, False, False, False, False),
    # Meets see_retired + comment (both threshold 2).
    (2, False, False, False, True, False, True),
    # Meets propose_task and see_pending (both threshold 3).
    (3, False, True, False, True, True, True),
    (4, False, True, False, True, True, True),
    # Meets every flag (propose-metatask threshold is 5).
    (5, False, True, True, True, True, True),
    (6, False, True, True, True, True, True),
    (7, False, True, True, True, True, True),
    # Admin short-circuit — every flag True regardless of level, even None.
    (None, True, True, True, True, True, True),
    (0, True, True, True, True, True, True),
    (1, True, True, True, True, True, True),
]


@pytest.mark.parametrize(
    "level,is_admin,propose_task,propose_meta,see_retired,see_pending,can_comment",
    _TABLE,
)
def test_compute_capabilities_table(
    level: int | None,
    is_admin: bool,
    propose_task: bool,
    propose_meta: bool,
    see_retired: bool,
    see_pending: bool,
    can_comment: bool,
) -> None:
    result = compute_capabilities(level, is_admin)
    assert isinstance(result, CharacterCapabilities)
    assert result.can_propose_task is propose_task
    assert result.can_propose_metatask is propose_meta
    assert result.can_see_retired_tasks is see_retired
    assert result.can_see_pending_tasks is see_pending
    assert result.can_comment is can_comment


def test_compute_capabilities_reads_from_era_arg() -> None:
    """Passing a custom EraConfig overrides the threshold values (not CURRENT_ERA)."""
    from dataclasses import replace

    strict_era = replace(
        CURRENT_ERA,
        level_to_propose_task=10,
        level_to_propose_metatask=10,
        level_to_see_retired_tasks=10,
        level_to_see_pending_tasks=10,
    )
    # comment_level_required is untouched (stays 2), so a level-9 char can still
    # comment but nothing else under the stricter thresholds.
    result = compute_capabilities(9, is_admin=False, era=strict_era)
    assert result == CharacterCapabilities(
        can_propose_task=False,
        can_propose_metatask=False,
        can_see_retired_tasks=False,
        can_see_pending_tasks=False,
        can_comment=True,
        # metatask_apply_level is untouched (stays 5), so a level-9 char can
        # still apply metatasks under the stricter thresholds.
        can_apply_metatask=True,
        # No faction_slug passed, so no faction grants a jump (#811).
        level_jump_reach=0,
        level_jump_available=False,
    )


# --- the metatask APPLY gate (#1973) ----------------------------------------
#
# Distinct from ``can_propose_metatask`` (``level_to_propose_metatask``): this is
# the gate on pinning an existing metatask to a praxis, enforced by
# ``services.praxis_metatask._check_metatask_eligibility``. Era 1 sets
# ``metatask_apply_level=5``.


def test_cannot_apply_metatask_below_the_apply_level() -> None:
    assert (
        compute_capabilities(
            CURRENT_ERA.metatask_apply_level - 1, is_admin=False
        ).can_apply_metatask
        is False
    )


def test_can_apply_metatask_at_the_apply_level() -> None:
    assert (
        compute_capabilities(
            CURRENT_ERA.metatask_apply_level, is_admin=False
        ).can_apply_metatask
        is True
    )


def test_albescent_can_apply_metatask_below_the_apply_level() -> None:
    """The case a client-side level comparison gets wrong (#1973).

    Albescent carries ``can_apply_metatask_at_any_level``, so a member below
    ``metatask_apply_level`` may still apply — and must still be offered the
    controls. A ``level >= 5`` check in the frontend would deny them.
    """
    result = compute_capabilities(
        0, is_admin=False, faction_slug="albescent", level_jump_used_at_level=None
    )
    assert result.can_apply_metatask is True


def test_non_bypassing_faction_below_the_level_cannot_apply() -> None:
    """The control for the test above — the bypass is Albescent's, not everyone's."""
    result = compute_capabilities(0, is_admin=False, faction_slug="wow")
    assert result.can_apply_metatask is False


def test_no_character_cannot_apply_metatask() -> None:
    assert compute_capabilities(None, is_admin=False).can_apply_metatask is False


def test_admin_below_the_level_cannot_apply_metatask() -> None:
    """NOT short-circuited by is_admin, unlike the propose/see flags.

    ``services.praxis_metatask.apply_metatask`` has no admin escape hatch, so a
    True here would offer an admin a picker the API answers 403 to — the exact
    class of lie #1973 exists to remove. Same reasoning as ``level_jump_*``.
    """
    assert compute_capabilities(0, is_admin=True).can_apply_metatask is False


# --- faction level-jump flags (#811) ----------------------------------------


def test_level_jump_flags_for_unspent_wow() -> None:
    result = compute_capabilities(
        3, is_admin=False, faction_slug="wow", level_jump_used_at_level=None
    )
    assert result.level_jump_reach == 1
    assert result.level_jump_available is True


def test_level_jump_flags_once_spent_at_this_level() -> None:
    result = compute_capabilities(
        3, is_admin=False, faction_slug="wow", level_jump_used_at_level=3
    )
    # reach stays 1 so the UI can still explain the ability rather than hiding
    # it the moment it is used; only `available` flips.
    assert result.level_jump_reach == 1
    assert result.level_jump_available is False


def test_level_jump_flags_after_levelling_up() -> None:
    result = compute_capabilities(
        4, is_admin=False, faction_slug="wow", level_jump_used_at_level=3
    )
    assert result.level_jump_available is True


def test_level_jump_flags_absent_for_other_factions() -> None:
    result = compute_capabilities(
        3, is_admin=False, faction_slug="coven", level_jump_used_at_level=None
    )
    assert result.level_jump_reach == 0
    assert result.level_jump_available is False


def test_admin_does_not_get_a_level_jump_it_has_no_faction_for() -> None:
    # is_admin short-circuits the LEVEL gates to True, but the jump is a faction
    # perk — claiming it for a non-wow admin would be a lie in the UI.
    result = compute_capabilities(
        3, is_admin=True, faction_slug="ua", level_jump_used_at_level=None
    )
    assert result.can_propose_task is True
    assert result.level_jump_reach == 0
    assert result.level_jump_available is False


def test_admin_in_wow_still_reports_its_real_allowance() -> None:
    spent = compute_capabilities(
        3, is_admin=True, faction_slug="wow", level_jump_used_at_level=3
    )
    assert spent.level_jump_reach == 1
    assert spent.level_jump_available is False


def test_no_active_character_has_no_level_jump() -> None:
    result = compute_capabilities(None, is_admin=False, faction_slug="wow")
    assert result.level_jump_available is False
