from dataclasses import dataclass
from decimal import Decimal

import pytest

from game_config import ERA_1, ERA_2
from models.praxis import ModerationStatus
from services.duel_outcome import duel_winner
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_DUEL,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_level,
    compute_praxis_score,
    compute_vote_budget,
    compute_votes_available,
    exact,
    round_half_up,
    snide_tie_winner_id,
    snide_tie_winner_slug,
)


@dataclass
class _StatsStub:
    """Minimal CharacterStats-shaped stub for scoring unit tests."""
    score: int
    votes_spent_this_era: int


def test_vote_budget_base():
    assert compute_vote_budget(score=0, era=ERA_1) == ERA_1.vote_budget_base


def test_vote_budget_with_score():
    score = 50
    expected = ERA_1.vote_budget_base + int(ERA_1.vote_budget_multiplier * score)
    assert compute_vote_budget(score=score, era=ERA_1) == expected


# ---------------------------------------------------------------------------
# compute_votes_available — on-read recomputation (R.5)
# ---------------------------------------------------------------------------


def test_votes_available_zero_score_no_spend():
    """score=0, votes_spent=0 → vote_budget_base."""
    stats = _StatsStub(score=0, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == ERA_1.vote_budget_base


def test_votes_available_formula():
    """base=10, multiplier=0.1, score=100, spent=3 → 10 + 10 - 3 = 17."""
    from game_config import EraConfig, ERA_1_FACTIONS
    era = EraConfig(
        name="test",
        config_key="test",
        max_task_signups=20,
        vote_budget_base=10,
        vote_budget_multiplier=0.1,
        level_thresholds=ERA_1.level_thresholds,
        level_to_propose_task=3,
        level_to_propose_metatask=6,
        level_to_see_metatasks=6,
        level_to_see_retired_tasks=2,
        level_to_see_pending_tasks=3,
        pending_task_admin_review_hours=48,
        duel_level_required=2,
        collaboration_level_required=1,
        collab_auto_submit_days=10,
        metatask_apply_level=7,
        flag_level_required=4,
        comment_level_required=2,
        comment_flag_review_threshold=1,
        second_character_level_required=4,
        albescent_level_required=8,
        invitation_point_threshold=20,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
        factions=ERA_1_FACTIONS,
        tasks=(),
    )
    stats = _StatsStub(score=100, votes_spent_this_era=3)
    assert compute_votes_available(stats, era=era) == 17


def test_votes_available_clamps_at_zero_when_overspent():
    """votes_spent > cap → 0 (never negative).

    Can occur after a score rollback or admin stat patch. Callers treat 0
    as 'no votes remaining'.
    """
    # base=100, multiplier=2.0, score=0 → cap=100; spent=500 → would be -400
    stats = _StatsStub(score=0, votes_spent_this_era=500)
    assert compute_votes_available(stats, era=ERA_1) == 0


def test_votes_available_grows_with_score():
    """Budget grows as score grows without any explicit refresh."""
    low = _StatsStub(score=10, votes_spent_this_era=0)
    high = _StatsStub(score=100, votes_spent_this_era=0)
    assert compute_votes_available(high, era=ERA_1) > compute_votes_available(low, era=ERA_1)


def test_votes_available_matches_compute_vote_budget_when_no_spend():
    """When nothing has been spent, available == cap."""
    stats = _StatsStub(score=50, votes_spent_this_era=0)
    assert compute_votes_available(stats, era=ERA_1) == compute_vote_budget(50, era=ERA_1)


def test_vote_budget_floors_fractional():
    # multiplier=2.0 is exact, test with a custom era to verify floor()
    from game_config import EraConfig, ERA_1_FACTIONS
    era = EraConfig(
        name="test",
        config_key="test",
        max_task_signups=20,
        vote_budget_base=10,
        vote_budget_multiplier=1.5,
        level_thresholds=ERA_1.level_thresholds,
        level_to_propose_task=3,
        level_to_propose_metatask=6,
        level_to_see_metatasks=6,
        level_to_see_retired_tasks=2,
        level_to_see_pending_tasks=3,
        pending_task_admin_review_hours=48,
        duel_level_required=2,
        collaboration_level_required=1,
        collab_auto_submit_days=10,
        metatask_apply_level=7,
        flag_level_required=4,
        comment_level_required=2,
        comment_flag_review_threshold=1,
        second_character_level_required=4,
        albescent_level_required=8,
        invitation_point_threshold=20,
        reset_score=False,
        reset_level=False,
        reset_faction=False,
        reset_vote_budget=False,
        reset_all_time_score=False,
        factions=ERA_1_FACTIONS,
        tasks=(),
    )
    # 1.5 * 3 = 4.5 → floor = 4, total = 14
    assert compute_vote_budget(score=3, era=era) == 14


def test_level_zero_at_start():
    assert compute_level(score=0, era=ERA_1) == 0


def test_level_boundaries():
    for level, threshold in enumerate(ERA_1.level_thresholds):
        assert compute_level(score=threshold, era=ERA_1) == level
        if level > 0:
            assert compute_level(score=threshold - 1, era=ERA_1) == level - 1


def test_level_max():
    max_level = len(ERA_1.level_thresholds) - 1
    assert compute_level(score=ERA_1.level_thresholds[-1] + 10000, era=ERA_1) == max_level


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


# ---------------------------------------------------------------------------
# Solo mode faction multiplier tests
# ---------------------------------------------------------------------------


def test_faction_multiplier_unaffiliated_task():
    # "na" tasks use own_task_modifier (treated as own-faction, no penalty)
    result = compute_faction_multiplier("wow", "na", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


def test_faction_multiplier_own_faction():
    # #811 flattened wow's own-task modifier to baseline; the multiplier still
    # resolves from the faction's own config, it is just 1.0 now.
    result = compute_faction_multiplier("wow", "wow", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier
    assert result == 1.0


def test_faction_multiplier_other_faction():
    result = compute_faction_multiplier("wow", "ua", ERA_1)
    assert result == ERA_1.factions["wow"].other_task_modifier
    assert result == 1.0  # flattened for Era 1 (issue #452)


def test_faction_multiplier_unknown_faction():
    assert compute_faction_multiplier("nonexistent", "ua", ERA_1) == 1.0


def test_faction_multiplier_empty_task_faction():
    result = compute_faction_multiplier("wow", "", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


# ---------------------------------------------------------------------------
# Collab mode faction multiplier tests
# ---------------------------------------------------------------------------


def test_collab_own_faction():
    # #811 moved the +10% collab-own bonus from wow to coven. This is the live
    # assertion that the bonus is actually applied by the scoring path at all.
    result = compute_faction_multiplier(
        "coven", "coven", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["coven"].collab_own_modifier
    assert result == 1.1


def test_collab_own_faction_wow_has_no_bonus():
    # The other half of the #811 swap: wow's collab-own is plain baseline.
    result = compute_faction_multiplier(
        "wow", "wow", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_own_modifier
    assert result == 1.0


def test_collab_other_faction():
    result = compute_faction_multiplier(
        "wow", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_other_modifier
    assert result == 1.0  # flattened for Era 1 (issue #452)


def test_collab_unaffiliated_task():
    result = compute_faction_multiplier(
        "wow", "na", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert result == ERA_1.factions["wow"].collab_own_modifier


# ---------------------------------------------------------------------------
# Era 2 (Metamorphosis): the 120/80 split is solo + duel, never collab (#1618)
# ---------------------------------------------------------------------------
# The same function under a second ruleset — the reason a second era exists at
# all. Era 1 flattens every modifier to 1.0, so nothing above can tell "reads
# the era's own/other fields" apart from "returns 1.0".


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
    """A `na` task belongs to no faction, so it takes the OWN modifier — the
    0.8 is for another faction's work, not for generic work."""
    assert compute_faction_multiplier("snide", "na", ERA_2) == 1.2


def test_era_2_collab_stays_flat_both_ways():
    """Deliberately asymmetric with the solo/duel pair above (owner ruling): a
    collaboration on your own faction's task must not be worth less than doing
    it alone, and a cross-faction collab is not penalised."""
    for character_faction, task_faction in (("wow", "wow"), ("wow", "snide")):
        assert compute_faction_multiplier(
            character_faction, task_faction, ERA_2,
            collaboration_mode=COLLABORATION_MODE_COLLAB,
        ) == 1.0, (character_faction, task_faction)


def test_era_2_duel_outcome_multiplies_on_top_of_the_split():
    """The two multipliers are separate inputs to compute_praxis_score, so a
    Snide duel win on another faction's task is base × 0.8 × 2.0."""
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


# ---------------------------------------------------------------------------
# Duel multiplier tests (compute_duel_multiplier)
# ---------------------------------------------------------------------------


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
    # No Snide involved → both get 1.0
    result_a = compute_duel_multiplier("wow", "ephemerists", is_winner=False, is_tied=True, era=ERA_1)
    result_b = compute_duel_multiplier("ephemerists", "wow", is_winner=False, is_tied=True, era=ERA_1)
    assert result_a == 1.0
    assert result_b == 1.0


def test_duel_tie_one_snide_snide_wins():
    # Tie with one Snide: Snide gets win rate (2.0), other gets loss rate (0.5)
    snide_result = compute_duel_multiplier("snide", "wow", is_winner=False, is_tied=True, era=ERA_1)
    other_result = compute_duel_multiplier("wow", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert snide_result == ERA_1.factions["snide"].duel_win_modifier
    assert other_result == ERA_1.factions["wow"].duel_loss_modifier


def test_duel_tie_both_snide():
    # Both Snide → both get 1.0 (not one-is-snide rule)
    result = compute_duel_multiplier("snide", "snide", is_winner=False, is_tied=True, era=ERA_1)
    assert result == 1.0


def test_snide_tie_winner_slug_sole_snide_wins():
    assert snide_tie_winner_slug("snide", "wow") == "snide"
    assert snide_tie_winner_slug("wow", "snide") == "snide"


def test_snide_tie_winner_slug_no_or_both_snide_is_a_real_tie():
    assert snide_tie_winner_slug("wow", "ua") is None
    assert snide_tie_winner_slug("snide", "snide") is None


def test_snide_tie_winner_id_resolves_to_the_snide_side():
    # Snide is the challenger → the challenger id wins the tie.
    assert snide_tie_winner_id("snide", 1, "wow", 2) == 1
    # Snide is the opponent → the opponent id wins the tie.
    assert snide_tie_winner_id("wow", 1, "snide", 2) == 2
    # No Snide → nobody wins the tie.
    assert snide_tie_winner_id("wow", 1, "ua", 2) is None


def _winner(**overrides):
    """``duel_winner`` with two eligible sides — override only what a case is about.

    The moderation arguments are required (#1442), so every call names them; this
    keeps the cases below about the rule rather than about the signature.
    """
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
    # Equal points, no forfeit → the pre-resolved tiebreak winner (Snide's id).
    assert _winner(challenger_points=3, opponent_points=3, tie_break_winner_id=1) == 1
    # A real tie (no tiebreak) is still None.
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


# ---------------------------------------------------------------------------
# a side a moderator ruled unscored cannot win (#1442)
# ---------------------------------------------------------------------------


def test_failed_side_loses_even_holding_the_higher_tally():
    """The intended consequence, not a bug — it only looks wrong at a glance.

    #1373 made a failed praxis bank nothing; letting it still *beat* an opponent
    put the cost of an admin ruling on the other player.
    """
    assert (
        _winner(
            challenger_points=99,
            opponent_points=0,
            challenger_moderation=ModerationStatus.failed,
        )
        == 2
    )


def test_hidden_side_loses_the_same_way_as_a_failed_one():
    # One set (`UNSCORED_MODERATION_STATUSES`) answers "banks nothing" and
    # "cannot win", so hidden cannot win either.
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
    # Challenger's work was ruled failed; the opponent walked away. Each is out
    # for its own reason, so neither wins — no precedence question to get wrong.
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
    # `flagged` is merely *awaiting* a ruling — it is not one.
    assert (
        _winner(
            challenger_points=4,
            opponent_points=1,
            challenger_moderation=ModerationStatus.flagged,
        )
        == 1
    )


def test_duel_faction_multiplier_ignores_duel_mode():
    # compute_faction_multiplier with duel context uses own/other task logic (not duel win/loss)
    result = compute_faction_multiplier("wow", "wow", ERA_1)
    assert result == ERA_1.factions["wow"].own_task_modifier


# ---------------------------------------------------------------------------
# Cross-faction collaboration examples from spec
# ---------------------------------------------------------------------------


def test_cross_faction_collab_example():
    """Spec example: Warriors of Whimsy + Ephemerists collaborate on a Snide task."""
    wow_mult = compute_faction_multiplier(
        "wow", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    ephemerists_mult = compute_faction_multiplier(
        "ephemerists", "snide", ERA_1,
        collaboration_mode=COLLABORATION_MODE_COLLAB,
    )
    assert wow_mult == 1.0   # collab_other_modifier for wow (flattened, #452)
    assert ephemerists_mult == 1.0  # collab_other_modifier for ephemerists (flattened, #452)


def test_ua_full_points():
    """UA gets 1.0 on everything."""
    config = ERA_1.factions["ua"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_albescent_no_penalties():
    """Albescent is never penalised, and takes the best collab deal going.

    #1871 gave it every other faction's perk, so ``collab_own_modifier`` is now
    Coven's rather than the 1.0 baseline. Compared against Coven, not restated:
    a re-tune there must move this.
    """
    config = ERA_1.factions["albescent"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == ERA_1.factions["coven"].collab_own_modifier
    assert config.collab_other_modifier == 1.0


def test_ephemerists_no_other_faction_penalty():
    """Ephemerists get full points on other-faction tasks (flattened, #452)."""
    config = ERA_1.factions["ephemerists"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0
    assert config.collab_own_modifier == 1.0
    assert config.collab_other_modifier == 1.0


def test_everymen_no_other_faction_penalty():
    """Everymen get full points on other-faction tasks (flattened, #452)."""
    config = ERA_1.factions["everymen"]
    assert config.own_task_modifier == 1.0
    assert config.other_task_modifier == 1.0


# ---------------------------------------------------------------------------
# #1578 — halves round UP, and a contribution total carries no binary error
# ---------------------------------------------------------------------------

# Coven is the only Era 1 faction with a non-integer modifier, which is why it
# is the one that exposes both defects. Read from the era — never restated here.
_COVEN_COLLAB_MODIFIER = ERA_1.factions["coven"].collab_own_modifier

# The table from #1578, extended with the whole-number neighbours that made the
# old behaviour look arbitrary: under banker's rounding 35 lost a point and
# 25/45/55 did not, purely because only 35 landed on a true binary half.
#
# (base points, exact product, banked score). These expectations are pinned to
# Coven's *current* modifier on purpose: an era that changes it should fail
# here loudly rather than quietly reintroduce a rounding surprise.
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
    """A Coven own-faction collab scores the exact decimal, and halves go up."""
    total = compute_praxis_score(
        task_point_value=base_points,
        faction_multiplier=_COVEN_COLLAB_MODIFIER,
        total_stars=0,
    )
    # Defect 2: the total must be the number it prints as, with no IEEE-754 tail.
    assert Decimal(str(total)) == Decimal(exact_product)
    # Defect 1: every half goes up, whatever the parity beneath it.
    assert round_half_up(total) == banked


def test_contribution_total_has_no_binary_error():
    """#1578's headline: a 100-point Coven collab is 110.0, not 110.00000000000001."""
    total = compute_praxis_score(
        task_point_value=100,
        faction_multiplier=_COVEN_COLLAB_MODIFIER,
        total_stars=0,
    )
    assert total == 110.0
    assert repr(total) == "110.0"


def test_round_half_up_takes_a_true_tie_up():
    """The one case banker's rounding gets wrong — and a float-only fix still would."""
    assert round_half_up(38.5) == 39


def test_round_half_up_is_parity_blind():
    """round() gives 38 for both of these; half-up gives the neighbouring integers."""
    assert round_half_up(37.5) == 38
    assert round_half_up(38.5) == 39
    assert round_half_up(0.5) == 1


def test_round_half_up_still_rounds_down_below_a_half():
    assert round_half_up(38.49) == 38
    assert round_half_up(0.0) == 0


def test_round_half_up_does_not_truncate():
    """ADR-0053's original ruling: a true 49.9 must not bank as 49."""
    assert round_half_up(49.9) == 50


def test_round_half_up_accepts_a_decimal_sum():
    """The stats path sums in Decimal; the helper must bank that without a float hop."""
    assert round_half_up(Decimal("38.5")) == 39


def test_exact_reads_the_printed_number_not_the_binary_one():
    """Decimal(1.1) is 1.1000000000000000888…; exact(1.1) is 1.1."""
    assert exact(_COVEN_COLLAB_MODIFIER) == Decimal(str(_COVEN_COLLAB_MODIFIER))
    assert exact(35) * exact(_COVEN_COLLAB_MODIFIER) == Decimal("38.5")


# ---------------------------------------------------------------------------
# #2633 / ADR-0086 — a metatask is a FLAT bonus, outside both multipliers
# ---------------------------------------------------------------------------
#
# The formula is ``base × faction × duel + meta + votes + habit``. Every
# modifier below is read off the era and never restated: an era that changes
# one should fail here loudly rather than quietly move the rule.

_SNIDE = ERA_1.factions["snide"]
_COVEN = ERA_1.factions["coven"]


def test_metatask_survives_a_snide_duel_loss():
    """#2633's headline: a ×0.0 duel loss zeroes the base, never the metatask."""
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
    """The other half of the same rule: a win multiplies the base alone."""
    total = compute_praxis_score(
        task_point_value=40,
        faction_multiplier=1.0,
        total_stars=0,
        meta_task_points=10,
        duel_multiplier=_SNIDE.duel_win_modifier,
    )
    assert total == 40 * _SNIDE.duel_win_modifier + 10


def test_metatask_is_flat_under_a_non_neutral_faction_multiplier():
    """Coven's own-faction collab ×1.1 — Era 1's only non-duel modifier ≠ 1.0."""
    assert _COVEN.collab_own_modifier != 1.0
    total = compute_praxis_score(
        task_point_value=100,
        faction_multiplier=_COVEN.collab_own_modifier,
        total_stars=0,
        meta_task_points=10,
    )
    # 100 × 1.1 + 10 = 120.0, not (100 + 10) × 1.1 = 121.0
    assert total == 120.0


def test_metatask_stays_exact_under_a_decimal_multiplier():
    """#1578 holds through the move: no binary tail on either side of the plus."""
    total = compute_praxis_score(
        task_point_value=35,
        faction_multiplier=_COVEN.collab_own_modifier,
        total_stars=0,
        meta_task_points=3,
    )
    assert Decimal(str(total)) == Decimal("41.5")


def test_every_flat_term_sits_outside_the_multipliers():
    """meta, votes and habit are one class of term — none of them multiply."""
    total = compute_praxis_score(
        task_point_value=0,
        faction_multiplier=_SNIDE.duel_loss_modifier,
        total_stars=4,
        meta_task_points=10,
        duel_multiplier=_SNIDE.duel_loss_modifier,
        habit_bonus=2,
    )
    assert total == 16.0
