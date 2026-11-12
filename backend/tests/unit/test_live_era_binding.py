"""The live-era binding (ADR-0091, #827).

``CURRENT_ERA`` is one stable object refreshed in place by ``bind_live_era``:
default arguments and imported globals hold the *object*, so rebinding the name
would leave every holder on the old era.
"""
import dataclasses
import re
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


# Module level on purpose: the default must bind before any flip.
def _service_reading_the_default(era: EraConfig = CURRENT_ERA) -> str:
    return era.config_key


@pytest.fixture
def flip_to_era_2():
    bind_live_era(era_config_for_key("era_2"))
    yield
    bind_live_era(era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY))


def test_a_flip_reaches_a_default_argument_bound_at_import(flip_to_era_2):
    assert _service_reading_the_default() == "era_2"


def test_the_default_is_back_on_era_1_outside_the_flip():
    assert _service_reading_the_default() == COMPILE_TIME_ERA_CONFIG_KEY


def test_a_flip_carries_the_whole_ruleset_not_just_the_key(flip_to_era_2):
    era_2 = era_config_for_key("era_2")
    assert CURRENT_ERA.name == era_2.name
    assert set(CURRENT_ERA.factions) == set(era_2.factions)
    assert CURRENT_ERA.level_thresholds == era_2.level_thresholds
    assert CURRENT_ERA == era_2


def test_the_live_era_is_never_the_era_file_s_own_config():
    """Else the first flip would overwrite ERA_1 itself with Era 2's fields."""
    for key in registered_era_config_keys():
        assert CURRENT_ERA is not era_config_for_key(key)


def test_a_flip_leaves_the_era_files_untouched(flip_to_era_2):
    assert era_config_for_key("era_1").config_key == "era_1"
    assert era_config_for_key("era_1").name != era_config_for_key("era_2").name


def test_resolving_a_past_era_does_not_move_the_live_one(flip_to_era_2):
    """#2708: labelling a past era (``activity_feed``) must not rebind."""
    era_config_for_key("era_1")
    assert CURRENT_ERA.config_key == "era_2"
    assert _service_reading_the_default() == "era_2"


def test_binding_the_live_era_to_itself_is_a_no_op():
    bind_live_era(CURRENT_ERA)
    assert CURRENT_ERA.config_key == COMPILE_TIME_ERA_CONFIG_KEY
    assert CURRENT_ERA.factions


# The refresh is a per-key overwrite, never clear()-then-fill: FastAPI's
# threadpool can read the object mid-bind and would hit AttributeError.


def test_a_bind_leaves_the_complete_field_set(flip_to_era_2):
    era_2 = era_config_for_key("era_2")
    assert set(CURRENT_ERA.__dict__) == set(era_2.__dict__)
    assert {field.name for field in dataclasses.fields(EraConfig)} <= set(
        CURRENT_ERA.__dict__
    )


def test_a_bind_never_reduces_the_key_count():
    before = set(CURRENT_ERA.__dict__)
    for key in registered_era_config_keys():
        bind_live_era(era_config_for_key(key))
        assert set(CURRENT_ERA.__dict__) == before, key
    bind_live_era(era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY))


def test_the_refresh_overwrites_keys_rather_than_emptying_the_object():
    """Swaps in a dict that records deletions while a real flip runs."""
    deletions = []

    class WatchedDict(dict):
        def __delitem__(self, key):
            deletions.append(key)
            super().__delitem__(key)

        def clear(self):
            deletions.append("<clear>")
            super().clear()

    live = CURRENT_ERA
    original = live.__dict__
    object.__setattr__(live, "__dict__", WatchedDict(original))
    try:
        bind_live_era(era_config_for_key("era_2"))
        assert live.config_key == "era_2", "the flip still has to happen"
        assert deletions == [], f"the refresh removed keys: {deletions}"
        assert set(live.__dict__) == set(original)
    finally:
        object.__setattr__(live, "__dict__", dict(original))


def test_the_live_era_is_still_a_real_era_config():
    assert isinstance(CURRENT_ERA, EraConfig)
    assert dataclasses.is_dataclass(CURRENT_ERA)
    variant = dataclasses.replace(CURRENT_ERA, max_task_signups=99)
    assert variant.max_task_signups == 99
    assert CURRENT_ERA.max_task_signups != 99


def test_registered_era_config_keys_is_ordered_and_resolvable():
    """The selector's option list, in era order."""
    keys = registered_era_config_keys()
    assert keys == ("era_1", "era_2")
    for key in keys:
        assert era_config_for_key(key).config_key == key


def test_the_compile_time_fallback_is_a_registered_key():
    assert COMPILE_TIME_ERA_CONFIG_KEY in registered_era_config_keys()


# ``commit_and_bind_live_era`` binds AFTER the commit, never before.


class _RecordingSession:

    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.commits = 0
        self.live_era_at_commit: str | None = None

    async def commit(self) -> None:
        self.commits += 1
        self.live_era_at_commit = CURRENT_ERA.config_key
        if self.fail:
            raise RuntimeError("commit failed")


async def test_a_failed_commit_leaves_the_live_era_where_it_was():
    """Else the process plays by rules no ``Era`` row records (#3013)."""
    from services.era import commit_and_bind_live_era

    before = CURRENT_ERA.config_key
    session = _RecordingSession(fail=True)

    with pytest.raises(RuntimeError):
        await commit_and_bind_live_era(session, era_config_for_key("era_2"))

    assert CURRENT_ERA.config_key == before
    assert _service_reading_the_default() == before


async def test_the_bind_happens_after_a_successful_commit():
    from services.era import commit_and_bind_live_era

    session = _RecordingSession()
    try:
        bound = await commit_and_bind_live_era(session, era_config_for_key("era_2"))

        assert session.commits == 1
        assert session.live_era_at_commit == COMPILE_TIME_ERA_CONFIG_KEY, (
            "the live era moved before the write was durable"
        )
        assert bound.config_key == "era_2"
        assert CURRENT_ERA.config_key == "era_2"
        assert _service_reading_the_default() == "era_2"
    finally:
        bind_live_era(era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY))


async def test_apply_era_reset_does_not_bind_anything_itself():
    """It only flushes, so nothing is durable yet. Greps: calling it needs a DB."""
    source = (BACKEND_ROOT / "services" / "era.py").read_text(encoding="utf-8")
    body = source[source.index("async def apply_era_reset("):]
    assert "bind_live_era(" not in body, (
        "apply_era_reset must not move the live era — it has not committed yet. "
        "The caller binds through commit_and_bind_live_era."
    )


def test_only_services_era_rebinds_the_live_era():
    """#827 ruling: exactly one site rebinds it, ``scripts/`` included (era_reset
    rolls prod). Anywhere else a process ends up half-flipped or ahead of its DB.
    """
    # \b so the `rebind_live_era(` wrapper is not counted.
    call = re.compile(r"\bbind_live_era\(")
    allowed = {"game_config.py", "services/era.py"}
    callers = set()
    for path in BACKEND_ROOT.rglob("*.py"):
        relative = path.relative_to(BACKEND_ROOT).as_posix()
        # `tests/` flip the era on purpose.
        if relative.startswith((".venv/", "tests/")):
            continue
        if call.search(path.read_text(encoding="utf-8")):
            callers.add(relative)
    assert callers == allowed, (
        "A new site rebinds the live era. Route it through "
        "services.era.rebind_live_era instead — see ADR-0091."
    )
