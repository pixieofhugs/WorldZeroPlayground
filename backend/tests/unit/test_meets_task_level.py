"""Unit tests for the task-level gate (#292).

``meets_task_level`` is the named home for the task-level half that used to be
inlined into the eligibility/sign-up predicates. Pure predicate — no DB.
"""
from models.task import Task
from services.praxis import meets_task_level


def _task(level_required: int) -> Task:
    return Task(level_required=level_required)


def test_below_required_level_is_denied() -> None:
    assert meets_task_level(2, _task(3)) is False


def test_exact_level_meets_the_bar() -> None:
    assert meets_task_level(3, _task(3)) is True


def test_above_required_level_is_permitted() -> None:
    assert meets_task_level(8, _task(3)) is True


def test_level_zero_task_is_open_to_everyone() -> None:
    assert meets_task_level(0, _task(0)) is True


# --- the faction level-jump term (#811) -------------------------------------
# Extending THIS predicate is what gives the ability identical behaviour across
# solo/collab/duel, so the arithmetic is pinned here rather than per mode.


def test_reach_defaults_to_zero_so_the_gate_is_unchanged() -> None:
    assert meets_task_level(2, _task(3)) is False


def test_reach_of_one_clears_a_task_one_level_up() -> None:
    assert meets_task_level(3, _task(4), 1) is True


def test_reach_of_one_does_not_clear_a_task_two_levels_up() -> None:
    # "Exactly one level, never two" — the settled default in #811.
    assert meets_task_level(3, _task(5), 1) is False


def test_reach_still_clears_tasks_at_or_below_own_level() -> None:
    assert meets_task_level(3, _task(3), 1) is True
    assert meets_task_level(3, _task(1), 1) is True
