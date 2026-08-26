"""Throwaway pytest plugin: run the suite as if Era 2 were live (#2708).

Never committed, never imported by anything but an explicit `-p` on the command
line. `CURRENT_ERA` in game_config.py is untouched — this rebinds the module
attribute before any test module (and therefore before `factories.py`, which
computes DEFAULT_FACTION_SLUG at import) has read it.

    pytest -p _wz2708_era2_plugin ...
"""
import game_config
from eras.era_2 import ERA_2

game_config.CURRENT_ERA = ERA_2
assert game_config.CURRENT_ERA.config_key == "era_2"
assert game_config.ERA_1.config_key == "era_1"
assert game_config.CURRENT_ERA.config_key == "era_2", "the ERA_1 branch rebound it"
