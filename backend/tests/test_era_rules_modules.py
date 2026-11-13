"""Every era has a rules module naming each perk it grants (#2709).

A source-text repo guard. Rules: every ``_ERA_ATTRIBUTE_BY_CONFIG_KEY`` key has
``tests/integration/eras/test_<config_key>_rules.py``; that module mentions
every perk axis (#1871 registries plus ``EraConfig`` perk frozensets) some
faction deviates on. The text match is deliberately crude; don't upgrade it.
"""
import dataclasses
from pathlib import Path

import pytest

from game_config import (
    _ANY_PERK_FIELDS,
    _DUEL_PERK_FIELDS,
    _ERA_ATTRIBUTE_BY_CONFIG_KEY,
    _MAX_PERK_FIELDS,
    EraConfig,
    FactionConfig,
    era_config_for_key,
)

ERA_RULES_DIR = Path(__file__).parent / "integration" / "eras"

#: Perk axes on ``EraConfig``, not ``FactionConfig`` (#1871). Held if non-empty.
_ERA_PERK_FROZENSETS: tuple[str, ...] = (
    "allow_praxis_on_retired_task_factions",
    "allow_praxis_on_pending_task_factions",
)

#: Frozensets that are not perks: "not a perk" vs "not classified yet".
_NON_PERK_FROZENSETS: tuple[str, ...] = ()

#: "Nobody holds this" for undefaulted perk axes. Identities, never era rules.
_UNDEFAULTED_BASELINES: dict[str, object] = {
    "own_task_modifier": 1.0,
    "other_task_modifier": 1.0,
    "collab_own_modifier": 1.0,
    "collab_other_modifier": 1.0,
    "duel_win_modifier": 1.0,
    "duel_loss_modifier": 1.0,
    "can_always_rejoin": False,
}

PERK_FIELDS: tuple[str, ...] = _MAX_PERK_FIELDS + _ANY_PERK_FIELDS + _DUEL_PERK_FIELDS

ERA_CONFIG_KEYS: tuple[str, ...] = tuple(_ERA_ATTRIBUTE_BY_CONFIG_KEY)

_FACTION_FIELD_DEFAULTS = {
    field.name: field.default for field in dataclasses.fields(FactionConfig)
}


def module_path(config_key: str) -> Path:
    return ERA_RULES_DIR / f"test_{config_key}_rules.py"


def _baseline(field_name: str) -> object:
    default = _FACTION_FIELD_DEFAULTS[field_name]
    if default is dataclasses.MISSING:
        return _UNDEFAULTED_BASELINES[field_name]
    return default


def granted_perk_names(era: EraConfig) -> set[str]:
    """Perk axes some faction of ``era`` deviates from baseline on."""
    granted = {
        name
        for name in PERK_FIELDS
        if any(
            getattr(faction, name) != _baseline(name)
            for faction in era.factions.values()
        )
    }
    granted |= {name for name in _ERA_PERK_FROZENSETS if getattr(era, name)}
    return granted


def missing_modules(config_keys) -> list[str]:
    return [key for key in config_keys if not module_path(key).exists()]


def unnamed_perks(era: EraConfig, module_text: str) -> set[str]:
    return {name for name in granted_perk_names(era) if name not in module_text}


# 1. a module per era

@pytest.mark.parametrize("config_key", ERA_CONFIG_KEYS)
def test_every_era_in_the_registry_has_a_rules_module(config_key: str):
    assert not missing_modules([config_key]), (
        f"Era '{config_key}' is in _ERA_ATTRIBUTE_BY_CONFIG_KEY with no rules "
        f"module. Create tests/integration/eras/{module_path(config_key).name} "
        f"— see backend/eras/_template.py."
    )


def test_a_registry_key_with_no_module_is_caught():
    assert missing_modules(["era_1", "era_99"]) == ["era_99"]


# 2. every granted perk is named

@pytest.mark.parametrize("config_key", ERA_CONFIG_KEYS)
def test_every_perk_an_era_grants_is_named_in_its_module(config_key: str):
    era = era_config_for_key(config_key)
    path = module_path(config_key)
    text = path.read_text(encoding="utf-8") if path.exists() else ""

    assert not unnamed_perks(era, text), (
        f"Era '{config_key}' grants perks its rules module never names: "
        f"{sorted(unnamed_perks(era, text))}."
    )


def test_a_module_that_names_no_perk_is_caught():
    era_1 = era_config_for_key("era_1")
    assert unnamed_perks(era_1, "") == granted_perk_names(era_1)
    assert granted_perk_names(era_1), "Era 1 grants perks; the walk found none"


def test_the_guard_tells_the_two_eras_apart():
    """A rule can lose its subject at a rollover."""
    era_1 = granted_perk_names(era_config_for_key("era_1"))
    era_2 = granted_perk_names(era_config_for_key("era_2"))

    assert "habit_bonus_points" in era_1 and "habit_bonus_points" not in era_2
    assert "collab_own_modifier" in era_1 and "collab_own_modifier" not in era_2
    assert "other_task_modifier" in era_2 and "other_task_modifier" not in era_1
    assert "level_jump_reach" in era_1 and "level_jump_reach" in era_2


def test_every_perk_axis_has_a_baseline():
    for name in PERK_FIELDS:
        assert name in _FACTION_FIELD_DEFAULTS, f"{name} is not a FactionConfig field"
        if _FACTION_FIELD_DEFAULTS[name] is dataclasses.MISSING:
            assert name in _UNDEFAULTED_BASELINES, (
                f"'{name}' is a perk axis with no dataclass default. Add its "
                f"'nobody holds it' value to _UNDEFAULTED_BASELINES."
            )


def test_every_era_frozenset_is_classified():
    """``_ERA_PERK_FROZENSETS`` is hand-kept, so guard it against rot."""
    for field in dataclasses.fields(EraConfig):
        if field.type is not frozenset:
            continue
        assert (
            field.name in _ERA_PERK_FROZENSETS
            or field.name in _NON_PERK_FROZENSETS
        ), (
            f"'{field.name}' is a frozenset on EraConfig that no list claims. "
            f"If some faction holding it is a perk, add it to "
            f"_ERA_PERK_FROZENSETS so the coverage guard walks it; if it is "
            f"not a perk, add it to _NON_PERK_FROZENSETS to say so."
        )
