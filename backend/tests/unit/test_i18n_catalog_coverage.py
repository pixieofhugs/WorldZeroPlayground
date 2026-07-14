"""ADR-0031 drift guard: every copy key CURRENT_ERA emits must resolve.

The backend emits copy keys (rank_key, unlock key, and — via the taunt read
path — (faction_slug, trigger_type)); the frontend catalog owns the words. The
backend is the only layer that can enumerate the full key set from config, so
this coverage test lives here. It reads the English catalog JSON directly (no
running frontend) and fails if config references a key the catalog is missing.
"""
import json
from pathlib import Path

import pytest

from game_config import CURRENT_ERA
from models.taunt_message import TauntTriggerType

# backend/tests/unit/ -> worktree root -> frontend/src/locales/en/
LOCALES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "locales" / "en"


def _load(namespace: str) -> dict:
    path = LOCALES_DIR / f"{namespace}.json"
    assert path.exists(), f"missing catalog file: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def progression() -> dict:
    return _load("progression")


@pytest.fixture(scope="module")
def taunts() -> dict:
    return _load("taunts")


def test_every_rank_key_resolves(progression):
    ranks = progression["ranks"]
    for level, profile in enumerate(CURRENT_ERA.level_profiles):
        if level == 0:  # start-state placeholder, never shown
            assert profile.rank_key == ""
            continue
        assert profile.rank_key in ranks, (
            f"progression:ranks.{profile.rank_key} (level {level}) not in catalog"
        )


def test_every_unlock_key_resolves_name_and_desc(progression):
    unlocks = progression["unlocks"]
    for level, profile in enumerate(CURRENT_ERA.level_profiles):
        for unlock in profile.unlocks:
            entry = unlocks.get(unlock.key)
            assert entry is not None, (
                f"progression:unlocks.{unlock.key} (level {level}) not in catalog"
            )
            assert entry.get("name"), f"progression:unlocks.{unlock.key}.name missing"
            assert entry.get("desc"), f"progression:unlocks.{unlock.key}.desc missing"


def test_default_faction_covers_every_trigger(taunts):
    """The catalog's shared fallback must have a variant list for every trigger
    the backend can emit — this is what makes an unconfigured faction safe."""
    assert "default" in taunts, "taunts catalog is missing the 'default' faction"
    default = taunts["default"]
    for trigger in TauntTriggerType:
        variants = default.get(trigger.value)
        assert isinstance(variants, list) and variants, (
            f"taunts:default.{trigger.value} must be a non-empty variant list"
        )


def test_every_config_faction_taunt_combo_resolves(taunts):
    """Every faction the current era can send taunts from resolves for every
    trigger — directly, or via the guaranteed default fallback."""
    default = taunts.get("default", {})
    faction_slugs = list(CURRENT_ERA.factions.keys())
    for faction_slug in faction_slugs:
        for trigger in TauntTriggerType:
            faction_variants = taunts.get(faction_slug, {}).get(trigger.value)
            fallback = default.get(trigger.value)
            resolvable = (
                (isinstance(faction_variants, list) and faction_variants)
                or (isinstance(fallback, list) and fallback)
            )
            assert resolvable, (
                f"taunts for ({faction_slug}, {trigger.value}) resolve to nothing "
                f"— no faction variant and no default fallback"
            )
