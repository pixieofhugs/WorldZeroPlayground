"""The ADR-0012 lazy-consensus state machine for collab submission.

A collab goes Live by *silence is consent*: the first member to submit opens a
``collab_auto_submit_days`` window; an edit hard-resets it; if everyone has
submitted the collab seals immediately; a leave can release the last hold; a kick
resets the whole group. This module owns that window/deadline math and the
``has_submitted`` bookkeeping so the rule lives in one place instead of leaking
across submit/leave/kick/edit/read in ``services.praxis``.

This module also owns the ``collab → solo`` mutation (:func:`convert_to_solo`),
because a collab that drops to one member converts (ADR-0060) and the *voluntary*
takeover in ``services.praxis.change_praxis_type`` must not drift from it. It
lives here rather than there because ``services.praxis`` imports this module.

The praxis lifecycle/membership functions call these transitions; they no longer
carry the window logic inline. Duel settling is deliberately NOT here — it
depends on ``services.duel`` (which imports ``services.praxis``), so keeping it
out avoids an import cycle; the submit path runs it after ``on_submit`` reports
the collab sealed.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.praxis import Praxis, PraxisInviteStatus, PraxisStatus, PraxisType
from models.taunt_message import TauntTriggerType
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.era import get_era_row_for_praxis
from services.taunt_service import fan_out_taunt


async def _apply_seal(praxis: Praxis, session: AsyncSession) -> None:
    """The transition into ``submitted``: mark the whole group submitted, clear
    the window, and needle each member's foes. Caller flushes and recalculates
    member stats.

    **Establishes the invariant** ``status == submitted ⟹ submitted_at IS NOT NULL``.
    This is the only writer of ``praxis.submitted_at``, and every route to
    ``status=submitted`` runs through it: solo and duel seal on the first submit
    (one member, so ``all(has_submitted)`` holds immediately), collab seals via
    :func:`seal_to_live`. Set both fields together, always. The reader that
    depends on it — and drops any row that violates it — is the
    ``status == submitted`` branch of ``services.praxis.list_praxes``, whose
    feed sort orders on ``submitted_at`` (#658).

    Being the single such writer is also why the ADR-0068 ``praxis_complete``
    taunt fires here rather than at either call site: one taunt **per member**,
    each reaching that member's own subscribers, so a collab needles every
    member's rivals and a duel side needles its own (ADR-0013 co-ownership).
    Unsubmit-then-resubmit fires again — accepted, rather than carry a praxis
    reference on the taunt row purely to deduplicate.
    """
    praxis.status = PraxisStatus.submitted
    now = datetime.now(timezone.utc)
    praxis.submitted_at = now
    praxis.submit_proposed_at = None
    for member in praxis.members:
        if not member.has_submitted:
            member.submitted_at = now
        member.has_submitted = True
    # Second pass on purpose: the fan-out flushes, and the seal must be whole
    # before any of it reaches the database.
    for member in praxis.members:
        await fan_out_taunt(member.character_id, TauntTriggerType.praxis_complete, session)


async def seal_to_live(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
    """Seal a collab to Live: status=submitted, mark everyone submitted, recalc members.

    Shared by the lazy-on-access timeout and the leave path.
    """
    await _apply_seal(praxis, session)
    await session.flush()
    await recalculate_members_stats(praxis, session, era)


async def settle_if_window_lapsed(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Lazy-on-access timeout (ADR-0012): auto-publish a pending collab whose window elapsed.

    Called from the read paths (``get_praxis``, ``list_praxes``) so no scheduler is
    needed. Cheap no-op for everything except a collab with an open, lapsed window.

    ponytail: a collab nobody ever reads stays in_progress until first touch (members'
    scores understated); self-heals on next read of any kind. Upgrade path if deterministic
    timing is ever needed: an in-process periodic sweep calling this same helper.
    """
    if (
        praxis.type != PraxisType.collab
        or praxis.status not in (PraxisStatus.in_progress, PraxisStatus.pending)
        or praxis.submit_proposed_at is None
    ):
        return
    deadline = praxis.submit_proposed_at + timedelta(days=era.collab_auto_submit_days)
    if datetime.now(timezone.utc) < deadline:
        return
    await seal_to_live(praxis, session, era)


async def on_member_edit(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Hard reset on a collab edit (ADR-0012): an edit means "we're not done".

    Cancels the pending-publish window, clears *everyone's* ``has_submitted``, and
    returns the collab to drafting. No-op for solo/duel, or a collab that is neither
    pending nor Live. Used by title/body edits and media add/remove.
    """
    if praxis.type != PraxisType.collab:
        return
    if praxis.submit_proposed_at is None and praxis.status != PraxisStatus.submitted:
        return
    was_live = praxis.status == PraxisStatus.submitted
    praxis.submit_proposed_at = None
    praxis.status = PraxisStatus.in_progress
    for member in praxis.members:
        member.has_submitted = False
        member.submitted_at = None
    await session.flush()
    if was_live:
        # Leaving Live changes scoring — recompute every member's stats.
        await recalculate_members_stats(praxis, session, era)


async def on_submit(
    praxis: Praxis, character_id: int, session: AsyncSession, era: EraConfig
) -> bool:
    """Record a member's submission and advance the window.

    Marks the member submitted, then either seals the collab (everyone in) or opens
    the silence-is-consent window (first collab submit). Solo/duel always have one
    member, so they seal immediately. Returns ``True`` iff the praxis just sealed to
    Live, so the caller can settle any duel and recalc member stats (both kept in
    ``services.praxis`` to avoid a ``services.duel`` import cycle).
    """
    for member in praxis.members:
        if member.character_id == character_id:
            member.has_submitted = True
            member.submitted_at = datetime.now(timezone.utc)
            break
    await session.flush()
    await session.refresh(praxis)

    if all(m.has_submitted for m in praxis.members):
        await _apply_seal(praxis, session)
        await session.flush()
        return True
    if praxis.type == PraxisType.collab:
        # A partial collab submit is a first-class "pending" state (#590): some
        # members are in, not all. The first submit also opens the
        # silence-is-consent countdown.
        praxis.status = PraxisStatus.pending
        if praxis.submit_proposed_at is None:
            praxis.submit_proposed_at = datetime.now(timezone.utc)
        await session.flush()
    return False


async def convert_to_solo(
    praxis: Praxis,
    new_owner_character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """The shared ``collab → solo`` mutation. One body, two callers, no drift.

    - ``services.praxis.change_praxis_type`` — a *voluntary* takeover (#321): any
      member may claim the praxis, and passes itself as the new owner.
    - :func:`on_member_leave` — an *involuntary* conversion when a collab drops to
      its last member, at any status (ADR-0060); the survivor is the new owner.

    What it does: retype the praxis, hand ``created_by_id`` to the new owner, drop
    every other member and every pending invite, and close any open ADR-0012
    pending-publish window. Content, id and media are preserved — never
    delete+recreate. The ``created_by_id`` reassignment is load-bearing:
    ``delete_praxis`` is creator-only, so without it a survivor who did not start
    the praxis could not drop it and would be stranded holding a task signup.

    What it deliberately leaves at the call site: authorization, status guards
    (the takeover keeps its own 422 — that guard protects a *choice*, and this
    conversion is a *consequence*), and stat recalculation.

    The window is cancelled *before* the retype, because ``on_member_edit``
    no-ops on a non-collab — and only while the praxis is unpublished, because on
    a ``submitted`` praxis ``on_member_edit`` would unpublish it and wipe every
    cast. ADR-0060's submitted case must not do that: the praxis stays Live and
    only its scoring model changes.
    """
    if praxis.status != PraxisStatus.submitted:
        await on_member_edit(praxis, session, era)

    # Mutate the loaded collections so the delete-orphan cascade fires *and* the
    # returned/serialized praxis reflects the drop (session.delete alone would
    # leave the selectin-cached collections stale).
    praxis.type = PraxisType.solo
    praxis.created_by_id = new_owner_character_id
    for member in list(praxis.members):
        if member.character_id != new_owner_character_id:
            praxis.members.remove(member)
    for invite in list(praxis.invites):
        if invite.status == PraxisInviteStatus.pending:
            praxis.invites.remove(invite)
    await session.flush()


async def on_member_leave(
    praxis: Praxis, session: AsyncSession, era: EraConfig
) -> None:
    """Release a hold on leave, then convert a deserted collab. Call after
    removing the leaver.

    Two transitions, in this order:

    1. If everyone who stayed has already submitted, the departure completes the
       consensus and the collab goes Live.
    2. ADR-0060: if exactly one member remains, the praxis is no longer a
       collaboration — convert it to a solo praxis owned by the survivor, at any
       status. This is why the zero-member state is unreachable: the last
       member's exit is *drop*, not leave.

    The order matters. Converting first would cancel the pending-publish window
    and wipe the survivor's own cast, discarding a consensus the departure had
    just completed. Sealing first, then converting, keeps the Live praxis Live
    and merely reprices it.
    """
    remaining = praxis.members
    if (
        remaining
        and praxis.status != PraxisStatus.submitted
        and all(m.has_submitted for m in remaining)
    ):
        await seal_to_live(praxis, session, era)

    if praxis.type == PraxisType.collab and len(praxis.members) == 1:
        survivor_character_id = praxis.members[0].character_id
        await convert_to_solo(praxis, survivor_character_id, session, era)
        if praxis.status == PraxisStatus.submitted:
            # Unlike the takeover path, this fires on scored praxes: the
            # collab_own/other_modifier pair gives way to own/other_task_modifier
            # under an already-published praxis, so the survivor is repriced.
            era_row = await get_era_row_for_praxis(praxis, session)
            await recalculate_character_stats(
                survivor_character_id, session, era, era_row=era_row
            )
            await session.flush()


async def on_member_kicked(praxis: Praxis, session: AsyncSession) -> None:
    """A kick resets the changed group back to drafting (ADR-0013): cancel any
    pending-publish window and clear submissions so the group must re-consent.
    Call after removing the kicked member."""
    for member in praxis.members:
        member.has_submitted = False
        member.submitted_at = None
    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    await session.flush()


async def on_member_unsubmit(
    praxis: Praxis, character_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Pull back a single member's submission from a pending collab (#590).

    Only the caller's ``has_submitted`` clears. If anyone else is still in, the
    collab stays ``pending``; if the caller was the last hold-out it returns to
    ``in_progress`` and the silence-is-consent window closes. Pending collabs are
    unscored, so no stat recalc is needed. Solo/duel never reach ``pending``.
    """
    for member in praxis.members:
        if member.character_id == character_id:
            member.has_submitted = False
            member.submitted_at = None
            break
    if any(m.has_submitted for m in praxis.members):
        praxis.status = PraxisStatus.pending
    else:
        praxis.status = PraxisStatus.in_progress
        praxis.submit_proposed_at = None
    await session.flush()
