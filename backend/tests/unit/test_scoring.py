from dataclasses import dataclass, replace
from decimal import Decimal

import pytest

from game_config import ERA_1, ERA_2, EraConfig
from models.praxis import ModerationStatus
from services.duel_outcome import duel_winner
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_DUEL,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_praxis_score,
    compute_vote_budget,
    compute_votes_available,
    exact,
    round_half_up,
    sole_tie_taker_id,
    sole_tie_taker_slug,
)


@dataclass
class _StatsStub:
    score: int
    votes_spent_this_era: int


def test_vote_budget_base():
    assert compute_vote_budget(score=0, era=ERA_1) == ERA_1.vote_budget_base


def test_vote_budget_with_score():
    score = 50
    expected = ERA_1.vote_budget_base + int(ERA_1.vote_budget_multiplier * score)
    assert compute_vote_budget(score=score, era=ERA_1) == expected


def test_votes_available_zero_score_no_spend():
    stats = _StatsStub(score=0, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == ERA_1.vote_budget_base


def test_votes_available_formula():
    """10 + 0.1*100 - 3 = 17."""
    era = replace(ERA_1, vote_budget_base=10, vote_budget_multiplier=0.1)
    stats = _StatsStub(score=100, votes_spent_this_era=3)
    assert compute_votes_available(stats, era=era) == 17


def test_votes_available_clamps_at_zero_when_overspent():
    """Overspend happens after a score rollback or admin stat patch."""
    stats = _StatsStub(score=0, votes_spent_this_era=500)
    assert compute_votes_available(stats, era=ERA_1) == 0


def test_votes_available_grows_with_score():
    low = _StatsStub(score=10, votes_spent_this_era=0)
    high = _StatsStub(score=100, votes_spent_this_era=0)
    assert compute_votes_available(high, era=ERA_1) > compute_votes_available(low, era=ERA_1)


def test_votes_available_matches_compute_vote_budget_when_no_spend():
    stats = _StatsStub(score=50, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == compute_vote_budget(50, era=ERA_1)


def test_vote_budget_floors_fractional():
    era = replace(ERA_1, vote_budget_base=10, vote_budget_multiplier=1.5)
    # 1.5 * 3 = 4.5 → floor = 4, total = 14
    assert compute_vote_budget(score=3, era=era) == 14


def test_praxis_score_no_votes():
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=0) == 10.0


def test_praxis_score_with_votes():
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=3) == 13.0


def test_praxis_score_multiple_votes():
    assert compute_praxis_score(task_point_value=20, faction_multiplier=1.0, total_stars=9) == 29.0


def test_praxis_score_with_multiplier():
    # 0.8 faction multiplier: 10 * 0.8 + 5 stars = 13.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=0.8, total_stars=5) == 13.0


def test_praxis_score_with_meta_task_points():
    # (10 + 5) * 1.0 * 1.0 + 3 = 18.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=3, meta_task_points=5) == 18.0


def test_praxis_score_with_duel_multiplier():
    # (10 + 0) * 1.0 * 1.5 + 4 = 19.0
    assert compute_praxis_score(task_point_value=10, faction_multiplier=1.0, total_stars=4, duel_multiplier=1.5) == 19.0


def test_faction_multiplier_unknown_faction():
    assert compute_faction_multiplier("nonexistent", "ua", ERA_1) == 1.0


def test_collab_own_faction():
    # The live check that the collab-own bonus is applied at all (#811).
    result = compute_faction_multiplier(
        "coven", "coven", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["coven"].collab_own_modifier
    assert result == 1.1


# Era 2: 120/80 split on solo + duel, never collab (#1618). Era 1 is all 1.0,
# so only Era 2 tells "reads own/other fields" apart from "returns 1.0".


def test_era_2_own_other_split_lands_on_solo_and_duel():
    for mode in (COLLABORATION_MODE_SOLO, COLLABORATION_MODE_DUEL):
        own = compute_faction_multiplier(
            "snide", "snide", ERA_2, collaboration_mode=mode
        )
        other = compute_faction_multiplier(
            "snide", "wow", ERA_2, collaboration_mode=mode
        )
        assert own == 1.2, mode
        assert other == 0.8, mode


def test_era_2_cross_faction_task_is_not_penalised():
    """A `na` task takes the OWN modifier; 0.8 is only for another faction's."""
    assert compute_faction_multiplier("snide", "na", ERA_2) == 1.2


def test_era_2_collab_stays_flat_both_ways():
    """Deliberately asymmetric with solo/duel (owner ruling)."""
    for character_faction, task_faction in (("wow", "wow"), ("wow", "snide")):
        assert compute_faction_multiplier(
            character_faction, task_faction, ERA_2,
            collaboration_mode=COLLABORATION_MODE_COLLAB,
        ) == 1.0, (character_faction, task_faction)


def test_era_2_duel_outcome_multiplies_on_top_of_the_split():
    faction_multiplier = compute_faction_multiplier(
        "snide", "wow", ERA_2, collaboration_mode=COLLABORATION_MODE_DUEL
    )
    duel_multiplier = compute_duel_multiplier(
        "snide", "wow", is_winner=True, is_tied=False, era=ERA_2
    )
    score = compute_praxis_score(
        task_point_value=10,
        faction_multiplier=faction_multiplier,
        total_stars=0,
        duel_multiplier=duel_multiplier,
    )
    assert score == 10 * 0.8 * 2.0


def test_duel_win_snide():
    result = compute_duel_multiplier("snide", "wow", is_winner=True, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["snide"].duel_win_modifier
    assert result == 2.0


def test_duel_loss_snide():
    result = compute_duel_multiplier("snide", "wow", is_winner=False, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["snide"].duel_loss_modifier
    assert result == 0.0


def test_duel_win_standard():
    result = compute_duel_multiplier("wow", "snide", is_winner=True, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["wow"].duel_win_modifier
    assert result == 1.5


def test_duel_loss_standard():
    result = compute_duel_multiplier("wow", "snide", is_winner=False, is_tied=False, era=ERA_1)
    assert result == ERA_1.factions["wow"].duel_loss_modifier
    assert result == 0.5


def test_duel_tie_no_snide():
    result_a = compute_duel_multiplier("wow", "ephemerists", is_winner=False, is_tied=True, era=ERA_1)
    result_b = compute_duel_multiplier("ephemerists", "wow", is_winner=False, is_tied=True, era=ERA_1)
    assert result_a == 1.0
    assert result_b == 1.0


def test_duel_tie_one_snide_snide_wins():
    snide_result = compute_duel_multiplier("snide", "wow", is_winner=False, is_tied=True, era=ERA_1)
    other_result = compute_duel_multiplier("wow", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert snide_result == ERA_1.factions["snide"].duel_win_modifier
    assert other_result == ERA_1.factions["wow"].duel_loss_modifier


def test_duel_tie_both_snide():
    result = compute_duel_multiplier("snide", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert result == 1.0


def _era_where_only(slug_with_the_perk: str) -> EraConfig:
    """``ERA_1`` with ``takes_duel_ties`` held by exactly one named faction."""
    return replace(
        ERA_1,
        factions={
            slug: replace(
                faction,
                takes_duel_ties=(slug == slug_with_the_perk),
                inherits_faction_perks=False,
            )
            for slug, faction in ERA_1.factions.items()
        },
    )


def test_sole_tie_taker_slug_sole_holder_wins():
    assert sole_tie_taker_slug("snide", "wow", ERA_1) == "snide"
    assert sole_tie_taker_slug("wow", "snide", ERA_1) == "snide"


def test_sole_tie_taker_slug_two_holders_or_none_is_a_real_tie():
    assert sole_tie_taker_slug("wow", "ua", ERA_1) is None
    # Two holders cancel (#2664).
    assert sole_tie_taker_slug("snide", "snide", ERA_1) is None


def test_sole_tie_taker_slug_follows_the_config_not_the_slug():
    """#2664: outcomes a ``faction == "snide"`` comparison can never produce."""
    moved = _era_where_only("wow")
    assert sole_tie_taker_slug("snide", "wow", moved) == "wow"
    assert sole_tie_taker_slug("wow", "snide", moved) == "wow"
    assert sole_tie_taker_slug("snide", "ua", moved) is None


def test_sole_tie_taker_id_resolves_to_the_holding_side():
    assert sole_tie_taker_id("snide", 1, "wow", 2, ERA_1) == 1
    assert sole_tie_taker_id("wow", 1, "snide", 2, ERA_1) == 2
    assert sole_tie_taker_id("wow", 1, "ua", 2, ERA_1) is None


def test_duel_multiplier_tie_follows_the_config_not_the_slug():
    """The banked multiplier reads the same moved perk the predicate does."""
    moved = _era_where_only("wow")
    wow = compute_duel_multiplier(
        "wow", "snide", is_winner=False, is_tied=True, era=moved
    )
    snide = compute_duel_multiplier(
        "snide", "wow", is_winner=False, is_tied=True, era=moved
    )
    assert wow == moved.factions["wow"].duel_win_modifier
    assert snide == moved.factions["snide"].duel_loss_modifier


def _winner(**overrides):
    """``duel_winner`` with two eligible sides; override only what a case is about."""
    kwargs = dict(
        challenger_character_id=1,
        opponent_character_id=2,
        challenger_points=0,
        opponent_points=0,
        challenger_moderation=ModerationStatus.visible,
        opponent_moderation=ModerationStatus.visible,
    )
    kwargs.update(overrides)
    return duel_winner(**kwargs)


def test_duel_winner_returns_tiebreak_on_equal_points():
    assert _winner(challenger_points=3, opponent_points=3, tie_break_winner_id=1) == 1
    assert _winner(challenger_points=3, opponent_points=3) is None
    # Forfeit outranks any tiebreak.
    assert (
        _winner(
            challenger_points=3,
            opponent_points=3,
            forfeited_by_character_id=1,
            tie_break_winner_id=1,
        )
        == 2
    )


def test_failed_side_loses_even_holding_the_higher_tally():
    """Intended (#1442): else an admin ruling would cost the other player."""
    assert (
        _winner(
            challenger_points=99,
            opponent_points=0,
            challenger_moderation=ModerationStatus.failed,
        )
        == 2
    )


def test_hidden_side_loses_the_same_way_as_a_failed_one():
    # One set (`UNSCORED_MODERATION_STATUSES`) answers both questions.
    assert (
        _winner(
            challenger_points=0,
            opponent_points=99,
            opponent_moderation=ModerationStatus.hidden,
        )
        == 1
    )


def test_both_sides_failed_is_nobody_won():
    # Not even the tiebreak gets to pick one of them.
    assert (
        _winner(
            challenger_points=5,
            opponent_points=1,
            challenger_moderation=ModerationStatus.failed,
            opponent_moderation=ModerationStatus.failed,
            tie_break_winner_id=1,
        )
        is None
    )


def test_failure_and_forfeit_on_opposite_sides_is_nobody_won():
    assert (
        _winner(
            challenger_points=7,
            opponent_points=3,
            challenger_moderation=ModerationStatus.failed,
            forfeited_by_character_id=2,
        )
        is None
    )


def test_failure_and_forfeit_on_the_same_side_still_names_the_opponent():
    assert (
        _winner(
            challenger_points=7,
            opponent_points=3,
            challenger_moderation=ModerationStatus.failed,
            forfeited_by_character_id=1,
        )
        == 2
    )


def test_flagged_side_can_still_win():
    # `flagged` is awaiting a ruling, not one.
    assert (
        _winner(
            challenger_points=4,
            opponent_points=1,
            challenger_moderation=ModerationStatus.flagged,
        )
        == 1
    )


# #1578: halves round UP, and a total carries no binary error. Coven is Era 1's
# only non-integer modifier.
_COVEN_COLLAB_MODIFIER = ERA_1.factions["coven"].collab_own_modifier

# (base, exact product, banked). Pinned to Coven's current modifier on purpose.
_COVEN_COLLAB_TABLE = [
    (20, "22.0", 22),
    (25, "27.5", 28),
    (30, "33.0", 33),
    (35, "38.5", 39),
    (40, "44.0", 44),
    (45, "49.5", 50),
    (50, "55.0", 55),
    (55, "60.5", 61),
]


@pytest.mark.parametrize("base_points,exact_product,banked", _COVEN_COLLAB_TABLE)
def test_coven_collab_total_is_exact_and_banks_half_up(
    base_points, exact_product, banked
):
    total = compute_praxis_score(
        task_point_value=base_points,
        faction_multiplier=_COVEN_COLLAB_MODIFIER,
        total_stars=0,
    )
    assert Decimal(str(total)) == Decimal(exact_product)
    assert round_half_up(total) == banked


def test_contribution_total_has_no_binary_error():
    """Not 110.00000000000001."""
    total = compute_praxis_score(
        task_point_value=100,
        faction_multiplier=_COVEN_COLLAB_MODIFIER,
        total_stars=0,
    )
    assert total == 110.0
    assert repr(total) == "110.0"


@pytest.mark.parametrize(
    "value,expected",
    [
        (38.5, 39),
        (37.5, 38),
        (0.5, 1),
        (38.49, 38),
        (0.0, 0),
        (49.9, 50),  # ADR-0053: rounds, does not truncate
        (Decimal("38.5"), 39),  # the stats path sums in Decimal
    ],
)
def test_round_half_up(value, expected):
    assert round_half_up(value) == expected


def test_exact_reads_the_printed_number_not_the_binary_one():
    assert exact(_COVEN_COLLAB_MODIFIER) == Decimal(str(_COVEN_COLLAB_MODIFIER))
    assert exact(35) * exact(_COVEN_COLLAB_MODIFIER) == Decimal("38.5")


# ADR-0086 (#2633): ``base × faction × duel + meta + votes + habit``.

_SNIDE = ERA_1.factions["snide"]
_COVEN = ERA_1.factions["coven"]


def test_metatask_survives_a_snide_duel_loss():
    assert _SNIDE.duel_loss_modifier == 0.0  # the defect only bites at zero
    total = compute_praxis_score(
        task_point_value=40,
        faction_multiplier=1.0,
        total_stars=0,
        meta_task_points=10,
        duel_multiplier=_SNIDE.duel_loss_modifier,
    )
    assert total == 10.0


def test_metatask_is_not_doubled_by_a_snide_duel_win():
    total = compute_praxis_score(
        task_point_value=40,
        faction_multiplier=1.0,
        total_stars=0,
        meta_task_points=10,
        duel_multiplier=_SNIDE.duel_win_modifier,
    )
    assert total == 40 * _SNIDE.duel_win_modifier + 10


def test_metatask_is_flat_under_a_non_neutral_faction_multiplier():
    """Coven collab-own is Era 1's only non-duel modifier ≠ 1.0."""
    assert _COVEN.collab_own_modifier != 1.0
    total = compute_praxis_score(
        task_point_value=100,
        faction_multiplier=_COVEN.collab_own_modifier,
        total_stars=0,
        meta_task_points=10,
    )
    # not (100 + 10) × 1.1 = 121.0
    assert total == 120.0


def test_metatask_stays_exact_under_a_decimal_multiplier():
    total = compute_praxis_score(
        task_point_value=35,
        faction_multiplier=_COVEN.collab_own_modifier,
        total_stars=0,
        meta_task_points=3,
    )
    assert Decimal(str(total)) == Decimal("41.5")


def test_every_flat_term_sits_outside_the_multipliers():
    total = compute_praxis_score(
        task_point_value=0,
        faction_multiplier=_SNIDE.duel_loss_modifier,
        total_stars=4,
        meta_task_points=10,
        duel_multiplier=_SNIDE.duel_loss_modifier,
        habit_bonus=2,
    )
    assert total == 16.0
