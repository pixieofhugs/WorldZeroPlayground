"""Who may see a praxis row, as SQL predicates (ADR-0024).

A leaf (no session, no service imports) so every read surface can import it.
"""

from typing import Optional

from sqlalchemy import and_, exists, not_, or_, select

from models.duel import Duel, DuelStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus

# While a duel is in one of these, a submitted side is author-only so the opponent
# can't crib it (#999). Terminal states (settled/resolved/declined, forfeit stays
# settled) reveal.
_LIVE_INCOMPLETE_DUEL_STATUSES = (DuelStatus.pending, DuelStatus.active)


def duel_side_hidden_condition(viewer_id: Optional[int]):
    """TRUE when the correlated ``Praxis`` is a side of a live duel and ``viewer_id``
    is not its author (#999).

    Single source of truth for both doors (``services.praxis.can_view_praxis`` and
    :func:`praxis_visibility_condition`) so they can't drift.
    """
    is_live_incomplete_side = exists(
        select(Duel.id).where(
            or_(
                Duel.challenger_praxis_id == Praxis.id,
                Duel.opponent_praxis_id == Praxis.id,
            ),
            Duel.status.in_(_LIVE_INCOMPLETE_DUEL_STATUSES),
        )
    )
    if viewer_id is None:
        return is_live_incomplete_side
    return and_(is_live_incomplete_side, Praxis.created_by_id != viewer_id)


def praxis_membership_condition(character_id: int):
    """TRUE when ``character_id`` is a ``PraxisMember`` of the correlated ``Praxis``.

    Membership, not authorship (ADR-0013: collab members didn't create it). The one
    spelling, shared with ``list_praxes`` filters. ``IN`` not a join so a praxis
    yields one row however many members match.
    """
    return Praxis.id.in_(
        select(PraxisMember.praxis_id).where(
            PraxisMember.character_id == character_id
        )
    )


def praxis_visibility_condition(viewer_id: Optional[int]):
    """Viewer gate (ADR-0024): submitted is public, in_progress is members-only,
    minus live duel sides (:func:`duel_side_hidden_condition`).

    In SQL so pagination stays honest. Answers "may this reader see it", not "is it
    in X's record" — AND :func:`praxis_membership_condition` for that.
    """
    visible = Praxis.status == PraxisStatus.submitted
    if viewer_id is not None:
        visible = or_(visible, praxis_membership_condition(viewer_id))
    return and_(visible, not_(duel_side_hidden_condition(viewer_id)))
