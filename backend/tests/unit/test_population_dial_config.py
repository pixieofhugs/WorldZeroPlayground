"""Era-file validation of the population dials (#3656)."""

import dataclasses

import pytest

from game_config import (
    Dial,
    check_dials,
    era_config_for_key,
    registered_era_config_keys,
)

ERA_1 = era_config_for_key("era_1")


def test_era_1_declares_the_six_dials():
    assert set(ERA_1.dials) == {
        "praxis_post_cooldown",
        "vote_requires_received_vote",
        "comment_level",
        "duel_level",
        "invitation",
        "flag_level",
    }


@pytest.mark.parametrize("key", registered_era_config_keys())
def test_every_dial_side_builds_an_era_and_full_equals_the_fields(key):
    era = era_config_for_key(key)
    check_dials(era)
    for dial in era.dials.values():
        for side in (dial.small, dial.full):
            dataclasses.replace(era, dials={}, **side)
        for name, value in dial.full.items():
            assert getattr(era, name) == value


def test_a_full_side_that_disagrees_with_the_field_fails_at_import():
    bad = {
        "duel_level": Dial(
            small={"duel_level_required": 1},
            full={"duel_level_required": 9},
            default="small",
        )
    }
    with pytest.raises(ValueError, match="full side"):
        check_dials(dataclasses.replace(ERA_1, dials=bad))


def test_resolving_an_era_by_key_runs_the_dial_check(monkeypatch):
    import eras.era_1
    import game_config

    bad = Dial(
        small={"duel_level_required": 1},
        full={"duel_level_required": 9},
        default="small",
    )
    monkeypatch.setattr(
        eras.era_1, "ERA_1", dataclasses.replace(ERA_1, dials={"duel_level": bad})
    )
    monkeypatch.delitem(game_config.__dict__, "ERA_1", raising=False)
    with pytest.raises(ValueError, match="full side"):
        era_config_for_key("era_1")


def test_sides_must_cover_the_same_fields():
    bad = {"x": Dial(small={"duel_level_required": 1}, full={}, default="small")}
    with pytest.raises(ValueError, match="same fields"):
        check_dials(dataclasses.replace(ERA_1, dials=bad))


def test_a_dial_naming_no_field_fails():
    bad = {"x": Dial(small={"nope": 1}, full={"nope": 1}, default="small")}
    with pytest.raises(ValueError):
        check_dials(dataclasses.replace(ERA_1, dials=bad))
