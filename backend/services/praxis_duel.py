"""Duel lookups keyed by ``praxis_id`` (ADR-0011).

A leaf (reads only ``Duel``/``Praxis``) so ``services.praxis``, ``.vote`` and
``.duel`` can import it without a cycle (``duel`` imports ``praxis``; #2872).
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
    """Settle the active duel this praxis is a side of once both sides are submitted."""
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

    The duel FKs into ``praxis.id`` are NO ACTION, so without this a praxis that
    ever carried a challenge could never be deleted. Live (``pending``/``active``)
    and historical (``settled``/``resolved``) duels are left alone so the FK still
    refuses (owner ruling 2026-08-15). ``declined`` is terminal and never produced
    a result, and every other read excludes it. Plural: challenge, cancel,
    challenge again leaves several declined rows.
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
