import dataclasses

from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, ERA_1, EraConfig


def test_current_era_is_defined():
    assert CURRENT_ERA is not None
    assert CURRENT_ERA.config_key != ""


def test_era1_config_key():
    assert ERA_1.config_key == "era_1"


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
