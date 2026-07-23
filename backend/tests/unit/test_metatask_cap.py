"""Unit tests for services.meta_task.metatask_cap_for_level.

Pure function — no DB. Era 1: base=1, max=3, max_level=7.
"""
import pytest

from game_config import CURRENT_ERA
from services.meta_task import metatask_cap_for_level


@pytest.mark.parametrize(
    "level,expected",
    [
        (0, 1),
        (5, 1),   # can apply metatasks (apply gate = 5) but still capped at 1
        (6, 1),
        (7, 3),   # cap rises at the gate level
        (8, 3),
    ],
)
def test_cap_rises_at_gate_level(level: int, expected: int) -> None:
    assert metatask_cap_for_level(level, CURRENT_ERA) == expected


def test_cap_gate_matches_era_config() -> None:
    """Boundary is exactly metatasks_per_praxis_max_level, not one above."""
    gate = CURRENT_ERA.metatasks_per_praxis_max_level
    assert metatask_cap_for_level(gate - 1, CURRENT_ERA) == CURRENT_ERA.metatasks_per_praxis_base
    assert metatask_cap_for_level(gate, CURRENT_ERA) == CURRENT_ERA.metatasks_per_praxis_max
