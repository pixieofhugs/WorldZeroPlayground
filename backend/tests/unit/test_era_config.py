import dataclasses

import pytest

from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import (
    CURRENT_ERA,
    ERA_1,
    ERA_2,
    EraConfig,
    _ERA_ATTRIBUTE_BY_CONFIG_KEY,
    era_config_for_key,
)


def test_current_era_is_defined():
    assert CURRENT_ERA is not None
    assert CURRENT_ERA.config_key != ""


def test_era1_config_key():
    assert ERA_1.config_key == "era_1"


def test_era1_is_named_renaissance():
    """The live era's player-visible name (#1620).

    Pinned as a literal on purpose: every surface that shows it — the character
    card's era stat, GET /game-config, the era announcement — asserts against
    ``.name`` rather than prose, so without this one assertion the rename has no
    test that can fail.
    """
    assert ERA_1.name == "Renaissance"


def test_level_thresholds_count():
    # Levels 0–8 = 9 entries
    assert len(ERA_1.level_thresholds) == 9


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
    # ADR-0030 / #428: the vestigial aged_out placeholder is retired.
    assert "aged_out" not in ERA_1.factions


def test_albescent_faction_exists():
    assert "albescent" in ERA_1.factions


# ---------------------------------------------------------------------------
# Starting faction (#1559)
# ---------------------------------------------------------------------------


def test_starting_faction_slug_defaults_to_unaffiliated():
    """The site-wide invariant lives on the dataclass default (ADR-0019/ADR-0030).

    #1559 opened ADR-0042's seam — an era may pre-sort its players — *without*
    making every era restate the obvious. This is the one place the literal is
    pinned; every other assertion in the suite reads ``era.starting_faction_slug``
    so a future era that overrides it does not have to rewrite them.
    """
    field = next(
        f for f in dataclasses.fields(EraConfig) if f.name == "starting_faction_slug"
    )
    assert field.default == UNAFFILIATED_FACTION_SLUG


def test_era_1_inherits_the_unaffiliated_start():
    """Era 1 declares nothing, so it must land on the dataclass default."""
    assert ERA_1.starting_faction_slug == UNAFFILIATED_FACTION_SLUG


def test_starting_faction_is_a_faction_the_era_configures():
    """An era cannot be born into a faction it does not define.

    ``character.faction_slug`` is an FK onto a seeded ``Faction`` row, and
    ``seed.py`` seeds exactly the era's factions — so an override naming an
    unknown slug would fail at insert time on a fresh database.
    """
    assert ERA_1.starting_faction_slug in ERA_1.factions


def test_vote_budget_base_positive():
    assert ERA_1.vote_budget_base > 0


def test_vote_budget_multiplier_positive():
    assert ERA_1.vote_budget_multiplier > 0


def test_max_task_signups_positive():
    assert ERA_1.max_task_signups > 0


def test_reset_all_time_score_is_false():
    # Per spec: reset_all_time_score is almost always False
    assert ERA_1.reset_all_time_score is False


# ---------------------------------------------------------------------------
# Task definitions
# ---------------------------------------------------------------------------


def test_era1_ships_no_config_tasks():
    """Era 1's board is authored in the admin UI, not in the era config (#1398).

    This is a guard, not a formality. ``seed.py::sync_era_tasks`` re-adds every
    config task missing from the database, and ``start.sh`` runs the seeder on
    every production deploy — so a ``TaskDef`` restored to this tuple would
    resurrect itself the deploy after an admin deleted it from the board. The
    field itself is not going away: a future era may well ship a fixed roster.
    """
    assert ERA_1.tasks == ()


def test_era1_config_has_no_level_zero_tasks():
    """#511: level 0 is reserved for the single game-wide onboarding task, which
    is seeded in seed.py (not era config). No era-config task may be level 0.

    Vacuous while ``ERA_1.tasks`` is empty, and kept for the era that isn't.
    """
    level_zero = [task for task in ERA_1.tasks if task.level_required == 0]
    assert level_zero == [], (
        f"Era config must have no level-0 tasks (#511); found: "
        f"{[task.title for task in level_zero]}"
    )


def test_era1_task_faction_slugs_valid():
    for task_def in ERA_1.tasks:
        assert task_def.faction_slug in ERA_1.factions, (
            f"Task '{task_def.title}' references unknown faction '{task_def.faction_slug}'"
        )


def test_era1_task_level_requirements_positive():
    for task_def in ERA_1.tasks:
        assert task_def.level_required >= 0, (
            f"Task '{task_def.title}' has negative level_required"
        )


def test_era1_task_point_values_positive():
    for task_def in ERA_1.tasks:
        assert task_def.point_value > 0, (
            f"Task '{task_def.title}' has non-positive point_value"
        )


# ---------------------------------------------------------------------------
# Level profiles carry copy KEYS, not prose (ADR-0031)
# ---------------------------------------------------------------------------


def test_era1_level_profiles_use_slug_keys():
    """Every non-start rank_key / unlock key is a lowercase semantic slug, not
    prose (no spaces, no uppercase)."""
    for level, profile in enumerate(ERA_1.level_profiles):
        if level == 0:
            assert profile.rank_key == ""
            continue
        assert profile.rank_key and profile.rank_key.islower()
        assert " " not in profile.rank_key
        for unlock in profile.unlocks:
            assert unlock.key and unlock.key.islower()
            assert " " not in unlock.key


# ---------------------------------------------------------------------------
# Era 2 — Metamorphosis, authored but not activated (#1618)
# ---------------------------------------------------------------------------


def test_era_2_is_authored_not_activated():
    assert ERA_2.name == "Metamorphosis"
    assert ERA_2.config_key == "era_2"
    assert CURRENT_ERA is ERA_1, "Metamorphosis is authored, not activated"


def test_era_2_roster_is_five_factions_and_no_ua():
    """No UA is deliberate. Nobody is stranded: reset_faction sweeps to `na`."""
    assert set(ERA_2.factions) == {"na", "snide", "wow", "everymen", "albescent"}
    assert ERA_2.starting_faction_slug in ERA_2.factions
    assert ERA_2.reset_faction is True


def test_era_2_own_other_split_applies_to_every_faction():
    for slug, faction in ERA_2.factions.items():
        assert faction.own_task_modifier == 1.2, slug
        assert faction.other_task_modifier == 0.8, slug


def test_era_2_collab_modifiers_stay_flat():
    """The asymmetry is the owner ruling, not an oversight (#1618).

    A collaboration on your own faction's task must not be worth less than doing
    it alone, and cross-faction collaboration is not something this game
    penalises — so the 120/80 rule is solo and duel only. This test exists to
    fail the "make these consistent" cleanup.
    """
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
    """Same reason as Era 1's empty roster: a config task resurrects itself on
    the next deploy after an admin deletes it."""
    assert ERA_2.tasks == ()


def test_era_2_inherits_every_other_rule_from_era_1():
    """The own/other split and the roster are the ONLY things Metamorphosis
    re-tunes. Compare the whole dataclass rather than a hand-listed subset, so a
    field added later cannot silently diverge unnoticed."""
    diverged = {
        field.name
        for field in dataclasses.fields(EraConfig)
        if getattr(ERA_1, field.name) != getattr(ERA_2, field.name)
    }
    assert diverged == {
        "name",
        "config_key",
        "factions",
        # Era 1 grants Ephemerists the retired-task perk; Metamorphosis has no
        # Ephemerists, so the set is empty rather than differently populated.
        "allow_praxis_on_retired_task_factions",
    }


def test_era_2_albescent_gate_is_inherited_knowingly():
    """The level half is Era 1's, but the coverage half is far cheaper here.

    ``services.character._account_covers_every_faction`` requires a submitted
    praxis for every NON-SENTINEL faction in the era — seven in Era 1, three
    here. Accepted deliberately (#1618); asserted so the difference is visible
    rather than rediscovered as a bug.
    """
    assert ERA_2.albescent_level_required == ERA_1.albescent_level_required
    sentinels = {"na", "albescent"}
    assert len(set(ERA_2.factions) - sentinels) == 3
    assert len(set(ERA_1.factions) - sentinels) == 7


# ---------------------------------------------------------------------------
# config_key -> EraConfig registry (#1623)
# ---------------------------------------------------------------------------


def test_registry_resolves_each_key_to_its_own_config():
    assert era_config_for_key("era_1") is ERA_1
    assert era_config_for_key("era_2") is ERA_2


def test_registry_keys_agree_with_the_configs_they_name():
    """The registry restates each config_key as a string so the era files are
    not all imported at module load. This is the guard on that duplication."""
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        assert era_config_for_key(config_key).config_key == config_key


def test_registry_returns_none_for_an_unknown_key():
    """A deleted era file, or a row from a newer version. The caller owns the
    fallback — the era announcement uses the name stored on the row."""
    assert era_config_for_key("era_99") is None
    assert era_config_for_key("") is None


# ---------------------------------------------------------------------------
# Structural faction slugs (ADR-0087 / #2707)
# ---------------------------------------------------------------------------
#
# Seam under test: ``EraConfig.__post_init__`` — the one construction-time gate
# every era file and every ``dataclasses.replace`` passes through, which is why
# a malformed era fails at IMPORT rather than at the first character creation
# (an FK violation naming nothing). ``na`` and ``albescent`` are the two slugs
# whose roles the game cannot run without; every OTHER faction stays the era's
# own choice, and Albescent's GATE stays era-tunable.


def test_every_registered_era_carries_the_structural_slugs():
    """Not just Era 1 and Era 2 by name — whatever the registry lists."""
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        era = era_config_for_key(config_key)
        assert UNAFFILIATED_FACTION_SLUG in era.factions, config_key
        assert ALBESCENT_FACTION_SLUG in era.factions, config_key


def test_every_registered_era_pins_the_two_na_fields():
    """ADR-0087 amends ADR-0042's "the era doc wins" for these two fields only."""
    for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY:
        era = era_config_for_key(config_key)
        assert era.starting_faction_slug == UNAFFILIATED_FACTION_SLUG, config_key
        assert era.reset_faction_slug == UNAFFILIATED_FACTION_SLUG, config_key


def test_an_era_that_drops_na_will_not_construct():
    """`na` is the FK target for the born-unaffiliated state and for
    cross-faction tasks. Dropping it used to be a config an era could write."""
    without_na = {
        slug: faction
        for slug, faction in ERA_1.factions.items()
        if slug != UNAFFILIATED_FACTION_SLUG
    }
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, factions=without_na)


def test_an_era_that_drops_albescent_will_not_construct():
    """The endgame faction exists in every era. Its GATE is still era-tunable —
    ``albescent_level_required`` and the coverage rule are ordinary era fields,
    and nothing here constrains them."""
    without_albescent = {
        slug: faction
        for slug, faction in ERA_1.factions.items()
        if slug != ALBESCENT_FACTION_SLUG
    }
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, factions=without_albescent)


def test_an_era_that_moves_the_starting_faction_will_not_construct():
    """#1559 opened this seam; ADR-0087 closes it. The field STAYS so the
    author who tries gets the ruling read back to them."""
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, starting_faction_slug="ua")


def test_an_era_that_moves_the_reset_faction_will_not_construct():
    """#1580's half of the same seam."""
    with pytest.raises(ValueError, match="ADR-0087"):
        dataclasses.replace(ERA_1, reset_faction_slug="ua")
