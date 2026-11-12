"""Unit tests for services.era_gates (#2868). Era passed explicitly (#2709)."""
from dataclasses import replace

import pytest

from game_config import ERA_1
from services.era_gates import (
    may_apply_metatask,
    may_comment,
    may_create_collab_praxis,
    may_create_duel,
    may_propose_metatask,
    may_propose_task,
    may_see_pending_tasks,
    may_see_retired_tasks,
    meets_albescent_level,
)

# Admin-bypassed floors

@pytest.mark.parametrize(
    "predicate,threshold_field",
    [
        (may_propose_task, "level_to_propose_task"),
        (may_propose_metatask, "level_to_propose_metatask"),
        (may_see_pending_tasks, "level_to_see_pending_tasks"),
        (may_comment, "comment_level_required"),
    ],
)
def test_floor_gates_meet_and_miss_the_threshold(predicate, threshold_field) -> None:
    threshold = getattr(ERA_1, threshold_field)
    assert predicate(threshold - 1, None, False, ERA_1) is False
    assert predicate(threshold, None, False, ERA_1) is True
    assert predicate(threshold + 1, None, False, ERA_1) is True


@pytest.mark.parametrize(
    "predicate",
    [may_propose_task, may_propose_metatask, may_see_pending_tasks, may_comment],
)
def test_floor_gates_no_character_is_false(predicate) -> None:
    assert predicate(None, None, False, ERA_1) is False


@pytest.mark.parametrize(
    "predicate",
    [may_propose_task, may_propose_metatask, may_see_pending_tasks, may_comment],
)
def test_floor_gates_admin_bypasses_even_with_no_character(predicate) -> None:
    assert predicate(0, None, True, ERA_1) is True
    assert predicate(None, None, True, ERA_1) is True


# Retired tasks: threshold OR faction perk

def test_retired_tasks_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.level_to_see_retired_tasks
    assert may_see_retired_tasks(threshold - 1, None, False, ERA_1) is False
    assert may_see_retired_tasks(threshold, None, False, ERA_1) is True


def test_retired_tasks_faction_perk_reaches_from_level_zero() -> None:
    """Ephemerists (#1672)."""
    assert may_see_retired_tasks(0, "ephemerists", False, ERA_1) is True


def test_retired_tasks_non_perk_faction_still_needs_the_level() -> None:
    assert may_see_retired_tasks(0, "wow", False, ERA_1) is False


def test_retired_tasks_no_character_is_false_even_with_admin_off() -> None:
    assert may_see_retired_tasks(None, None, False, ERA_1) is False


def test_retired_tasks_admin_bypasses() -> None:
    assert may_see_retired_tasks(0, None, True, ERA_1) is True


# Metatask apply: threshold OR faction bypass; admin does not bypass

def test_apply_metatask_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.metatask_apply_level
    assert may_apply_metatask(threshold - 1, None, False, ERA_1) is False
    assert may_apply_metatask(threshold, None, False, ERA_1) is True


def test_apply_metatask_albescent_bypasses_below_the_level() -> None:
    assert may_apply_metatask(0, "albescent", False, ERA_1) is True


def test_apply_metatask_non_bypassing_faction_below_the_level_cannot() -> None:
    assert may_apply_metatask(0, "wow", False, ERA_1) is False


def test_apply_metatask_no_character_is_false() -> None:
    assert may_apply_metatask(None, "albescent", False, ERA_1) is False
    assert may_apply_metatask(None, "albescent", True, ERA_1) is False


def test_apply_metatask_admin_does_not_bypass_the_level() -> None:
    """#1973: apply_metatask has no admin escape hatch server-side."""
    assert may_apply_metatask(0, None, True, ERA_1) is False


def test_apply_metatask_unknown_faction_slug_gets_no_bypass() -> None:
    assert may_apply_metatask(0, "not-a-real-faction", False, ERA_1) is False


# Collaboration / duel floors

def test_collab_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.collaboration_level_required
    assert may_create_collab_praxis(threshold - 1, None, False, ERA_1) is False
    assert may_create_collab_praxis(threshold, None, False, ERA_1) is True


def test_collab_no_character_is_false() -> None:
    assert may_create_collab_praxis(None, None, False, ERA_1) is False


def test_duel_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.duel_level_required
    assert may_create_duel(threshold - 1, None, False, ERA_1) is False
    assert may_create_duel(threshold, None, False, ERA_1) is True


def test_duel_no_character_is_false() -> None:
    assert may_create_duel(None, None, False, ERA_1) is False


# Albescent: one level fact, read as floor and ceiling (#2868)

def test_albescent_level_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.albescent_level_required
    assert meets_albescent_level(threshold - 1, None, False, ERA_1) is False
    assert meets_albescent_level(threshold, None, False, ERA_1) is True
    assert meets_albescent_level(threshold + 1, None, False, ERA_1) is True


def test_albescent_level_no_stats_row_is_false() -> None:
    """No stats row for the era means this life has not climbed."""
    assert meets_albescent_level(None, None, False, ERA_1) is False


def test_albescent_level_admin_does_not_bypass() -> None:
    """The ``defect_to_faction`` ceiling: a bypass would let admins in."""
    assert meets_albescent_level(0, None, True, ERA_1) is False
    assert (
        meets_albescent_level(ERA_1.albescent_level_required, None, True, ERA_1)
        is True
    )


def test_reads_thresholds_off_the_era_argument() -> None:
    strict_era = replace(
        ERA_1,
        level_to_propose_task=10,
        collaboration_level_required=10,
        duel_level_required=10,
        albescent_level_required=10,
    )
    assert may_propose_task(9, None, False, strict_era) is False
    assert may_create_collab_praxis(9, None, False, strict_era) is False
    assert may_create_duel(9, None, False, strict_era) is False
    assert meets_albescent_level(9, None, False, strict_era) is False
    assert may_comment(2, None, False, strict_era) is True
