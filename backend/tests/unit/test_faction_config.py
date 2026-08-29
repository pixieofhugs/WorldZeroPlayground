"""Unit tests for faction configuration values and modifier semantics.

**These values are advertised to players.** Every perk pinned here is stated in
words in ``frontend/src/locales/en/factions.json`` — ``{F}.invitation.perks[1]``
(``albescent.letter.perks.duties`` for Albescent, which uses a named object
rather than an array) and ``descriptions.{F}``. #1874 rewrote that copy to state
each faction's real mechanic, so a value moving here without the sentence moving
too leaves the game advertising something it no longer does.

If a test in this file fails, the fix is not just the config: go read the copy
the number is quoted in and move it in the same change.

This file is deliberately backend-only. It does NOT assert a mapping from copy
string to config field — that would write each rule down a *third* time, which
is the drift that produced Coven's and Albescent's since-corrected false claims
(#1874). It pins the values; the docstring routes the reader to the words.
"""

from dataclasses import replace

from game_config import _ANY_PERK_FIELDS, ERA_1
from services.signup_eligibility import multi_membership_faction_slugs

# Albescent holds every other faction's perk (#1871), so "only faction X has
# perk P" is now a claim about the factions that DECLARE P. Read the inheritors
# off the config rather than naming a slug, so moving the charter moves these
# tests with it.
INHERITORS = {
    slug for slug, config in ERA_1.factions.items() if config.inherits_faction_perks
}


def test_wow_modifiers_are_flat():
    # #811: WOW's perk is the level jump, not a multiplier. Its former +10%
    # own/collab pair moved to Cozy Coven, leaving every modifier at baseline.
    config = ERA_1.factions["wow"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_wow_level_jump_reach():
    # #811: once per level, a WOW member may claim ONE task exactly one level up.
    assert ERA_1.factions["wow"].level_jump_reach == 1


def test_coven_collab_own_bonus():
    # #811: Cozy Coven inherits the collaboration bonus WOW gave up.
    config = ERA_1.factions["coven"]
    assert config.collab_own_modifier == 1.1
    assert config.own_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_coven_is_the_only_faction_with_a_modifier():
    # #811 states this explicitly: after the swap, Cozy Coven's collab_own is the
    # single non-1.0 task modifier in Era 1. Duel modifiers are a separate axis.
    with_modifiers = {
        slug for slug, config in ERA_1.factions.items()
        if 1.0 != config.own_task_modifier
        or 1.0 != config.other_task_modifier
        or 1.0 != config.collab_own_modifier
        or 1.0 != config.collab_other_modifier
    }
    assert with_modifiers - INHERITORS == {"coven"}


def test_level_jump_is_wow_only():
    granted = {
        slug for slug, config in ERA_1.factions.items()
        if config.level_jump_reach > 0
    }
    assert granted - INHERITORS == {"wow"}


def test_double_dipper_is_everymen_only():
    # #1359: Everymen's perk — the same task may be claimed again while a claim
    # on it is still active.
    granted = {
        slug for slug, config in ERA_1.factions.items()
        if config.can_hold_multiple_memberships
    }
    assert granted - INHERITORS == {"everymen"}


def test_multi_membership_slugs_follows_the_config_not_the_slug():
    """The rule's one statement reads ``era``, so moving the ability moves it."""
    assert set(multi_membership_faction_slugs(ERA_1)) - INHERITORS == {"everymen"}

    moved = replace(
        ERA_1,
        factions={
            **ERA_1.factions,
            "everymen": replace(
                ERA_1.factions["everymen"], can_hold_multiple_memberships=False
            ),
            "snide": replace(
                ERA_1.factions["snide"], can_hold_multiple_memberships=True
            ),
        },
    )
    assert set(multi_membership_faction_slugs(moved)) - INHERITORS == {"snide"}
    # And the inheritor followed it across rather than keeping a stale copy
    # (#1871): the ability was re-derived, not pasted onto Albescent.
    assert set(multi_membership_faction_slugs(moved)) >= INHERITORS


def test_snide_duel_modifiers():
    config = ERA_1.factions["snide"]
    assert config.duel_win_modifier == 2.0   # Snide high-risk bonus
    assert config.duel_loss_modifier == 0.0  # Snide high-risk penalty


def test_snide_no_cross_faction_penalty():
    # Flattened to 1.0 for Era 1 (issue #452).
    config = ERA_1.factions["snide"]
    assert config.other_task_modifier == 1.0


def test_ua_masters_cut_from_era_1():
    # ua_masters deferred to Era 2 per ADR-0004 — must not be in the Era 1 roster.
    assert "ua_masters" not in ERA_1.factions


def test_albescent_full_access():
    """No penalty anywhere, and the best collab deal any faction has (#1871).

    ``collab_own_modifier`` is Coven's, inherited — asserted against Coven so it
    tracks a re-tune. The perk union itself lives in
    ``test_faction_perk_inheritance.py``.
    """
    config = ERA_1.factions["albescent"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == ERA_1.factions["coven"].collab_own_modifier
    assert config.collab_other_modifier == 1.0
    assert config.can_always_rejoin is True


def test_ua_baseline():
    config = ERA_1.factions["ua"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0


def test_ua_habit_bonus_numbers_are_pinned():
    """The two numbers UA's invitation letter says out loud (#1874).

    The copy states "+5 points" and "within seven days". ``test_habit_bonus.py``
    reads both off the config rather than restating them, which is right for
    testing the *behaviour* but means a re-tune from 5 to 8 keeps every other
    test green while the advertisement silently lies. These are the two literals
    that break instead — the habit bonus is UA's only perk, and both halves of
    it are quoted to the player.

    Note the two live on different objects: the points are the faction's, the
    cadence is the era's.
    """
    assert ERA_1.factions["ua"].habit_bonus_points == 5
    assert ERA_1.habit_window_days == 7


def test_ephemerists_modifiers():
    config = ERA_1.factions["ephemerists"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_everymen_modifiers():
    config = ERA_1.factions["everymen"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_all_factions_flat_cross_faction_modifiers():
    # Era-1 decision (issue #452): no cross-faction penalty for any faction.
    for slug, config in ERA_1.factions.items():
        assert config.other_task_modifier == 1.0, slug
        assert config.collab_other_modifier == 1.0, slug


def test_singularity_holds_exactly_one_perk_and_it_is_the_array():
    """Singularity's whole deal is `reads_the_array`, and the emptiness AROUND it.

    This test used to be ``test_singularity_holds_no_perk_on_any_axis`` and said
    the letter promises nothing because it HAS nothing. #1869 gave it something
    — and gave it deliberately on the ONE axis that moves no number: the array
    grants information, never score, modifier or gate (#1869 ruling 1, which is
    why an Era 1 ship was safe).

    So the emptiness stays pinned, and that is not leftover rigour. The joke the
    perk runs on is that the array prints every faction's modifiers and
    Singularity's own row is the era baseline — its perk is being the faction
    that can see its slot is blank. A future era file quietly handing it a
    multiplier would smooth that away, and this is what notices.
    """
    config = ERA_1.factions["singularity"]

    # Multiplier axes, all at the Era 1 baseline every faction starts from.
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0
    assert config.duel_win_modifier == 1.5
    assert config.duel_loss_modifier == 0.5

    # Countable perks: none of either.
    assert config.level_jump_reach == 0
    assert config.habit_bonus_points == 0

    # Held-or-not perks, read off the registry so a perk field classified later
    # is covered here the day it is added rather than silently skipped. The
    # array is the single exception, named rather than excluded by index.
    assert config.reads_the_array is True
    for name in _ANY_PERK_FIELDS:
        if name == "reads_the_array":
            continue
        assert getattr(config, name) is False, name

    # Perks have TWO homes (#1871) — Task Vision is an EraConfig frozenset, not
    # a FactionConfig field, and an audit reading only the dataclass misses it.
    assert "singularity" not in ERA_1.allow_praxis_on_retired_task_factions


def test_the_array_is_singularity_and_its_inheritor_only():
    """Nobody else reads the array in Era 1 (#1869).

    Albescent holds it because it holds EVERY other faction's perk (#1871), not
    because anything here names it — which is the point of asserting against the
    derived inheritor set rather than a literal ``{"singularity", "albescent"}``.
    """
    readers = {slug for slug, config in ERA_1.factions.items() if config.reads_the_array}
    assert readers == {"singularity"} | INHERITORS


def test_na_sentinel():
    config = ERA_1.factions["na"]
    assert config.can_always_rejoin is False


def test_can_always_rejoin_only_albescent():
    rejoinable = [
        slug for slug, config in ERA_1.factions.items()
        if config.can_always_rejoin
    ]
    assert set(rejoinable) == {"albescent"}
