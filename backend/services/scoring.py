from decimal import ROUND_HALF_UP, Decimal
from math import floor
from typing import TYPE_CHECKING, Optional, Union

from faction_slugs import CROSS_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig

if TYPE_CHECKING:
    from models.character_stats import CharacterStats

COLLABORATION_MODE_SOLO = "solo"
COLLABORATION_MODE_COLLAB = "collab"
COLLABORATION_MODE_DUEL = "duel"
SNIDE_FACTION_SLUG = "snide"

_WHOLE = Decimal(1)


def exact(value: Union[int, float, Decimal]) -> Decimal:
    """The ``Decimal`` for the number ``value`` *prints* as, not its binary value.

    ``Decimal(1.1)`` is 1.1000000000000000888178…; ``Decimal(str(1.1))`` is
    exactly ``1.1``. Every era modifier is authored as a short decimal literal
    (`collab_own_modifier=1.1`), and ``repr`` of a float is the shortest string
    that round-trips, so the printed form is always the intended one.

    This is the seam that keeps #1578 fixed: score arithmetic done through
    ``exact`` cannot produce ``110.00000000000001`` for 100 × 1.1, so "exactly
    a half" stays a fact about the score rather than about IEEE-754.
    """
    return value if isinstance(value, Decimal) else Decimal(str(value))


def round_half_up(value: Union[int, float, Decimal]) -> int:
    """Bank a score to a whole number, rounding an exact half **up** (#1578).

    Neither builtin does this:

    - ``int()`` truncates toward zero, so a true 49.9 banks as 49 (ADR-0053).
    - ``round()`` is banker's rounding — half-to-*even* — so ``round(38.5)``
      is 38 while ``round(37.5)`` is 38 too. A half went up or down on the
      parity of the integer beneath it, which no player could discover.

    Half up is the only rule a player would guess, and a game about doing real
    things should not keep a house edge on ties. Deliberately **not**
    ``int(x + 0.5)``: that reintroduces float error at exactly the boundary it
    is meant to settle.

    Negative inputs round away from zero (-0.5 → -1). The scoring path never
    produces one — every term in ``compute_praxis_score`` is non-negative — so
    that case is unreachable rather than chosen.
    """
    return int(exact(value).quantize(_WHOLE, rounding=ROUND_HALF_UP))


def compute_vote_budget(score: int, era: EraConfig = CURRENT_ERA) -> int:
    """Return the total vote budget capacity for a given score.

    This is the *cap* before any spending. Spendable votes are computed by
    subtracting `votes_spent_this_era`; use `compute_votes_available` for that.
    """
    return era.vote_budget_base + floor(era.vote_budget_multiplier * score)


def compute_votes_available(
    stats: "CharacterStats", era: EraConfig = CURRENT_ERA
) -> int:
    """Compute the spendable vote count for a character from persisted stats.

    Formula:
        era.vote_budget_base + floor(era.vote_budget_multiplier * stats.score)
        - stats.votes_spent_this_era

    The stored column is `votes_spent_this_era` (monotonic per era). The
    returned budget is always on-read — it grows as `stats.score` grows and
    shrinks as more first-cast votes are spent. Clamped at zero: if the
    character has spent more than the formula currently allows (possible
    after a score rollback / stat patch), the helper returns 0 rather than
    a negative value. Callers should treat `<= 0` as "no votes remaining".
    """
    cap = era.vote_budget_base + floor(era.vote_budget_multiplier * stats.score)
    remaining = cap - stats.votes_spent_this_era
    return remaining if remaining > 0 else 0


def compute_level(score: int, era: EraConfig = CURRENT_ERA) -> int:
    for level, threshold in reversed(list(enumerate(era.level_thresholds))):
        if score >= threshold:
            return level
    return 0


def compute_faction_multiplier(
    character_faction_slug: str,
    task_faction_slug: str,
    era: EraConfig,
    collaboration_mode: str = COLLABORATION_MODE_SOLO,
) -> float:
    """Return the faction-based point multiplier for a character doing a given task.

    For duels, duel outcome is captured separately via compute_duel_multiplier — this
    function returns the own/other task modifier regardless of collaboration mode.
    Cross-faction tasks — those carrying CROSS_FACTION_SLUG, i.e. belonging to no
    faction — are treated as own-faction, so nobody is penalised for generic work.
    Votes are always added flat after all multipliers are applied.
    """
    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        return 1.0

    is_own_faction = (
        task_faction_slug == character_faction_slug
        or task_faction_slug == CROSS_FACTION_SLUG
        or not task_faction_slug
    )

    if collaboration_mode == COLLABORATION_MODE_COLLAB:
        if is_own_faction:
            return faction_config.collab_own_modifier
        return faction_config.collab_other_modifier

    # Solo and duel: use own/other task modifier (duel outcome applied separately)
    if is_own_faction:
        return faction_config.own_task_modifier
    return faction_config.other_task_modifier


def compute_duel_multiplier(
    character_faction_slug: str,
    opponent_faction_slug: str,
    is_winner: bool,
    is_tied: bool,
    era: EraConfig,
) -> float:
    """Return the duel outcome multiplier for a single participant.

    Tiebreaker rules:
    - Tie with one Snide player: Snide gets win rate, other gets loss rate.
    - Tie with no Snide, or both Snide: both get 1.0×.
    """
    if not is_tied:
        faction_config = era.factions.get(character_faction_slug)
        if faction_config is None:
            return 1.5 if is_winner else 0.5
        return faction_config.duel_win_modifier if is_winner else faction_config.duel_loss_modifier

    # Tied case: Snide wins ties (one shared predicate, see snide_tie_winner_slug).
    tie_winner_slug = snide_tie_winner_slug(character_faction_slug, opponent_faction_slug)
    if tie_winner_slug is None:
        return 1.0

    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        return 2.0 if character_faction_slug == tie_winner_slug else 0.5
    if character_faction_slug == tie_winner_slug:
        return faction_config.duel_win_modifier
    return faction_config.duel_loss_modifier


def snide_tie_winner_slug(faction_a: str, faction_b: str) -> Optional[str]:
    """The faction slug that wins a *tied* duel, or ``None`` for a true tie.

    Snide's ability is that it takes ties — but only when it is the *sole* Snide
    side. Two Snide sides (or no Snide) is a real tie. This is the one definition
    of the rule; both the live multiplier above and the winner id below read it.
    """
    a_snide = faction_a == SNIDE_FACTION_SLUG
    b_snide = faction_b == SNIDE_FACTION_SLUG
    if a_snide and not b_snide:
        return faction_a
    if b_snide and not a_snide:
        return faction_b
    return None


def snide_tie_winner_id(
    challenger_faction_slug: str,
    challenger_character_id: Optional[int],
    opponent_faction_slug: str,
    opponent_character_id: Optional[int],
) -> Optional[int]:
    """Character id that wins a tied duel by the Snide tiebreak, else ``None``.

    Feeds ``duel_winner(..., tie_break_winner_id=...)`` so the single winner rule
    (the badge, the freeze) agrees with what the multiplier has always done.
    """
    winner_slug = snide_tie_winner_slug(challenger_faction_slug, opponent_faction_slug)
    if winner_slug is None:
        return None
    return (
        challenger_character_id
        if challenger_faction_slug == winner_slug
        else opponent_character_id
    )


def compute_praxis_score(
    task_point_value: int,
    faction_multiplier: float,
    total_stars: int,
    meta_task_points: int = 0,
    duel_multiplier: float = 1.0,
    habit_bonus: int = 0,
) -> float:
    """Score for a single praxis or collaboration member.

    Formula: task_point_value × faction_multiplier × duel_multiplier
             + meta_task_points + total_stars + habit_bonus

    Exactly one term multiplies: the **base** points of the task. Everything
    else a character earned by doing a specific extra thing is flat.

    - Base points are awarded on publication.
    - Each star from community votes adds flat after all multipliers.
    - meta_task_points: flat bonus from an attached meta task (0 if none).
      **Outside the parentheses since ADR-0086** (owner ruling, #2633): it used
      to ride both multipliers, so a +10 metatask paid +20 on a Snide duel win
      and +0 on a Snide duel loss — the same metatask erased by a duel outcome
      it has nothing to do with. The multipliers judge the task; the metatask is
      a separate thing the player did.
    - duel_multiplier: 1.0 for solo/collab; outcome-based for duels.
    - habit_bonus: the #1617 faction habit ability, stamped at seal time onto
      ``PraxisMember.habit_bonus_points``. Flat for the same reason (owner
      ruling): habit and faction alignment are different incentives, and folding
      it inside would make the same ability worth 50% more under an era with a
      1.2 own-faction modifier than under Era 1's 1.0. ADR-0086 is that argument
      applied to the one term it had not yet reached.

    Evaluated in ``Decimal`` and returned as ``float`` (#1578). The multipliers
    are decimal literals in the era config, so binary multiplication grew a tail
    — 100 × 1.1 came back as ``110.00000000000001``, and Coven's ×1.1 pushed
    three of four halves just over the line while leaving the fourth on it. The
    returned float is the nearest double to the exact decimal, which round-trips
    through ``str``; every caller that sums or banks these goes back through
    ``exact`` first. The return type stays ``float`` on purpose: ``Decimal``
    here would reach ``Contribution.total``, the praxis wire schema and every
    reader, to fix a defect that only bites at the banking step.
    """
    return float(
        exact(task_point_value)
        * exact(faction_multiplier)
        * exact(duel_multiplier)
        + exact(meta_task_points)
        + exact(total_stars)
        + exact(habit_bonus)
    )
