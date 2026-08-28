"""The single duel win/loss rule (ADR-0011, ADR-0052).

One pure function decides who won a duel. It is deliberately near
dependency-free (ids, points and a moderation enum in, an optional id out) so
every consumer can share it without an import cycle:

- ``services.praxis_scoring`` — derives the live duel multiplier on every read.
- ``services.era`` — freezes ``Duel.winner_character_id`` at era close.
- ``services.badge`` — the duel-winner badge (#748) over live duels.

``services.duel`` already imports ``services.era``, so the rule cannot live in
``services.duel`` without a cycle; it lives here instead.
"""
from typing import Optional

from models.praxis import UNSCORED_MODERATION_STATUSES, ModerationStatus


def _can_win(
    character_id: Optional[int],
    moderation: Optional[ModerationStatus],
    forfeited_by_character_id: Optional[int],
) -> bool:
    """Is this side still eligible to win the duel at all?

    Two ways out, deliberately answered by *one* predicate: the player pulled
    their entry back (forfeit, ADR-0011 §Forfeit) or a moderator ruled the work
    unscored (``UNSCORED_MODERATION_STATUSES``, #1442). The two stay
    distinguishable in the record — ``forfeited_by_character_id`` is a deliberate
    player act and is never cleared, moderation is a judgement about the work, and
    neither field is written from the other — but they carry the same consequence
    here. Collapsing them at the point of *consequence* is what removes the
    precedence question when one lands on each side.
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

    Three branches, in priority order (ADR-0011, #1442):

    1. **Eligibility.** A side that forfeited, or whose praxis a moderator ruled
       unscored, cannot win — vote tallies do not decide the outcome:

       * exactly one side ineligible → the *other* side wins, **even when the
         ineligible side holds the higher tally**. That is the intended
         consequence, not a bug: a duel has a second player, and the alternative
         is losing to work a moderator judged did not meet the task.
       * both sides ineligible → ``None``. Nobody won, and the tiebreak below does
         not get to pick one of them.
    2. **Tally.** Otherwise the side with *strictly greater*
       ``VoteTally.points_from_votes`` wins.
    3. **Tiebreak.** Equal points returns ``tie_break_winner_id`` — a winner some
       faction ability grants on a tie (Snide wins ties, #748), pre-resolved from
       the factions by the caller (:func:`services.scoring.sole_tie_taker_id`)
       so this rule stays plain-ids-in. ``None`` (the default) is a real tie, and
       also the correct answer for a no-contest (a duel that never became votable),
       which callers express by passing equal points.

    Keeping the tiebreak *here* is the point: this is the one rule the badge
    (#748), the live multiplier, and the era-close freeze (ADR-0052) all share, so
    a Snide tie must name the same winner in every one of them. The moderation
    arguments are **required** for the same reason — three callers read this rule,
    and a defaulted "assume it passed" is exactly the drift that let a failed
    praxis win (#1442).

    Notes for the next reader:

    * This does **not** contradict #1373 ("a failed praxis banks no points, and
      that is all it changes"). That ruling is about *solo* scoring, where the only
      person affected is the author. A duel has a second player whose recorded
      result and multiplier follow this function, so "banks nothing but still beats
      you" was incoherent. Do not simplify this back to points-only.
    * The winner still banks their faction's guaranteed-win modifier: they won a
      duel. Only the ineligible entry goes unscored.
    * Frozen outcomes never recompute. Era close writes ``Duel.winner_character_id``
      once (``0007_duel_frozen_outcome``, ADR-0052) and every reader trusts the
      frozen value afterwards, so restoring a ``failed`` praxis to ``visible``
      after its duel resolved does **not** reopen the result.
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
