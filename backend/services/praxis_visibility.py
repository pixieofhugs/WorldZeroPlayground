"""Who may see a praxis row, in SQL (ADR-0024).

Three composable predicates and nothing else: the membership spelling
(:func:`praxis_membership_condition`), the duel-side carve-out
(:func:`duel_side_hidden_condition`, #999), and the viewer gate that combines them
(:func:`praxis_visibility_condition`). They read ``Praxis``, ``PraxisMember`` and
``Duel`` columns and return SQLAlchemy expressions — no session, no lifecycle, no
service dependency, so this is a leaf every read surface can import at module
level.

Split out of ``services/praxis.py`` (#1391 cut 4, #2871) — a pure move, no
behaviour change. ``services.activity_feed`` wanted one predicate and was reaching
into the 1,700-line lifecycle module for it; ``services.praxis`` is a caller too,
for :func:`list_praxes` and the ``/praxes/{id}`` detail gate
(``can_view_praxis``). Same shape and same reason as ``services/duel_outcome.py``
and ``services/praxis_duel.py``.

Cut 4's other named symbols — the Double Dipper id-set readers, including
``in_progress_praxis_ids`` and ``submitted_praxis_ids`` — landed in
``services/signup_eligibility.py`` with cut 3 (#2870) and stay there: they are
read directly by ``gather_signup_facts``, and they answer "may this character
*sign up*", not "may this viewer *read*". Different question, different module.
"""

from typing import Optional

from sqlalchemy import and_, exists, not_, or_, select

from models.duel import Duel, DuelStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus

# Statuses in which a duel is still live and its outcome incomplete: the
# opponent has not yet committed a competing side (ADR-0011). While a duel sits
# in one of these, a *submitted* side is author-only — revealing it early would
# let the opponent crib the other body, or leak a private draft to spectators
# (#999). Every terminal-ish state reveals: ``settled``/``resolved`` (both cast),
# ``declined`` (no second party to protect), and forfeit (which keeps the duel
# ``settled``) all fall outside this tuple.
_LIVE_INCOMPLETE_DUEL_STATUSES = (DuelStatus.pending, DuelStatus.active)


def duel_side_hidden_condition(viewer_id: Optional[int]):
    """SQL predicate — TRUE when the correlated ``Praxis`` row must be HIDDEN
    because it is a side of a live, incomplete duel and ``viewer_id`` is not its
    author (#999).

    This is the single source of truth shared by BOTH visibility doors — the
    ``/praxes/{id}`` detail gate (``services.praxis.can_view_praxis``) and the
    feed/list predicate (:func:`praxis_visibility_condition`). Keeping one helper
    means the detail door and the feed predicate can never drift and leave the
    leak open on one path while the other is patched. A submitted duel side is
    world-public only once the duel seals (both cast) or otherwise terminates;
    until then only its author may see it.

    Public (it was ``_duel_side_hidden_condition`` while it lived inside
    ``services/praxis.py``) because the detail door is on the other side of this
    module boundary now and imports it by name — same rename-on-extraction as
    ``count_in_progress_praxes`` in #2870.
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
        # Anonymous / no character: never the author, so always hidden.
        return is_live_incomplete_side
    return and_(is_live_incomplete_side, Praxis.created_by_id != viewer_id)


def praxis_membership_condition(character_id: int):
    """SQL predicate — TRUE when ``character_id`` holds a ``PraxisMember`` row on
    the correlated ``Praxis``.

    The single spelling of "is part of this praxis" in SQL. Membership is not
    authorship (ADR-0013 co-ownership): an accepted collab invite makes you a
    member of a praxis you did not create, while solo/duel praxes have exactly
    one member — their creator — so for those the two coincide.

    Shared by the viewer-scoped visibility gate (:func:`praxis_visibility_condition`)
    and by the subject-scoped ``character_id``/``member_id`` filters in
    ``services.praxis.list_praxes``, so a second membership join cannot drift from
    the first.

    ``IN (subquery)`` rather than a join: a praxis yields exactly one row however
    many of its members match.
    """
    return Praxis.id.in_(
        select(PraxisMember.praxis_id).where(
            PraxisMember.character_id == character_id
        )
    )


def praxis_visibility_condition(viewer_id: Optional[int]):
    """SQL predicate for who may see a praxis (ADR-0024).

    ``submitted`` praxes are public; an ``in_progress`` praxis is visible only to
    its members (character-scoped, matching ``_require_member``). Push this into
    the query so pagination stays honest instead of post-filtering a page.

    Exception (#999): a ``submitted`` side of a live, incomplete duel stays
    author-only until the duel seals — see :func:`duel_side_hidden_condition`,
    the same guard ``services.praxis.can_view_praxis`` runs so the two doors can't
    drift.

    This is the *viewer* gate and nothing else: it answers "may this reader see
    the row", never "is this row part of character X's record". A caller that
    wants the latter ANDs :func:`praxis_membership_condition` on top — see the
    profile grid in ``services.praxis.list_praxes`` and
    ``GET /characters/{id}/praxes``.
    """
    visible = Praxis.status == PraxisStatus.submitted
    if viewer_id is not None:
        visible = or_(visible, praxis_membership_condition(viewer_id))
    return and_(visible, not_(duel_side_hidden_condition(viewer_id)))
