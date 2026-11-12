"""allowed_praxis_modes: the one source for mode-by-level gates (enforcement + UI).

Never returns ``duel``: duels go through POST /duels/challenge (ADR-0011).
"""
from dataclasses import replace
from unittest.mock import MagicMock

import pytest

from game_config import CURRENT_ERA
from models.praxis import PraxisType
from services.praxis import allowed_praxis_modes


# Only `character is None` is checked.
_CHAR = MagicMock()

_TABLE = [
    (None, 0, []),
    (_CHAR, 0, [PraxisType.solo]),
    # Level 1 = collaboration_level_required.
    (_CHAR, 1, [PraxisType.solo, PraxisType.collab]),
    (_CHAR, 2, [PraxisType.solo, PraxisType.collab]),
    (_CHAR, 5, [PraxisType.solo, PraxisType.collab]),
]


@pytest.mark.parametrize("character,level,expected", _TABLE)
def test_allowed_praxis_modes_table(
    character: object,
    level: int,
    expected: list[PraxisType],
) -> None:
    result = allowed_praxis_modes(character, level, CURRENT_ERA)
    assert result == expected


def test_allowed_praxis_modes_reads_era_arg() -> None:
    strict_era = replace(CURRENT_ERA, collaboration_level_required=5)
    assert allowed_praxis_modes(_CHAR, 4, strict_era) == [PraxisType.solo]
    assert allowed_praxis_modes(_CHAR, 5, strict_era) == [
        PraxisType.solo,
        PraxisType.collab,
    ]


def test_mode_gate_collab_predicate() -> None:
    below = CURRENT_ERA.collaboration_level_required - 1
    at_threshold = CURRENT_ERA.collaboration_level_required

    assert PraxisType.collab not in allowed_praxis_modes(_CHAR, below, CURRENT_ERA)
    assert PraxisType.collab in allowed_praxis_modes(_CHAR, at_threshold, CURRENT_ERA)
    assert PraxisType.duel not in allowed_praxis_modes(_CHAR, 99, CURRENT_ERA)
