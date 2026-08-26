"""Every era owns a rules module, and that module names the perks it grants (#2709).

**The seam is source text**, read against ``game_config``'s perk registries.
No database and no app: this is a repo guard of the same shape as
``test_adr_numbers_are_unique.py``, which is why it sits here rather than under
``tests/integration/``. The modules it polices are DB-backed and live in
``tests/integration/eras/`` so they inherit that package's fixtures.

Two rules, and no more:

1. **A module per era.** Every key in ``_ERA_ATTRIBUTE_BY_CONFIG_KEY`` has a
   ``tests/integration/eras/test_<config_key>_rules.py``. Authoring an era file
   is authoring a ruleset; a ruleset with no tests is the state Era 2 shipped in
   (#1618 granted four faction perks and not one of them was ever exercised).

2. **Every perk the era grants is named there.** Walk
   :data:`game_config._MAX_PERK_FIELDS`, :data:`game_config._ANY_PERK_FIELDS`
   and :data:`game_config._DUEL_PERK_FIELDS` — the registries #1871 built for
   Albescent's inheritance — plus the two perk frozensets ``EraConfig`` carries
   itself, and require the module to mention each axis some faction of that era
   actually deviates from the baseline on.

**The text match is crude and it is deliberate.** It checks that the perk is
*referenced*, not that the assertion beside it is any good — it is a guard, not
a proof. "You never mentioned ``level_jump_reach`` in Era 3's module" is worth
more than a check that cannot be written, and this repo already leans on
text-scanning guards elsewhere (the faction contrast gate scans ``index.css``
as text). Do not try to upgrade this into something cleverer.

The rule this exists to keep honest is the vacuous one: a guard whose subject
the next era deletes goes on passing while proving nothing. Era 1's
``habit_bonus_points`` is UA's alone and there is no UA in Era 2; Coven's 1.1
collab bonus was the only fraction in Era 1 for the half-up rounding to round.
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

#: Perk axes that live on ``EraConfig`` rather than on ``FactionConfig``.
#: #1871's real finding, quoted from ``game_config``: **perks live in TWO
#: places.** Task Vision is a frozenset of slugs, not a dataclass field, and a
#: guard covering only the fields would miss it exactly as the last audit did.
#: Held when the set is non-empty; Era 2's stays empty by design.
_ERA_PERK_FROZENSETS: tuple[str, ...] = (
    "allow_praxis_on_retired_task_factions",
    "allow_praxis_on_pending_task_factions",
)

#: "Nobody holds this" for the perk axes ``FactionConfig`` declares with no
#: dataclass default. These are not era rules and must never become a place to
#: keep one: 1.0 is the multiplicative identity and ``False`` is the absence of
#: a flag. Every other axis reads its own declared default, and
#: :func:`test_every_perk_axis_has_a_baseline` fails loudly if a new undefaulted
#: axis is added without a decision here.
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
    """Where the rules module for ``config_key`` must live."""
    return ERA_RULES_DIR / f"test_{config_key}_rules.py"


def _baseline(field_name: str) -> object:
    default = _FACTION_FIELD_DEFAULTS[field_name]
    if default is dataclasses.MISSING:
        return _UNDEFAULTED_BASELINES[field_name]
    return default


def granted_perk_names(era: EraConfig) -> set[str]:
    """The perk axes some faction of ``era`` actually deviates from baseline on.

    Read off the *resolved* ``era.factions``, so Albescent's inherited perks
    count as held — which changes no answer, since it can only ever mirror a
    perk another faction in the same era already declares.
    """
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
    """The era keys with no rules module on disk."""
    return [key for key in config_keys if not module_path(key).exists()]


def unnamed_perks(era: EraConfig, module_text: str) -> set[str]:
    """Perks ``era`` grants that ``module_text`` never mentions."""
    return {name for name in granted_perk_names(era) if name not in module_text}


# ---------------------------------------------------------------------------
# 1. a module per era
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("config_key", ERA_CONFIG_KEYS)
def test_every_era_in_the_registry_has_a_rules_module(config_key: str):
    assert not missing_modules([config_key]), (
        f"Era '{config_key}' is in _ERA_ATTRIBUTE_BY_CONFIG_KEY with no rules "
        f"module. Create tests/integration/eras/{module_path(config_key).name} "
        f"— see backend/eras/_template.py."
    )


def test_a_registry_key_with_no_module_is_caught():
    """The acceptance case: a new era file arriving without its module fails."""
    assert missing_modules(["era_1", "era_99"]) == ["era_99"]


# ---------------------------------------------------------------------------
# 2. every perk the era grants is named in its module
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("config_key", ERA_CONFIG_KEYS)
def test_every_perk_an_era_grants_is_named_in_its_module(config_key: str):
    era = era_config_for_key(config_key)
    path = module_path(config_key)
    # A missing module is the sibling test's failure, not a traceback here.
    text = path.read_text(encoding="utf-8") if path.exists() else ""

    assert not unnamed_perks(era, text), (
        f"Era '{config_key}' grants perks its rules module never names: "
        f"{sorted(unnamed_perks(era, text))}."
    )


def test_a_module_that_names_no_perk_is_caught():
    """The acceptance case: a perk granted but never referenced fails."""
    era_1 = era_config_for_key("era_1")
    assert unnamed_perks(era_1, "") == granted_perk_names(era_1)
    assert granted_perk_names(era_1), "Era 1 grants perks; the walk found none"


def test_the_guard_tells_the_two_eras_apart():
    """The vacuity this whole file exists for, in one assertion.

    A rule can lose its subject at a rollover. ``habit_bonus_points`` is UA's
    alone and Era 2 has no UA; the own/other split is Era 2's headline rule and
    Era 1 flattens both axes to 1.0 (#452). Neither era may be asked to cover
    the other's rules, and neither may be let off its own.
    """
    era_1 = granted_perk_names(era_config_for_key("era_1"))
    era_2 = granted_perk_names(era_config_for_key("era_2"))

    assert "habit_bonus_points" in era_1 and "habit_bonus_points" not in era_2
    assert "collab_own_modifier" in era_1 and "collab_own_modifier" not in era_2
    assert "other_task_modifier" in era_2 and "other_task_modifier" not in era_1
    # Held in both, and by the same faction in each: the rollover keeps it.
    assert "level_jump_reach" in era_1 and "level_jump_reach" in era_2


def test_every_perk_axis_has_a_baseline():
    """A perk axis added without a default needs a decision, not a guess."""
    for name in PERK_FIELDS:
        assert name in _FACTION_FIELD_DEFAULTS, f"{name} is not a FactionConfig field"
        if _FACTION_FIELD_DEFAULTS[name] is dataclasses.MISSING:
            assert name in _UNDEFAULTED_BASELINES, (
                f"'{name}' is a perk axis with no dataclass default. Add its "
                f"'nobody holds it' value to _UNDEFAULTED_BASELINES."
            )
