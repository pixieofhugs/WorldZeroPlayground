"""The single duel win/loss rule (ADR-0011, ADR-0052).

One pure function decides who won a duel. It is deliberately dependency-free
(plain ints in, an optional int out) so every consumer can share it without an
import cycle:

- ``services.praxis_scoring`` — derives the live duel multiplier on every read.
- ``services.era`` — freezes ``Duel.winner_character_id`` at era close.
- the duel-winner badge (#748) — reads the frozen winner.

``services.duel`` already imports ``services.era``, so the rule cannot live in
``services.duel`` without a cycle; it lives here instead.
"""
from typing import Optional


def duel_winner(
    *,
    challenger_character_id: Optional[int],
    opponent_character_id: Optional[int],
    challenger_points: int,
    opponent_points: int,
    forfeited_by_character_id: Optional[int] = None,
    tie_break_winner_id: Optional[int] = None,
) -> Optional[int]:
    """Return the winning character id, or ``None`` for a tie / no-contest.

    Three branches, in priority order (ADR-0011):

    1. **Forfeit.** ``forfeited_by_character_id`` set → the *other* side wins by
       default and vote tallies do not decide the outcome.
    2. **Tally.** Otherwise the side with *strictly greater*
       ``VoteTally.points_from_votes`` wins.
    3. **Tiebreak.** Equal points returns ``tie_break_winner_id`` — a winner some
       faction ability grants on a tie (Snide wins ties, #748), pre-resolved from
       the factions by the caller (:func:`services.scoring.snide_tie_winner_id`)
       so this rule stays plain-ints-in. ``None`` (the default) is a real tie, and
       also the correct answer for a no-contest (a duel that never became votable),
       which callers express by passing equal points.

    Keeping the tiebreak *here* is the point: this is the one rule the badge
    (#748), the live multiplier, and the era-close freeze (ADR-0052) all share, so
    a Snide tie must name the same winner in every one of them.
    """
    if forfeited_by_character_id is not None:
        if forfeited_by_character_id == challenger_character_id:
            return opponent_character_id
        return challenger_character_id

    if challenger_points > opponent_points:
        return challenger_character_id
    if opponent_points > challenger_points:
        return opponent_character_id
    return tie_break_winner_id
