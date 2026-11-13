"""services.level_jump (#811), pure. Spending: integration/test_level_jump_signup.py."""
from dataclasses import replace

import pytest

from game_config import ERA_1
from services.level_jump import (
    available_level_reach,
    faction_level_jump_reach,
    is_level_jump_available,
)


def test_wow_grants_reach_of_one() -> None:
    assert faction_level_jump_reach("wow", ERA_1) == 1


def test_albescent_grants_the_same_reach_it_inherited_from_wow() -> None:
    """#1871: inherited, so compared against WOW rather than ``1``."""
    assert faction_level_jump_reach("albescent", ERA_1) == faction_level_jump_reach(
        "wow", ERA_1
    )


@pytest.mark.parametrize(
    "slug", ["ua", "snide", "coven", "ephemerists", "everymen", "singularity", "na"],
)
def test_every_other_faction_grants_nothing(slug: str) -> None:
    assert faction_level_jump_reach(slug, ERA_1) == 0


def test_unaffiliated_none_slug_grants_nothing() -> None:
    assert faction_level_jump_reach(None, ERA_1) == 0


def test_slug_absent_from_the_era_grants_nothing() -> None:
    # A previous era's slug degrades to "no ability", not a raise.
    assert faction_level_jump_reach("ua_masters", ERA_1) == 0


def test_reach_is_read_from_the_era_argument_not_the_slug() -> None:
    flat_wow = replace(ERA_1.factions["wow"], level_jump_reach=0)
    generous_ua = replace(ERA_1.factions["ua"], level_jump_reach=2)
    other_era = replace(
        ERA_1, factions={**ERA_1.factions, "wow": flat_wow, "ua": generous_ua}
    )
    assert faction_level_jump_reach("wow", other_era) == 0
    assert faction_level_jump_reach("ua", other_era) == 2


def test_never_spent_is_available() -> None:
    assert is_level_jump_available(3, None) is True


def test_spent_at_this_level_is_unavailable() -> None:
    assert is_level_jump_available(3, 3) is False


def test_spent_at_a_lower_level_is_available_again() -> None:
    # The "no reset job" trick: levelling up changes the left side.
    assert is_level_jump_available(4, 3) is True


def test_level_zero_is_a_real_level_that_can_be_spent_at() -> None:
    # NULL vs 0 is deliberate.
    assert is_level_jump_available(0, None) is True
    assert is_level_jump_available(0, 0) is False


def test_available_reach_for_unspent_wow() -> None:
    assert available_level_reach("wow", 3, None, ERA_1) == 1


def test_available_reach_is_zero_once_spent_at_this_level() -> None:
    assert available_level_reach("wow", 3, 3, ERA_1) == 0


def test_available_reach_returns_after_levelling_up() -> None:
    assert available_level_reach("wow", 4, 3, ERA_1) == 1


def test_available_reach_zero_for_a_faction_without_the_ability() -> None:
    assert available_level_reach("ua", 3, None, ERA_1) == 0


def test_a_spent_stamp_on_a_faction_without_the_ability_is_still_zero() -> None:
    # e.g. used the jump as wow, then defected.
    assert available_level_reach("ua", 4, 3, ERA_1) == 0
