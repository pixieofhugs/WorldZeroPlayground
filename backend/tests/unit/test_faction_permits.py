"""Unit tests for ``faction_permits`` (#171, ADR-0029)."""
from models.character import Character
from models.task import Task, TaskType
from services.faction_service import ALBESCENT_FACTION_SLUG, faction_permits


def _character(faction_slug: str) -> Character:
    return Character(faction_slug=faction_slug)


def _task(task_type: TaskType, metatask_faction_slug: str | None = None) -> Task:
    return Task(task_type=task_type, metatask_faction_slug=metatask_faction_slug)


def test_faction_permits_is_open_to_every_faction() -> None:
    task = _task(TaskType.metatask, metatask_faction_slug="wow")
    assert faction_permits(_character(ALBESCENT_FACTION_SLUG), task) is True
