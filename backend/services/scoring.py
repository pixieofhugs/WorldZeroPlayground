from math import floor
from typing import TYPE_CHECKING, Optional

from faction_slugs import CROSS_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig

if TYPE_CHECKING:
    from models.character_stats import CharacterStats

COLLABORATION_MODE_SOLO = "solo"
COLLABORATION_MODE_COLLAB = "collab"
COLLABORATION_MODE_DUEL = "duel"
SNIDE_FACTION_SLUG = "snide"


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

    Formula: (task_point_value + meta_task_points) × faction_multiplier × duel_multiplier
             + total_stars + habit_bonus

    - Base points are awarded on publication.
    - Each star from community votes adds flat after all multipliers.
    - meta_task_points: flat bonus from an attached meta task (0 if none).
    - duel_multiplier: 1.0 for solo/collab; outcome-based for duels.
    - habit_bonus: the #1617 faction habit ability, stamped at seal time onto
      ``PraxisMember.habit_bonus_points``. **Flat, outside the parentheses**
      (owner ruling): habit and faction alignment are different incentives, and
      folding it inside would make the same ability worth 50% more under an era
      with a 1.2 own-faction modifier than under Era 1's 1.0.
    """
    return (
        (task_point_value + meta_task_points) * faction_multiplier * duel_multiplier
        + total_stars
        + habit_bonus
    )
