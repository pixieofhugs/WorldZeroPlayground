"""``Character.peak_level`` has one writer, ``record_level_reached`` (#3102).

The vote gate reads "EVER reached the level", so every level write raises it.
"""

import re
from pathlib import Path

from models.character import Character
from services.character import record_level_reached

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def test_a_reached_level_raises_the_peak_and_nothing_lowers_it() -> None:
    character = Character(peak_level=0)
    record_level_reached(character, 3)
    assert character.peak_level == 3
    record_level_reached(character, 1)
    assert character.peak_level == 3


def test_only_the_helper_assigns_peak_level() -> None:
    assignment = re.compile(r"\.peak_level\s*=[^=]")
    writers = set()
    for path in BACKEND_ROOT.rglob("*.py"):
        relative = path.relative_to(BACKEND_ROOT).as_posix()
        if relative.startswith((".venv/", "tests/", "alembic/")):
            continue
        if assignment.search(path.read_text(encoding="utf-8")):
            writers.add(relative)
    assert writers == {"services/character.py"}
