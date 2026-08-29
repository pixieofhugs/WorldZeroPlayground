"""Unit tests for services.era_gates — the nine level-gate predicates (#2867).

Pure functions, no DB, no fixtures. Era passed explicitly (``ERA_1``), never
``CURRENT_ERA``, per the per-era rules pattern (#2709, ``CONTEXT.md``). No
faction is named for a rule that holds in every era — only the two fields
that carry a real faction clause (retired-task archive access, metatask
apply bypass) name one.
"""
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
)

# Era 1 thresholds exercised below: propose_task=3, propose_metatask=5,
# see_retired=2, see_pending=3, comment=2, metatask_apply=5, collab=1, duel=2.


# --- admin-bypassed floors: propose_task / propose_metatask / see_pending / comment

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


# --- retired tasks: threshold OR the archive-access faction perk -----------

def test_retired_tasks_meets_and_misses_the_threshold() -> None:
    threshold = ERA_1.level_to_see_retired_tasks
    assert may_see_retired_tasks(threshold - 1, None, False, ERA_1) is False
    assert may_see_retired_tasks(threshold, None, False, ERA_1) is True


def test_retired_tasks_faction_perk_reaches_from_level_zero() -> None:
    """Ephemerists (#1672) can reach the archive from level 0 — the whole
    point of the perk is that it is not gated by the level floor at all."""
    assert may_see_retired_tasks(0, "ephemerists", False, ERA_1) is True


def test_retired_tasks_non_perk_faction_still_needs_the_level() -> None:
    assert may_see_retired_tasks(0, "wow", False, ERA_1) is False


def test_retired_tasks_no_character_is_false_even_with_admin_off() -> None:
    assert may_see_retired_tasks(None, None, False, ERA_1) is False


def test_retired_tasks_admin_bypasses() -> None:
    assert may_see_retired_tasks(0, None, True, ERA_1) is True


# --- metatask apply: threshold OR the faction bypass, is_admin does NOT gate

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
    """#1973: is_admin must NOT short-circuit this one, unlike the others —
    apply_metatask has no admin escape hatch server-side."""
    assert may_apply_metatask(0, None, True, ERA_1) is False


def test_apply_metatask_unknown_faction_slug_gets_no_bypass() -> None:
    """A slug the era does not define (e.g. carried over from a prior era)
    grants no ability rather than erroring."""
    assert may_apply_metatask(0, "not-a-real-faction", False, ERA_1) is False


# --- collaboration / duel: flat floors, unwired but included for #2868 -----

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


# --- reads era.*, never a hardcoded threshold -------------------------------

def test_reads_thresholds_off_the_era_argument() -> None:
    """A custom EraConfig, not ERA_1's live values, decides the answer."""
    strict_era = replace(
        ERA_1,
        level_to_propose_task=10,
        collaboration_level_required=10,
        duel_level_required=10,
    )
    assert may_propose_task(9, None, False, strict_era) is False
    assert may_create_collab_praxis(9, None, False, strict_era) is False
    assert may_create_duel(9, None, False, strict_era) is False
    # Untouched fields keep ERA_1's values.
    assert may_comment(2, None, False, strict_era) is True
