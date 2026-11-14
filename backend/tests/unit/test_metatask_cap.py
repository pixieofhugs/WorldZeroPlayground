"""metatask_cap_for_level."""
from game_config import CURRENT_ERA
from services.meta_task import metatask_cap_for_level


def test_cap_gate_matches_era_config() -> None:
    gate = CURRENT_ERA.metatasks_per_praxis_max_level
    assert metatask_cap_for_level(gate - 1, CURRENT_ERA) == CURRENT_ERA.metatasks_per_praxis_base
    assert metatask_cap_for_level(gate, CURRENT_ERA) == CURRENT_ERA.metatasks_per_praxis_max
