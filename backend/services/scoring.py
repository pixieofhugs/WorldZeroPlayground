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

_WHOLE = Decimal(1)


def exact(value: Union[int, float, Decimal]) -> Decimal:
    """The ``Decimal`` for the number ``value`` *prints* as, not its binary value.

    Era modifiers are short decimal literals, so ``Decimal(str(x))`` is the
    intended value; keeps 100 × 1.1 from becoming ``110.00000000000001`` (#1578).
    """
    return value if isinstance(value, Decimal) else Decimal(str(value))


def round_half_up(value: Union[int, float, Decimal]) -> int:
    """Bank a score to a whole number, rounding an exact half **up** (#1578).

    Not ``int()`` (truncates, ADR-0053), not ``round()`` (half-to-even), not
    ``int(x + 0.5)`` (float error at the boundary). Negatives round away from
    zero, but scoring never produces one.
    """
    return int(exact(value).quantize(_WHOLE, rounding=ROUND_HALF_UP))


def compute_vote_budget(score: int, era: EraConfig = CURRENT_ERA) -> int:
    """Vote budget cap before spending; see ``compute_votes_available``."""
    return era.vote_budget_base + floor(era.vote_budget_multiplier * score)


def compute_votes_available(
    stats: "CharacterStats", era: EraConfig = CURRENT_ERA
) -> int:
    """Spendable votes: cap minus ``votes_spent_this_era``, computed on read.

    Clamped at 0, since a score rollback can leave spent above the cap.
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
    """Faction point multiplier for a character doing a task.

    Duel outcome is separate (``compute_duel_multiplier``). Cross-faction tasks
    count as own-faction so nobody is penalised for generic work.
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
    """Duel outcome multiplier for one participant.

    On a tie, the sole ``takes_duel_ties`` holder gets its win rate and the other
    its loss rate; with zero or two holders both get 1.0 (#2664).
    """
    if not is_tied:
        faction_config = era.factions.get(character_faction_slug)
        if faction_config is None:
            return 1.5 if is_winner else 0.5
        return faction_config.duel_win_modifier if is_winner else faction_config.duel_loss_modifier

    tie_winner_slug = sole_tie_taker_slug(
        character_faction_slug, opponent_faction_slug, era
    )
    if tie_winner_slug is None:
        return 1.0

    faction_config = era.factions.get(character_faction_slug)
    if faction_config is None:
        # Unknown slug holds no perk, so here it can only be the loser.
        return 0.5
    if character_faction_slug == tie_winner_slug:
        return faction_config.duel_win_modifier
    return faction_config.duel_loss_modifier


def _takes_duel_ties(faction_slug: str, era: EraConfig) -> bool:
    """Does this era grant ``faction_slug`` the tie perk? Unknown slugs don't."""
    faction = era.factions.get(faction_slug)
    return faction is not None and faction.takes_duel_ties


def sole_tie_taker_slug(
    faction_a: str, faction_b: str, era: EraConfig = CURRENT_ERA
) -> Optional[str]:
    """The faction slug that wins a *tied* duel, or ``None`` for a true tie.

    The sole holder of ``takes_duel_ties`` takes it; two holders is a real tie
    (hence the perk is non-inheritable). The one definition of the rule, mirrored
    by the frontend ``duelStakes`` (#2664).
    """
    a_takes = _takes_duel_ties(faction_a, era)
    b_takes = _takes_duel_ties(faction_b, era)
    if a_takes and not b_takes:
        return faction_a
    if b_takes and not a_takes:
        return faction_b
    return None


def sole_tie_taker_id(
    challenger_faction_slug: str,
    challenger_character_id: Optional[int],
    opponent_faction_slug: str,
    opponent_character_id: Optional[int],
    era: EraConfig = CURRENT_ERA,
) -> Optional[int]:
    """Character id that wins a tied duel by the take-the-tie perk, else ``None``.

    Feeds ``duel_winner(tie_break_winner_id=...)`` to agree with the multiplier.
    """
    winner_slug = sole_tie_taker_slug(
        challenger_faction_slug, opponent_faction_slug, era
    )
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

    Only base points multiply (ADR-0086): the multipliers judge the task, so
    metatask points, stars and the seal-stamped habit bonus (#1617) stay flat.

    Evaluated in ``Decimal`` (#1578) but returned as ``float`` to keep the wire
    type; callers that sum or bank go back through ``exact`` first.
    """
    return float(
        exact(task_point_value)
        * exact(faction_multiplier)
        * exact(duel_multiplier)
        + exact(meta_task_points)
        + exact(total_stars)
        + exact(habit_bonus)
    )
