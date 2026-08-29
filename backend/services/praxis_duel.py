"""The duel a praxis is a side of — the by-praxis-id duel surface (ADR-0011).

Three functions keyed by ``praxis_id`` rather than ``duel_id``: the lookup
(:func:`get_duel_for_praxis`) and the two lifecycle nudges the praxis lifecycle
fires at it (:func:`maybe_settle_duel` on submit, and
:func:`discard_dissolved_duels_for_praxis` on delete). They read ``Duel`` and
``Praxis`` rows and nothing else, so they are dependency-free of both service
modules that want them:

- ``services.praxis`` — submit, delete, unsubmit and the duel-aware reads.
- ``services.vote`` — the duel-participant vote guard (#309).
- ``services.duel`` — its own already-in-a-duel guard, and the settle rule.

``services.duel`` imports ``services.praxis`` (``get_praxis``), so these three
could not live there without a cycle: every consumer above had to defer its
import into a function body, five of them in ``services.praxis`` alone, past
``SPEC-backend-architecture`` section 11's "more than three" tripwire (#1391,
#2872). Same shape and same reason as ``services.duel_outcome``. A pure move —
no behaviour change.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.duel import Duel, DuelStatus
from models.praxis import Praxis, PraxisStatus


async def get_duel_for_praxis(praxis_id: int, session: AsyncSession) -> Optional[Duel]:
    """Return the active Duel row for a praxis side, or None if not a duel."""
    result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis_id)
            | (Duel.opponent_praxis_id == praxis_id),
            Duel.status.in_(
                [DuelStatus.pending, DuelStatus.active, DuelStatus.settled]
            ),
        )
    )
    return result.scalar_one_or_none()


async def maybe_settle_duel(praxis_id: int, session: AsyncSession) -> None:
    """If this praxis is a duel side and both sides are now submitted, settle the duel.

    Called from submit_praxis after a solo praxis transitions to submitted.
    A no-op if the praxis is not part of an active duel.
    """
    duel = await get_duel_for_praxis(praxis_id, session)
    if duel is None or duel.status != DuelStatus.active:
        return

    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    opponent_praxis = (
        await session.get(Praxis, duel.opponent_praxis_id)
        if duel.opponent_praxis_id
        else None
    )

    if (
        challenger_praxis
        and challenger_praxis.status == PraxisStatus.submitted
        and opponent_praxis
        and opponent_praxis.status == PraxisStatus.submitted
    ):
        duel.status = DuelStatus.settled
        await session.flush()


async def discard_dissolved_duels_for_praxis(
    praxis_id: int, session: AsyncSession
) -> None:
    """Drop the ``declined`` Duel rows a praxis is about to be deleted with (#1831).

    Called from :func:`services.praxis.delete_praxis`. Every FK into ``praxis.id``
    cascades except the two duel columns, which are deliberately NO ACTION — so
    without this, a praxis that has ever carried a challenge could never be
    dropped again, however the duel ended. Dissolving the challenge first does not
    help: ``cancel_duel_challenge`` only sets ``status``, and
    ``challenger_praxis_id`` is NOT NULL.

    Owner ruling (2026-08-15). The two documented rulings this looks like it
    reverses are each about a *different* duel than this one:

    - "a duel is a contract between two players … it should refuse the delete
      rather than vanish with it" (``models/praxis.py``, migration 0006) was
      written about a **live contract**. Still true, and still enforced: a
      ``pending``/``active`` duel is not touched here and the FK refuses.
    - "Duel row is kept for history" (``models/duel.py``) is about a duel that
      **happened**. Still true: ``settled`` and ``resolved`` are not touched here,
      so a forfeited side that unsubmits back to editing still cannot be dropped.

    A challenge dissolved before the contest ever happened is neither. It is an
    abandoned draft, and there is no history in it worth keeping, so it goes with
    the praxis.

    **Why the status is the whole predicate.** ``declined`` is only ever written
    on the decline path (from ``pending``) and by ``cancel_duel_challenge`` (from
    ``pending``/``active``), and nothing transitions out of it. A duel produces a
    result only by becoming votable (``settled``) or by having its outcome frozen
    at era close (``resolved``), and a declined duel has been neither. Once its
    praxis is gone the row is unreachable from every read besides: this module,
    ``services.duel`` and ``services.vote`` exclude ``declined``,
    ``services.badge`` counts only active/settled/resolved, the era sweep in
    ``services.era`` takes only
    active/settled, and the feed's challenge query inner-joins the challenger praxis.

    Plural on purpose: ``issue_duel_challenge``'s already-in-a-duel guard is
    :func:`get_duel_for_praxis`, which excludes ``declined``, so challenge →
    cancel → challenge again leaves a praxis carrying several declined rows.
    """
    result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis_id)
            | (Duel.opponent_praxis_id == praxis_id),
            Duel.status == DuelStatus.declined,
        )
    )
    for duel in result.scalars().all():
        await session.delete(duel)
    await session.flush()
