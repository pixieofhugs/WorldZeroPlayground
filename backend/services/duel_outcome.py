"""The single duel win/loss rule (ADR-0011, ADR-0052).

Near dependency-free so praxis_scoring, era and badge can share it; it can't
live in ``services.duel`` (that imports ``services.era`` — cycle).
"""
from typing import Optional

from models.praxis import UNSCORED_MODERATION_STATUSES, ModerationStatus


def _can_win(
    character_id: Optional[int],
    moderation: Optional[ModerationStatus],
    forfeited_by_character_id: Optional[int],
) -> bool:
    """Is this side still eligible to win?

    Forfeit and unscored moderation (#1442) stay distinct in the record but
    share one consequence here, which removes any precedence question.
    """
    if moderation in UNSCORED_MODERATION_STATUSES:
        return False
    return character_id is None or character_id != forfeited_by_character_id


def duel_winner(
    *,
    challenger_character_id: Optional[int],
    opponent_character_id: Optional[int],
    challenger_points: int,
    opponent_points: int,
    challenger_moderation: Optional[ModerationStatus],
    opponent_moderation: Optional[ModerationStatus],
    forfeited_by_character_id: Optional[int] = None,
    tie_break_winner_id: Optional[int] = None,
) -> Optional[int]:
    """Return the winning character id, or ``None`` for a tie / no-contest.

    Priority (ADR-0011, #1442):

    1. Eligibility: one side ineligible → the other wins, even with a lower
       tally (intended). Both ineligible → ``None``; tiebreak doesn't apply.
    2. Strictly greater ``points_from_votes`` wins.
    3. Equal points → ``tie_break_winner_id`` (e.g. Snide wins ties, #748,
       pre-resolved via :func:`services.scoring.sole_tie_taker_id`). ``None``
       is a real tie or a no-contest (callers pass equal points).

    The tiebreak and required moderation args live here so badge, live
    multiplier and era-close freeze can't drift (#1442).

    * Doesn't contradict #1373 (that's solo scoring); a duel has a second
      player. Don't simplify back to points-only.
    * The winner still banks their guaranteed-win modifier.
    * Frozen outcomes (ADR-0052) never recompute: restoring a failed praxis
      after resolution doesn't reopen it.
    """
    challenger_can_win = _can_win(
        challenger_character_id, challenger_moderation, forfeited_by_character_id
    )
    opponent_can_win = _can_win(
        opponent_character_id, opponent_moderation, forfeited_by_character_id
    )
    if not challenger_can_win and not opponent_can_win:
        return None
    if not challenger_can_win:
        return opponent_character_id
    if not opponent_can_win:
        return challenger_character_id

    if challenger_points > opponent_points:
        return challenger_character_id
    if opponent_points > challenger_points:
        return opponent_character_id
    return tie_break_winner_id
