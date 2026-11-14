import dataclasses

import pytest

from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import (
    _ERA_ATTRIBUTE_BY_CONFIG_KEY,
    COMPILE_TIME_ERA_CONFIG_KEY,
    CURRENT_ERA,
    ERA_1,
    ERA_2,
    EraConfig,
    era_config_for_key,
)


def test_era1_is_named_renaissance():
    """#1620: the one literal pin; every surface asserts against ``.name``."""
    assert ERA_1.name == "Renaissance"


def test_level_thresholds_start_at_zero():
    assert ERA_1.level_thresholds[0] == 0


def test_level_thresholds_strictly_increasing():
    thresholds = ERA_1.level_thresholds
    for index in range(1, len(thresholds)):
        assert thresholds[index] > thresholds[index - 1], (
            f"Threshold at index {index} ({thresholds[index]}) must be > index {index - 1} ({thresholds[index - 1]})"
        )


def test_faction_slugs_match_keys():
    for slug, faction in ERA_1.factions.items():
        assert faction.slug == slug, f"Faction key '{slug}' doesn't match slug '{faction.slug}'"


def test_all_factions_have_valid_task_modifiers():
    for slug, faction in ERA_1.factions.items():
        assert 0 < faction.own_task_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range own_task_modifier: {faction.own_task_modifier}"
        )
        assert 0 < faction.other_task_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range other_task_modifier: {faction.other_task_modifier}"
        )
        assert 0 < faction.collab_own_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range collab_own_modifier: {faction.collab_own_modifier}"
        )
        assert 0 < faction.collab_other_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range collab_other_modifier: {faction.collab_other_modifier}"
        )


def test_all_factions_have_valid_duel_modifiers():
    for slug, faction in ERA_1.factions.items():
        assert 0.0 <= faction.duel_win_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range duel_win_modifier: {faction.duel_win_modifier}"
        )
        assert 0.0 <= faction.duel_loss_modifier <= 2.0, (
            f"Faction '{slug}' has out-of-range duel_loss_modifier: {faction.duel_loss_modifier}"
        )


def test_can_always_rejoin_factions():
    assert ERA_1.factions["albescent"].can_always_rejoin is True
    assert ERA_1.factions["snide"].can_always_rejoin is False
    assert ERA_1.factions["wow"].can_always_rejoin is False


def test_ua_faction_exists():
    assert "ua" in ERA_1.factions


def test_aged_out_faction_removed():
    # ADR-0030 / #428
    assert "aged_out" not in ERA_1.factions


# Starting faction (#1559)


def test_starting_faction_slug_defaults_to_unaffiliated():
    """The one place the literal is pinned; elsewhere read
    ``era.starting_faction_slug`` (ADR-0019/ADR-0030)."""
    field = next(
        f for f in dataclasses.fields(EraConfig) if f.name == "starting_faction_slug"
    )
    assert field.default == UNAFFILIATED_FACTION_SLUG


def test_vote_budget_base_positive():
    assert ERA_1.vote_budget_base > 0


def test_vote_budget_multiplier_positive():
    assert ERA_1.vote_budget_multiplier > 0


def test_max_task_signups_positive():
    assert ERA_1.max_task_signups > 0


def test_reset_all_time_score_is_false():
    assert ERA_1.reset_all_time_score is False


# Task definitions


def test_era1_ships_no_config_tasks():
    """#1398: ``sync_era_tasks`` runs every deploy, so a config task would
    resurrect after an admin deletes it from the board."""
    assert ERA_1.tasks == ()


# Level profiles carry copy keys, not prose (ADR-0031)


def test_era1_level_profiles_use_slug_keys():
    for level, profile in enumerate(ERA_1.level_profiles):
        if level == 0:
            assert profile.rank_key == ""
            continue
        assert profile.rank_key and profile.rank_key.islower()
        assert " " not in profile.rank_key
        for unlock in profile.unlocks:
            assert unlock.key and unlock.key.islower()
            assert " " not in unlock.key


# Era 2: Metamorphosis, authored but not activated (#1618)


def test_era_2_is_authored_not_activated():
    """The live era is a DB question (ADR-0091). ``CURRENT_ERA is ERA_1`` is
    false by design: it is a distinct instance refreshed in place."""
    assert ERA_2.name == "Metamorphosis"
    assert ERA_2.config_key == "era_2"
    assert COMPILE_TIME_ERA_CONFIG_KEY == "era_1"
    assert CURRENT_ERA == ERA_1, "Metamorphosis is authored, not activated"
    assert era_config_for_key("era_2") is ERA_2
    assert CURRENT_ERA.config_key == "era_1"


def test_era_2_roster_is_five_factions_and_no_ua():
    """No UA is deliberate: reset_faction sweeps to `na`."""
    assert set(ERA_2.factions) == {"na", "snide", "wow", "everymen", "albescent"}
    assert ERA_2.starting_faction_slug in ERA_2.factions
    assert ERA_2.reset_faction is True


def test_era_2_own_other_split_applies_to_every_faction():
    for slug, faction in ERA_2.factions.items():
        assert faction.own_task_modifier == 1.2, slug
        assert faction.other_task_modifier == 0.8, slug


def test_era_2_collab_modifiers_stay_flat():
    """Owner ruling (#1618): 120/80 is solo and duel only; collab is never
    penalised. Fails the "make these consistent" cleanup."""
    for slug, faction in ERA_2.factions.items():
        assert faction.collab_own_modifier == 1.0, slug
        assert faction.collab_other_modifier == 1.0, slug


def test_era_2_carries_era_1_faction_abilities_across():
    assert ERA_2.factions["snide"].duel_win_modifier == ERA_1.factions["snide"].duel_win_modifier
    assert ERA_2.factions["snide"].duel_loss_modifier == ERA_1.factions["snide"].duel_loss_modifier
    assert ERA_2.factions["wow"].level_jump_reach == ERA_1.factions["wow"].level_jump_reach
    assert ERA_2.factions["everymen"].can_hold_multiple_memberships is True
    assert ERA_2.factions["albescent"].can_always_rejoin is True


def test_era_2_ships_no_config_tasks():
    """See test_era1_ships_no_config_tasks."""
    assert ERA_2.tasks == ()


def test_era_2_inherits_every_other_rule_from_era_1():
    """Whole-dataclass compare so a later field cannot diverge unnoticed."""
    diverged = {
        field.name
        for field in dataclasses.fields(EraConfig)
        if getattr(ERA_1, field.name) != getattr(ERA_2, field.name)
    }
    assert diverged == {
        "name",
        "config_key",
        "factions",
        # Metamorphosis has no Ephemerists, so this set is empty.
        "allow_praxis_on_retired_task_factions",
    }


def test_era_2_albescent_gate_is_inherited_knowingly():
    """Coverage (``_account_covers_every_faction``) is far cheaper here:
    three non-sentinel factions vs seven. Accepted (#1618)."""
    assert ERA_2.albescent_level_required == ERA_1.albescent_level_required
    sentinels = {"na", "albescent"}
    assert len(set(ERA_2.factions) - sentinels) == 3
    assert len(set(ERA_1.factions) - sentinels) == 7


# config_key -> EraConfig registry (#1623)


def test_registry_resolves_each_key_to_its_own_config():
    assert era_config_for_key("era_1") is ERA_1
    assert era_config_for_key("era_2") is ERA_2


def test_registry_keys_agree_with_the_configs_they_name():
    """The registry restates keys as strings to avoid eager era imports."""
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        assert era_config_for_key(config_key).config_key == config_key


def test_registry_returns_none_for_an_unknown_key():
    """Deleted era file or newer row; the caller owns the fallback."""
    assert era_config_for_key("era_99") is None
    assert era_config_for_key("") is None


# Structural faction slugs (ADR-0087): ``EraConfig.__post_init__`` makes a
# malformed era fail at import, not as a nameless FK violation later.


def test_every_registered_era_carries_the_structural_slugs():
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        era = era_config_for_key(config_key)
        assert UNAFFILIATED_FACTION_SLUG in era.factions, config_key
        assert ALBESCENT_FACTION_SLUG in era.factions, config_key


def test_every_registered_era_pins_the_two_na_fields():
    """ADR-0087 amends ADR-0042 for these two fields only."""
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        era = era_config_for_key(config_key)
        assert era.starting_faction_slug == UNAFFILIATED_FACTION_SLUG, config_key
        assert era.reset_faction_slug == UNAFFILIATED_FACTION_SLUG, config_key


def test_an_era_that_drops_na_will_not_construct():
    without_na = {
        slug: faction
        for slug, faction in ERA_1.factions.items()
        if slug != UNAFFILIATED_FACTION_SLUG
    }
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, factions=without_na)


def test_an_era_that_drops_albescent_will_not_construct():
    """Its gate stays era-tunable; only its presence is required."""
    without_albescent = {
        slug: faction
        for slug, faction in ERA_1.factions.items()
        if slug != ALBESCENT_FACTION_SLUG
    }
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, factions=without_albescent)


def test_an_era_that_moves_the_starting_faction_will_not_construct():
    """The field stays so an author who tries gets the ruling back."""
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, starting_faction_slug="ua")


def test_an_era_that_moves_the_reset_faction_will_not_construct():
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, reset_faction_slug="ua")
