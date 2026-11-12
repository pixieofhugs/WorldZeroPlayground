"""Unit tests for compute_capabilities (pure; Era 1 thresholds).

No ``can_see_metatasks``: enforced server-side in ``services.task`` (#453, #1387).
"""
import pytest

from game_config import CURRENT_ERA
from services.character_capabilities import (
    CharacterCapabilities,
    compute_capabilities,
)


# Era 1 thresholds: propose 3, metatask 5, retired 2, pending 3, comment 2.
_TABLE = [
    (None, False, False, False, False, False, False),
    (0, False, False, False, False, False, False),
    (1, False, False, False, False, False, False),
    (2, False, False, False, True, False, True),
    (3, False, True, False, True, True, True),
    (4, False, True, False, True, True, True),
    (5, False, True, True, True, True, True),
    (6, False, True, True, True, True, True),
    (7, False, True, True, True, True, True),
    # admin short-circuit
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
    from dataclasses import replace

    strict_era = replace(
        CURRENT_ERA,
        level_to_propose_task=10,
        level_to_propose_metatask=10,
        level_to_see_retired_tasks=10,
        level_to_see_pending_tasks=10,
    )
    result = compute_capabilities(9, is_admin=False, era=strict_era)
    assert result == CharacterCapabilities(
        can_propose_task=False,
        can_propose_metatask=False,
        can_see_retired_tasks=False,
        can_see_pending_tasks=False,
        can_comment=True,
        # no peak_level passed (#3102)
        can_vote=False,
        can_apply_metatask=True,
        level_jump_reach=0,
        level_jump_available=False,
        task_browse_defaults_to_eligible=False,
    )


# Metatask APPLY gate (#1973): pinning an existing metatask, not proposing one.


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
    """A client-side ``level >= 5`` check gets this wrong (#1973)."""
    result = compute_capabilities(
        0, is_admin=False, faction_slug="albescent", level_jump_used_at_level=None
    )
    assert result.can_apply_metatask is True


def test_non_bypassing_faction_below_the_level_cannot_apply() -> None:
    result = compute_capabilities(0, is_admin=False, faction_slug="wow")
    assert result.can_apply_metatask is False


def test_no_character_cannot_apply_metatask() -> None:
    assert compute_capabilities(None, is_admin=False).can_apply_metatask is False


def test_admin_below_the_level_cannot_apply_metatask() -> None:
    """Not admin-short-circuited: ``apply_metatask`` has no admin escape."""
    assert compute_capabilities(0, is_admin=True).can_apply_metatask is False


# Faction level-jump flags (#811)


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
    # reach stays so the UI can still explain the ability
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
    # admin short-circuits level gates, not faction perks
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


def test_task_browse_default_belongs_to_the_tutorial_state() -> None:
    """ON for level 0 only (#2025); a board hiding rows later surprises (#1367)."""
    assert compute_capabilities(0, is_admin=False).task_browse_defaults_to_eligible is True
    assert compute_capabilities(1, is_admin=False).task_browse_defaults_to_eligible is False
    assert compute_capabilities(7, is_admin=False).task_browse_defaults_to_eligible is False


def test_no_active_character_gets_no_browse_default() -> None:
    # /tasks is the public shop window
    assert (
        compute_capabilities(None, is_admin=False).task_browse_defaults_to_eligible
        is False
    )


def test_admin_does_not_short_circuit_the_browse_default() -> None:
    # A UI default, not a permission (#2025).
    assert compute_capabilities(5, is_admin=True).task_browse_defaults_to_eligible is False
    assert compute_capabilities(0, is_admin=True).task_browse_defaults_to_eligible is True
    assert (
        compute_capabilities(None, is_admin=True).task_browse_defaults_to_eligible
        is False
    )
