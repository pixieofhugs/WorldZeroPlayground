"""Nudging a collaborator or a duel rival who has not filed yet (#1083).

The whole feature is three rules, and they are the reason this is a service and
not four lines in a route:

1. **Collab — you must have cast.** Any member who has already filed their own
   part may nudge a member who has not. You do not get to hurry people you have
   not caught up with, and the public does not get to hurry anyone.
2. **Duel — participant only, and only while the duel is ``active``.** See
   :func:`_authorize_duel` for why ``pending`` is excluded even though it is
   also a live-incomplete status.
3. **One nudge per sender → recipient → praxis per 24h**, 422 on a repeat.

Rule 3 is a safety control, not a nicety. A button that pokes a *named* player
on demand is a harassment vector the moment it is unlimited, so the window is
enforced here, on the write path, rather than by hiding the button — a disabled
button is a UI preference and this is a rule.

Delivery is the activity feed, never a message: see ``models/nudge.py``.

**One writer, two front doors** (#1415). :func:`send_nudge` pokes one named
player; :func:`nudge_the_crew` pokes everyone a collab is still waiting on in a
single request. They are not two implementations — the single form delegates to
the batch and raises on the one entry it gets back, the same shape #1377/#1378
used for the task and praxis gathers, so the two answers cannot drift. Rule 3
makes the batch inherently *partial* success: see :class:`schemas.nudge.NudgeResultOut`.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.duel import Duel, DuelStatus
from models.nudge import Nudge
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from schemas.nudge import NudgeOut, NudgeResultOut

# One per sender → recipient → praxis per 24h (#1083). Expressed as a window
# rather than a stored "next allowed at" so the rule is re-readable from the
# rows alone: `created_at > now() - NUDGE_COOLDOWN`.
NUDGE_COOLDOWN = timedelta(days=1)

# A praxis that is still waiting on someone. `pending` is a collab mid-consensus
# (ADR-0012) — the window is open and a member can still be the holdout — so it
# counts as unfinished exactly the way `_awaiting_submission_query` treats it.
_OPEN_PRAXIS_STATUSES = (PraxisStatus.in_progress, PraxisStatus.pending)


async def _load_praxis_with_members(
    praxis_id: int, session: AsyncSession
) -> tuple[Praxis, dict[int, PraxisMember]]:
    """The target praxis and its roster keyed by character, or 404.

    The roster is read as its own query rather than through ``Praxis.members``:
    one query for the whole crew however large it is — which is what lets every
    per-recipient check below be a dict lookup — and never a collection the
    session happens to have cached from earlier in the request.
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

    ``pending`` is the other live-incomplete duel status
    (``_LIVE_INCOMPLETE_DUEL_STATUSES`` in ``services/praxis.py``) and is
    deliberately **excluded**, on two grounds:

    - At ``pending`` there is no opponent praxis at all — ``opponent_praxis_id``
      is NULL until the challenge is accepted — so there is no praxis for the
      recipient to owe, and this whole feature is keyed to one.
    - What is outstanding at ``pending`` is a *decision*, not a submission, and
      it already sits in the rival's ``requests`` tab as a ``duel_challenge``
      feed item with accept/decline on it. A poke there would be pressure on a
      choice rather than a reminder about a task.

    The issue names only ``active``; this is why that is the right reading and
    not an omission.
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

    # The *other* side. A duel is two linked solo praxes (ADR-0011), so the
    # sender is a participant exactly when they authored the side that is not
    # the target — which also rules out nudging yourself through the duel path.
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

    Returns None once the cooldown has lapsed, which is the whole point: this is
    the value the roster row reads its disabled state from, so "there is a
    timestamp" and "you may not nudge again yet" are the same fact, resolved by
    the same constant, on the server. A raw last-nudged-ever timestamp would put
    the 24h arithmetic on the client where it can drift from :data:`NUDGE_COOLDOWN`.
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

    The roster is a list, so the per-row lookup is done once as a map rather
    than N times. Same window as :func:`latest_nudge_at`.
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

    Every check here is a fact about **one recipient**, which is exactly what
    makes it an entry in a batch response rather than a batch-wide failure. The
    batch-wide verdicts (404, finished praxis, unauthorised sender) are raised
    by :func:`_send_nudges` before this is reached.

    Checking the member row rather than the praxis status covers both shapes at
    once: a collab member who has cast while the group waits on others, and a
    duel side that has already been filed.
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

    Cost is flat in the size of the crew and that is deliberate: the roster is
    one query, the cooldown is read once for the whole praxis via
    :func:`nudged_at_map`, and the accepted nudges are added and flushed
    together so SQLAlchemy emits them as one statement. A loop over
    :func:`send_nudge` would be four queries per recipient;
    ``tests/integration/test_nudge_bulk.py`` asserts the counts stay equal.

    Batching changes no permission. A crew press writes exactly the rows N
    separate presses would have written — same authorisation, same 24h window
    per recipient — so it is a round-trip saving, not a wider power.
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
        # A duel side is `type='solo'` + a Duel row (ADR-0011) — never
        # `type='duel'` — so anything that is not a collab is routed here and
        # `_authorize_duel` 403s a genuinely solo praxis by finding no duel.
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
        # One flush for the whole batch. `created_at` is a server default and
        # comes back on the INSERT's RETURNING, so no row needs a refresh.
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
                str(refusals[to_character_id].detail)
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

    ``praxis_id`` is the praxis the **recipient** owes — the shared collab for a
    collab, the rival's own side for a duel. That is what the recipient's feed
    card links to and what the rate limit is keyed on.

    Delegates to :func:`_send_nudges` and re-raises the single entry's refusal,
    so this route and the crew route cannot come to different verdicts about the
    same recipient.
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

    The recipients are chosen **here**, not by the caller: the crew is derivable
    from the member rows (not filed, not you), so there is no id list on the
    wire to validate, to cap, or to probe membership with. The client presses
    one button and the server decides who that means.
    """
    return await _send_nudges(praxis_id, from_character_id, None, session)
