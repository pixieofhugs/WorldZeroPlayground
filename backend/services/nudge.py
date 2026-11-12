"""Nudging a collaborator or duel rival who hasn't filed yet (#1083).

1. Collab: only a member who has filed may nudge.
2. Duel: only the rival, only while ``active``.
3. One nudge per sender → recipient → praxis per 24h (422). A safety control
   against harassment, enforced on the write path, not by hiding the button.

Delivery is the activity feed (``models/nudge.py``). :func:`send_nudge`
delegates to the batch writer so the two can't drift (#1415); batches can
partially succeed.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import detail_message
from models.duel import Duel, DuelStatus
from models.nudge import Nudge
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from schemas.nudge import NudgeOut, NudgeResultOut

# A window, not a stored "next allowed at", so rows alone answer it.
NUDGE_COOLDOWN = timedelta(days=1)

# `pending` = collab mid-consensus (ADR-0012), still unfinished.
_OPEN_PRAXIS_STATUSES = (PraxisStatus.in_progress, PraxisStatus.pending)


async def _load_praxis_with_members(
    praxis_id: int, session: AsyncSession
) -> tuple[Praxis, dict[int, PraxisMember]]:
    """The target praxis and its roster keyed by character, or 404.

    Roster is its own query, not ``Praxis.members``: one query, never a stale cache.
    """
    result = await session.execute(
        select(Praxis).where(Praxis.id == praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")

    roster = await session.execute(
        select(PraxisMember).where(PraxisMember.praxis_id == praxis_id)
    )
    return praxis, {member.character_id: member for member in roster.scalars().all()}


def _authorize_collab(
    members: dict[int, PraxisMember], from_character_id: int
) -> None:
    """Rule 1: the sender must be a member of this collab AND have cast."""
    sender = members.get(from_character_id)
    if sender is None:
        raise HTTPException(
            status_code=403,
            detail="Only a member of this collaboration can nudge.",
        )
    if not sender.has_submitted:
        raise HTTPException(
            status_code=403,
            detail="File your own part before nudging anyone else.",
        )


async def _authorize_duel(
    praxis: Praxis, from_character_id: int, session: AsyncSession
) -> None:
    """Rule 2: the sender must be the other side of an ``active`` duel.

    ``pending`` is excluded on purpose: there's no opponent praxis yet, and the
    outstanding thing is a decision already in the rival's requests tab.
    """
    result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis.id)
            | (Duel.opponent_praxis_id == praxis.id)
        )
    )
    duel = result.scalar_one_or_none()
    if duel is None:
        raise HTTPException(
            status_code=403,
            detail="This praxis is not part of a duel.",
        )
    if duel.status != DuelStatus.active:
        raise HTTPException(
            status_code=422,
            detail="Only an active duel can be nudged.",
        )

    # Sender must author the other side (ADR-0011); also blocks self-nudges.
    other_praxis_id = (
        duel.opponent_praxis_id
        if duel.challenger_praxis_id == praxis.id
        else duel.challenger_praxis_id
    )
    sender_side = (
        await session.get(Praxis, other_praxis_id)
        if other_praxis_id is not None
        else None
    )
    if sender_side is None or sender_side.created_by_id != from_character_id:
        raise HTTPException(
            status_code=403,
            detail="Only the rival in this duel can nudge.",
        )


async def latest_nudge_at(
    praxis_id: int,
    from_character_id: int,
    to_character_id: int,
    session: AsyncSession,
    *,
    now: Optional[datetime] = None,
) -> Optional[datetime]:
    """When ``from`` last nudged ``to`` about ``praxis`` — **within the window**.

    None once lapsed, so the client never does the 24h arithmetic.
    """
    cutoff = (now or datetime.now(timezone.utc)) - NUDGE_COOLDOWN
    result = await session.execute(
        select(Nudge.created_at)
        .where(
            Nudge.praxis_id == praxis_id,
            Nudge.from_character_id == from_character_id,
            Nudge.to_character_id == to_character_id,
            Nudge.created_at > cutoff,
        )
        .order_by(Nudge.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def nudged_at_map(
    praxis_id: int,
    from_character_id: int,
    session: AsyncSession,
    *,
    now: Optional[datetime] = None,
) -> dict[int, datetime]:
    """``{recipient_character_id: nudged_at}`` for one viewer on one praxis.

    Same window as :func:`latest_nudge_at`.
    """
    cutoff = (now or datetime.now(timezone.utc)) - NUDGE_COOLDOWN
    result = await session.execute(
        select(Nudge.to_character_id, Nudge.created_at)
        .where(
            Nudge.praxis_id == praxis_id,
            Nudge.from_character_id == from_character_id,
            Nudge.created_at > cutoff,
        )
        .order_by(Nudge.created_at.desc())
    )
    latest: dict[int, datetime] = {}
    for to_character_id, created_at in result.all():
        latest.setdefault(to_character_id, created_at)
    return latest


def _refuse(
    from_character_id: int,
    to_character_id: int,
    members: dict[int, PraxisMember],
    nudged_at: dict[int, datetime],
) -> Optional[HTTPException]:
    """Why this one recipient may not be nudged, or None if they may.

    Per-recipient only; batch-wide refusals are raised earlier.
    """
    if to_character_id == from_character_id:
        return HTTPException(status_code=400, detail="You cannot nudge yourself.")
    recipient = members.get(to_character_id)
    if recipient is None:
        return HTTPException(
            status_code=403, detail="That player is not part of this praxis."
        )
    if recipient.has_submitted:
        return HTTPException(
            status_code=422, detail="That player has already filed their part."
        )
    if to_character_id in nudged_at:
        return HTTPException(
            status_code=422,
            detail="You already nudged this player about this praxis today.",
        )
    return None


async def _send_nudges(
    praxis_id: int,
    from_character_id: int,
    to_character_ids: Optional[list[int]],
    session: AsyncSession,
) -> list[NudgeResultOut]:
    """The one writer. ``to_character_ids=None`` means "everyone still owing".

    Query count is flat in crew size (``test_nudge_bulk.py``). Batching grants
    no extra power: same rows as N single presses.
    """
    praxis, members = await _load_praxis_with_members(praxis_id, session)

    if praxis.status not in _OPEN_PRAXIS_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Nothing is outstanding on this praxis.",
        )

    if praxis.type == PraxisType.collab:
        _authorize_collab(members, from_character_id)
    else:
        # Duel sides are `solo` + a Duel row (ADR-0011); true solos 403 there.
        await _authorize_duel(praxis, from_character_id, session)

    recipients = (
        to_character_ids
        if to_character_ids is not None
        else [
            character_id
            for character_id, member in members.items()
            if not member.has_submitted and character_id != from_character_id
        ]
    )

    nudged_at = await nudged_at_map(praxis_id, from_character_id, session)

    refusals: dict[int, HTTPException] = {}
    created: dict[int, Nudge] = {}
    for to_character_id in recipients:
        refusal = _refuse(from_character_id, to_character_id, members, nudged_at)
        if refusal is not None:
            refusals[to_character_id] = refusal
            continue
        nudge = Nudge(
            from_character_id=from_character_id,
            to_character_id=to_character_id,
            praxis_id=praxis_id,
        )
        session.add(nudge)
        created[to_character_id] = nudge

    if created:
        # `created_at` comes back via RETURNING; no refresh needed.
        await session.flush()

    return [
        NudgeResultOut(
            to_character_id=to_character_id,
            nudge=(
                NudgeOut.model_validate(created[to_character_id])
                if to_character_id in created
                else None
            ),
            error=(
                # Not str(): a coded {code, message} detail would render its repr.
                detail_message(refusals[to_character_id].detail)
                if to_character_id in refusals
                else None
            ),
            status_code=(
                refusals[to_character_id].status_code
                if to_character_id in refusals
                else None
            ),
        )
        # An entry for every requested recipient, in request order (#1378).
        for to_character_id in recipients
    ]


async def send_nudge(
    praxis_id: int,
    from_character_id: int,
    to_character_id: int,
    session: AsyncSession,
) -> NudgeOut:
    """Record one nudge, or raise.

    ``praxis_id`` is the praxis the **recipient** owes (the rival's side for a duel).
    """
    result = (
        await _send_nudges(praxis_id, from_character_id, [to_character_id], session)
    )[0]
    if result.nudge is None:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.nudge


async def nudge_the_crew(
    praxis_id: int,
    from_character_id: int,
    session: AsyncSession,
) -> list[NudgeResultOut]:
    """Nudge everyone this praxis is still waiting on, one entry each (#1415).

    Recipients are chosen server-side, so no id list to validate or probe with.
    """
    return await _send_nudges(praxis_id, from_character_id, None, session)
