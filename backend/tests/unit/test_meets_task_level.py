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
