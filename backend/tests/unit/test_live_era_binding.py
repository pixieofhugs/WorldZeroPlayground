"""The live-era binding — ADR-0091, issue #827.

Seam under test: ``game_config.CURRENT_ERA`` as an *object identity* rather than
a name, and ``game_config.bind_live_era`` as the one lever that moves it.

Why the identity and not the name. 157 sites under ``backend/`` are written
``era: EraConfig = CURRENT_ERA``. A default argument is evaluated once, when the
``def`` executes — so the function holds the **object**, not the name, for the
life of the process. Four more sites read ``CURRENT_ERA`` as a module global
inside a function body, which is the importing module's global, not
``game_config``'s. Neither shape can be moved by assigning to
``game_config.CURRENT_ERA``: that rebinds one name in one module and every
holder keeps what it captured.

So the live era is one stable ``EraConfig`` instance whose *fields* are
refreshed in place. Every holder — default argument, module global, closure —
sees the new ruleset at once, and no call site changes. These tests are what
makes that claim checkable rather than asserted.
"""
import dataclasses
from pathlib import Path

import pytest

from game_config import (
    COMPILE_TIME_ERA_CONFIG_KEY,
    CURRENT_ERA,
    EraConfig,
    bind_live_era,
    era_config_for_key,
    registered_era_config_keys,
)

BACKEND_ROOT = Path(__file__).resolve().parents[2]


# A default argument bound at import time, exactly as the 157 real ones are.
# Module level on purpose: binding it inside a test would evaluate the default
# *after* a flip and prove nothing.
def _service_reading_the_default(era: EraConfig = CURRENT_ERA) -> str:
    return era.config_key


@pytest.fixture
def flip_to_era_2():
    """Point the live era at Era 2 for one test, then put it back."""
    bind_live_era(era_config_for_key("era_2"))
    yield
    bind_live_era(era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY))


def test_a_flip_reaches_a_default_argument_bound_at_import(flip_to_era_2):
    """THE defect. A name rebind cannot do this; an in-place refresh can."""
    assert _service_reading_the_default() == "era_2"


def test_the_default_is_back_on_era_1_outside_the_flip():
    assert _service_reading_the_default() == COMPILE_TIME_ERA_CONFIG_KEY


def test_a_flip_carries_the_whole_ruleset_not_just_the_key(flip_to_era_2):
    """Fields, not identity. Era 2 has a different roster and different modifiers."""
    era_2 = era_config_for_key("era_2")
    assert CURRENT_ERA.name == era_2.name
    assert set(CURRENT_ERA.factions) == set(era_2.factions)
    assert CURRENT_ERA.level_thresholds == era_2.level_thresholds
    assert CURRENT_ERA == era_2


def test_the_live_era_is_never_the_era_file_s_own_config():
    """``bind_live_era`` refreshes CURRENT_ERA in place. If CURRENT_ERA *were*
    ``ERA_1``, the first flip would overwrite the era file's config with Era 2's
    fields and Era 1 would cease to exist in the process."""
    for key in registered_era_config_keys():
        assert CURRENT_ERA is not era_config_for_key(key)


def test_a_flip_leaves_the_era_files_untouched(flip_to_era_2):
    assert era_config_for_key("era_1").config_key == "era_1"
    assert era_config_for_key("era_1").name != era_config_for_key("era_2").name


def test_resolving_a_past_era_does_not_move_the_live_one(flip_to_era_2):
    """#2708's hazard, re-pinned against the deliberate rebind (#827).

    ``services.activity_feed`` resolves a stored row's ``config_key`` to label a
    *past* era. Under the old shape that lookup rebound CURRENT_ERA as a side
    effect and undid the flip. Making the rebind deliberate must not fold the
    two paths back together.
    """
    era_config_for_key("era_1")
    assert CURRENT_ERA.config_key == "era_2"
    assert _service_reading_the_default() == "era_2"


def test_binding_the_live_era_to_itself_is_a_no_op():
    """The refresh clears and refills one ``__dict__``; aliasing would empty it."""
    bind_live_era(CURRENT_ERA)
    assert CURRENT_ERA.config_key == COMPILE_TIME_ERA_CONFIG_KEY
    assert CURRENT_ERA.factions


def test_the_live_era_is_still_a_real_era_config():
    """It has to survive everything an ``EraConfig`` is put through — the type
    annotation on 157 parameters, and ``dataclasses.replace`` in the tests that
    build variant rulesets."""
    assert isinstance(CURRENT_ERA, EraConfig)
    assert dataclasses.is_dataclass(CURRENT_ERA)
    variant = dataclasses.replace(CURRENT_ERA, max_task_signups=99)
    assert variant.max_task_signups == 99
    assert CURRENT_ERA.max_task_signups != 99


def test_registered_era_config_keys_is_ordered_and_resolvable():
    """The selector's option list. Order is authoring order, which is era order."""
    keys = registered_era_config_keys()
    assert keys == ("era_1", "era_2")
    for key in keys:
        assert era_config_for_key(key).config_key == key


def test_the_compile_time_fallback_is_a_registered_key():
    assert COMPILE_TIME_ERA_CONFIG_KEY in registered_era_config_keys()


# ---------------------------------------------------------------------------
# The guard the ruling asked for: exactly one site rebinds the live era
# ---------------------------------------------------------------------------


def test_only_services_era_rebinds_the_live_era():
    """"Exactly one site rebinds it, and a guard keeps it at one" (#827 ruling).

    ``bind_live_era`` is the primitive; ``services.era.rebind_live_era`` is the
    only thing in the shipped backend allowed to call it, because that is the
    one function that decides *which* era the database says is live. A second
    caller is how a process ends up half-flipped.
    """
    allowed = {"game_config.py", "services/era.py"}
    callers = set()
    for path in BACKEND_ROOT.rglob("*.py"):
        relative = path.relative_to(BACKEND_ROOT).as_posix()
        if relative.startswith((".venv/", "tests/", "scripts/")):
            continue
        if "bind_live_era(" in path.read_text(encoding="utf-8"):
            callers.add(relative)
    assert callers == allowed, (
        "A new site rebinds the live era. Route it through "
        "services.era.rebind_live_era instead — see ADR-0091."
    )
