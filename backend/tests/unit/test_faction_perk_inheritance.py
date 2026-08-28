"""Albescent's charter (#1871): it holds every OTHER faction's perk in its era.

The seam under test is **config resolution**, not enforcement. Every perk read
site already reads ``era.factions[slug].<field>`` or one of the era's perk
frozensets, so proving the resolved ``EraConfig`` carries the union proves every
enforcement site inherits it — no site gained a faction-slug branch.

Two things this file deliberately does NOT do:

- **Restate values.** A test asserting Albescent's duel win is ``2.0`` proves
  nothing about the config; it passes just as happily against six pasted
  literals, which is the drift Ruling 2 forbids. Every assertion below reads the
  donor faction off ``era`` and compares.
- **Test only ``FactionConfig``.** Perks live in TWO places — six are
  ``FactionConfig`` fields, Task Vision is an ``EraConfig`` frozenset. A
  ``FactionConfig``-only fix would silently miss the second half, so it is
  asserted here too.
"""

import dataclasses

import pytest

from game_config import (
    _ANY_PERK_FIELDS,
    _DUEL_PERK_FIELDS,
    _MAX_PERK_FIELDS,
    _NON_INHERITED_PERK_FIELDS,
    ERA_1,
    ERA_2,
    EraConfig,
    FactionConfig,
)
from models.character import Character
from models.task import Task, TaskType
from services.meta_task import faction_bypasses_metatask_level
from services.praxis_metatask import _check_metatask_eligibility

ERAS = {"era_1": ERA_1, "era_2": ERA_2}


def _inheritors(era: EraConfig) -> list[str]:
    return sorted(
        slug for slug, faction in era.factions.items() if faction.inherits_faction_perks
    )


def _baseline(field_name: str):
    """The dataclass default for a perk field — what "no perk" looks like."""
    for field in dataclasses.fields(FactionConfig):
        if field.name == field_name:
            return field.default
    raise AssertionError(f"no such FactionConfig field: {field_name}")


# ---------------------------------------------------------------------------
# The union, asserted against the era rather than against literals
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("era_key", sorted(ERAS))
def test_every_era_has_an_inheritor(era_key: str) -> None:
    """Albescent exists in both eras and both declare the charter."""
    assert _inheritors(ERAS[era_key]) == ["albescent"]


@pytest.mark.parametrize("era_key", sorted(ERAS))
def test_inheritor_matches_the_best_faction_on_every_max_axis(era_key: str) -> None:
    era = ERAS[era_key]
    for slug in _inheritors(era):
        inheritor = era.factions[slug]
        for field_name in _MAX_PERK_FIELDS:
            best = max(getattr(f, field_name) for f in era.factions.values())
            assert getattr(inheritor, field_name) == best, (slug, field_name)


@pytest.mark.parametrize("era_key", sorted(ERAS))
def test_inheritor_holds_every_boolean_perk_any_faction_holds(era_key: str) -> None:
    era = ERAS[era_key]
    for slug in _inheritors(era):
        inheritor = era.factions[slug]
        for field_name in _ANY_PERK_FIELDS:
            held = any(getattr(f, field_name) for f in era.factions.values())
            assert getattr(inheritor, field_name) is held, (slug, field_name)


@pytest.mark.parametrize("era_key", sorted(ERAS))
def test_duel_pair_is_inherited_whole(era_key: str) -> None:
    """Ruling 1: the duel deal comes as a PAIR, downside included.

    A per-field ``max`` would hand the inheritor ``max(0.5, 0.0) = 0.5`` on the
    loss side — an upside-only gamble strictly better than the faction it was
    taken from. The pair travels together from the faction with the highest
    ``duel_win_modifier``.
    """
    era = ERAS[era_key]
    donor = min(era.factions.values(), key=lambda f: (-f.duel_win_modifier, f.slug))
    for slug in _inheritors(era):
        inheritor = era.factions[slug]
        assert (inheritor.duel_win_modifier, inheritor.duel_loss_modifier) == (
            donor.duel_win_modifier,
            donor.duel_loss_modifier,
        ), slug


def test_era_1_duel_donor_is_snide_and_the_loss_side_is_not_softened() -> None:
    """The one axis a naive derivation gets wrong, pinned for Era 1 specifically."""
    snide = ERA_1.factions["snide"]
    albescent = ERA_1.factions["albescent"]
    assert (albescent.duel_win_modifier, albescent.duel_loss_modifier) == (
        snide.duel_win_modifier,
        snide.duel_loss_modifier,
    )
    # The naive per-axis rule would have kept the softer loss modifier.
    assert albescent.duel_loss_modifier < ERA_1.factions["na"].duel_loss_modifier


# ---------------------------------------------------------------------------
# One assertion per perk the issue names, each driven off its donor
# ---------------------------------------------------------------------------


def test_albescent_holds_ua_habit_bonus() -> None:
    assert (
        ERA_1.factions["albescent"].habit_bonus_points
        == ERA_1.factions["ua"].habit_bonus_points
        > _baseline("habit_bonus_points")
    )


def test_albescent_holds_wow_level_jump() -> None:
    assert (
        ERA_1.factions["albescent"].level_jump_reach
        == ERA_1.factions["wow"].level_jump_reach
        > _baseline("level_jump_reach")
    )


def test_albescent_holds_coven_collab_bonus() -> None:
    assert (
        ERA_1.factions["albescent"].collab_own_modifier
        == ERA_1.factions["coven"].collab_own_modifier
        > ERA_1.factions["na"].collab_own_modifier
    )


def test_albescent_holds_everymen_double_dipper() -> None:
    assert ERA_1.factions["everymen"].can_hold_multiple_memberships is True
    assert ERA_1.factions["albescent"].can_hold_multiple_memberships is True


def test_albescent_holds_ephemerists_task_vision() -> None:
    """The ``EraConfig`` half — the one a ``FactionConfig``-only fix would miss."""
    assert "ephemerists" in ERA_1.allow_praxis_on_retired_task_factions
    assert "albescent" in ERA_1.allow_praxis_on_retired_task_factions


def test_albescent_keeps_its_own_rejoin() -> None:
    assert ERA_1.factions["albescent"].can_always_rejoin is True


def test_albescent_keeps_its_own_metatask_bypass() -> None:
    """Ruling 3: the bypass is a config field now, not a slug branch."""
    assert ERA_1.factions["albescent"].can_apply_metatask_at_any_level is True
    assert ERA_2.factions["albescent"].can_apply_metatask_at_any_level is True


# ---------------------------------------------------------------------------
# The EraConfig half never over-reaches
# ---------------------------------------------------------------------------


def test_task_vision_is_not_granted_when_no_faction_holds_it() -> None:
    """"At least as good as the best other faction" — and no better.

    Era 2 has no Ephemerists, so nobody holds Task Vision and the inheritor must
    not conjure it out of an empty set.
    """
    assert ERA_2.allow_praxis_on_retired_task_factions == frozenset()
    for era in ERAS.values():
        assert era.allow_praxis_on_pending_task_factions == frozenset()


def test_inheritor_joins_a_perk_frozenset_that_anyone_else_is_in() -> None:
    granted = dataclasses.replace(
        ERA_2, allow_praxis_on_pending_task_factions=frozenset({"snide"})
    )
    assert granted.allow_praxis_on_pending_task_factions == frozenset(
        {"snide", "albescent"}
    )


# ---------------------------------------------------------------------------
# Derived, not pasted — the guard on the failure mode that produced this bug
# ---------------------------------------------------------------------------


def _era_with_extra_faction(**faction_kwargs) -> EraConfig:
    baseline = ERA_1.factions["na"]
    newcomer = dataclasses.replace(baseline, slug="newcomer", **faction_kwargs)
    return dataclasses.replace(
        ERA_1, factions={**_declared_factions(), "newcomer": newcomer}
    )


def _declared_factions() -> dict:
    """Era 1's factions as the era file DECLARES them, inheritance not applied.

    Re-deriving from an already-resolved dict is still correct (the union is
    idempotent), but starting from the declaration is what an era author does.
    """
    from eras.era_1 import ERA_1_FACTIONS

    return dict(ERA_1_FACTIONS)


def test_the_exported_faction_dict_is_the_resolved_one() -> None:
    """``game_config.ERA_N_FACTIONS`` must never be the pre-inheritance dict.

    The era file keeps a module-level literal for authoring; the two now differ
    by the perk union, and a consumer reading the literal would see an Albescent
    that has not inherited yet.
    """
    import game_config

    assert game_config.ERA_1_FACTIONS is ERA_1.factions
    assert game_config.ERA_2_FACTIONS is ERA_2.factions
    assert _declared_factions()["albescent"].duel_win_modifier != (
        ERA_1.factions["albescent"].duel_win_modifier
    )


def test_a_faction_added_with_a_new_perk_is_mirrored_automatically() -> None:
    """The failure mode that produced #1871: a faction arrives, nobody mirrors it."""
    era = _era_with_extra_faction(habit_bonus_points=99, level_jump_reach=4)
    assert era.factions["albescent"].habit_bonus_points == 99
    assert era.factions["albescent"].level_jump_reach == 4


def test_a_second_duellist_cannot_be_cherry_picked_across() -> None:
    """Ruling 1 again, at the seam where a future era would break it.

    Two aggressive duellists: the pair comes from the higher win modifier,
    whole. Mixing 2.0 from one with 0.9 from the other is the bug.
    """
    era = _era_with_extra_faction(duel_win_modifier=1.9, duel_loss_modifier=0.9)
    albescent = era.factions["albescent"]
    assert (albescent.duel_win_modifier, albescent.duel_loss_modifier) == (2.0, 0.0)


def test_duel_donor_ties_break_deterministically_by_slug() -> None:
    era = _era_with_extra_faction(duel_win_modifier=2.0, duel_loss_modifier=0.25)
    albescent = era.factions["albescent"]
    # Two factions tied at 2.0; "newcomer" sorts before "snide", so its pair
    # wins. The literal here is the OUTCOME of the tie-break rule, not a
    # restated config value — swap the rule and this flips to (2.0, 0.0).
    assert (albescent.duel_win_modifier, albescent.duel_loss_modifier) == (2.0, 0.25)


def test_every_faction_config_field_is_classified() -> None:
    """The guard that actually bites now the union is derived.

    Inheritance can no longer be forgotten for a new *faction* — it is computed.
    It CAN be forgotten for a new *perk field*: add one to ``FactionConfig``,
    leave it out of the tables below, and the inheritor silently stops holding
    every perk. This fails the moment that happens.
    """
    classified = (
        {"slug", "inherits_faction_perks"}
        | set(_MAX_PERK_FIELDS)
        | set(_ANY_PERK_FIELDS)
        | set(_DUEL_PERK_FIELDS)
        | set(_NON_INHERITED_PERK_FIELDS)
    )
    assert {f.name for f in dataclasses.fields(FactionConfig)} == classified


# ---------------------------------------------------------------------------
# Ruling 3: the metatask bypass reads config, never a slug
# ---------------------------------------------------------------------------


def test_metatask_bypass_is_the_inheritor_only_in_era_1() -> None:
    granted = {
        slug for slug in ERA_1.factions if faction_bypasses_metatask_level(slug, ERA_1)
    }
    assert granted == set(_inheritors(ERA_1))


def test_metatask_bypass_follows_the_config_not_the_slug() -> None:
    """Move the ability and it moves — the proof it is not a slug comparison."""
    moved = dataclasses.replace(
        ERA_1,
        factions={
            slug: dataclasses.replace(
                faction,
                can_apply_metatask_at_any_level=(slug == "singularity"),
                inherits_faction_perks=False,
            )
            for slug, faction in _declared_factions().items()
        },
    )
    assert faction_bypasses_metatask_level("singularity", moved) is True
    assert faction_bypasses_metatask_level("albescent", moved) is False


def test_metatask_bypass_is_safe_for_unknown_and_missing_slugs() -> None:
    assert faction_bypasses_metatask_level(None, ERA_1) is False
    assert faction_bypasses_metatask_level("ua_masters", ERA_1) is False


# ---------------------------------------------------------------------------
# The enforcement gate itself — the branch Ruling 3 deleted
# ---------------------------------------------------------------------------


def _metatask_gate(faction_slug: str, level: int, era: EraConfig = ERA_1):
    return _check_metatask_eligibility(
        Character(faction_slug=faction_slug),
        Task(task_type=TaskType.metatask, metatask_faction_slug="wow"),
        level,
        era,
    )


def test_gate_lets_the_bypass_faction_in_below_the_level() -> None:
    assert _metatask_gate("albescent", 0) is None


def test_gate_holds_everyone_else_to_the_era_level() -> None:
    """Read off ``era`` — no restated integer, so a re-tune moves the test."""
    below = ERA_1.metatask_apply_level - 1
    assert _metatask_gate("wow", below) is not None
    assert _metatask_gate("wow", ERA_1.metatask_apply_level) is None


def test_gate_carries_no_faction_slug_branch_of_its_own() -> None:
    """Strip the perk from the config and the gate must stop granting it.

    This is the assertion that would have failed against the old
    ``if character.faction_slug == ALBESCENT_FACTION_SLUG`` — a slug branch
    survives a config edit, a config read does not.
    """
    stripped = dataclasses.replace(
        ERA_1,
        factions={
            slug: dataclasses.replace(
                faction,
                can_apply_metatask_at_any_level=False,
                inherits_faction_perks=False,
            )
            for slug, faction in _declared_factions().items()
        },
    )
    assert _metatask_gate("albescent", 0, stripped) is not None
