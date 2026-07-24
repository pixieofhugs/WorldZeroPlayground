from game_config import CURRENT_ERA, ERA_1


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


def test_era1_has_tasks():
    assert len(ERA_1.tasks) > 0


def test_era1_task_count():
    # 45 pre-#904 (46 minus snide's removed L0 "FLIP THE SYSTEM", #511) + 14 new
    # faction tasks (#904: coven 6, snide 4, singularity 2, ephemerists 1,
    # everymen 1).
    assert len(ERA_1.tasks) == 59


def test_era1_config_has_no_level_zero_tasks():
    """#511: level 0 is reserved for the single game-wide onboarding task, which
    is seeded in seed.py (not era config). No era-config task may be level 0."""
    level_zero = [task for task in ERA_1.tasks if task.level_required == 0]
    assert level_zero == [], (
        f"Era config must have no level-0 tasks (#511); found: "
        f"{[task.title for task in level_zero]}"
    )


def test_era1_every_faction_except_albescent_has_six_tasks_in_levels_one_to_seven():
    """#904: every faction with roster content reaches >=6 tasks in levels 1-7.

    Albescent stays at 1 by design (it hides — ADR-0048). na is a system
    faction with no roster content. WOW/UA already qualify and are untouched.
    """
    exempt = {"albescent", "na"}
    counts: dict[str, int] = {}
    for task in ERA_1.tasks:
        if 1 <= task.level_required <= 7:
            counts[task.faction_slug] = counts.get(task.faction_slug, 0) + 1
    for slug in ERA_1.factions:
        if slug in exempt:
            continue
        assert counts.get(slug, 0) >= 6, (
            f"Faction '{slug}' has {counts.get(slug, 0)} tasks in levels 1-7; "
            f"needs >=6 (#904)"
        )


def test_era1_new_faction_tasks_follow_the_point_ramp():
    """#904: L1->5, L2->10, L3->25, L4->50, L5->75, L6->100, L7->500."""
    ramp = {1: 5, 2: 10, 3: 25, 4: 50, 5: 75, 6: 100, 7: 500}
    new_titles = {
        "A Light Left On", "Mend, Don't End", "The Comfort Bake",
        "Gather the Weird Ones", "A Room That Holds You",
        "Keep a Light On All Year", "Ruin a Perfectly Good Thing",
        "Steelman Your Enemy", "Unsanctioned Maintenance",
        "Organize the Ungovernable", "Sort Your Life",
        "The Map Is the Territory", "Archive of a Single Hour", "The Commons",
    }
    seen = set()
    for task in ERA_1.tasks:
        if task.title in new_titles:
            seen.add(task.title)
            assert task.point_value == ramp[task.level_required], (
                f"Task '{task.title}' (L{task.level_required}) should be worth "
                f"{ramp[task.level_required]}, got {task.point_value}"
            )
    assert seen == new_titles, f"Missing #904 tasks: {new_titles - seen}"


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
