"""Unit tests for the faction-rules seam (#171, ADR-0029).

``faction_permits`` is a pure predicate over ORM attributes — no DB needed.
"""
from models.character import Character
from models.task import Task, TaskType
from services.faction_service import ALBESCENT_FACTION_SLUG, faction_permits


def _character(faction_slug: str) -> Character:
    return Character(faction_slug=faction_slug)


def _task(task_type: TaskType, metatask_faction_slug: str | None = None) -> Task:
    return Task(task_type=task_type, metatask_faction_slug=metatask_faction_slug)


def test_standard_task_is_faction_open() -> None:
    # A standard task is never faction-gated, whatever the character's faction.
    task = _task(TaskType.standard)
    assert faction_permits(_character("wow"), task) is True
    assert faction_permits(_character("na"), task) is True


def test_metatask_is_faction_open() -> None:
    # Metatasks are faction-open: any character may act on any
    # faction's metatask, whatever their own faction or the metatask's.
    task = _task(TaskType.metatask, metatask_faction_slug="wow")
    assert faction_permits(_character("wow"), task) is True
    assert faction_permits(_character("ephemerists"), task) is True


def test_albescent_may_act_on_any_faction_metatask() -> None:
    task = _task(TaskType.metatask, metatask_faction_slug="wow")
    assert faction_permits(_character(ALBESCENT_FACTION_SLUG), task) is True


def test_metatask_without_a_faction_is_still_open() -> None:
    task = _task(TaskType.metatask, metatask_faction_slug=None)
    assert faction_permits(_character("wow"), task) is True
    assert faction_permits(_character(ALBESCENT_FACTION_SLUG), task) is True
