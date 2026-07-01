"""The ADR-0012 lazy-consensus state machine for collab submission.

A collab goes Live by *silence is consent*: the first member to submit opens a
``collab_auto_submit_days`` window; an edit hard-resets it; if everyone has
submitted the collab seals immediately; a leave can release the last hold; a kick
resets the whole group. This module owns that window/deadline math and the
``has_submitted`` bookkeeping so the rule lives in one place instead of leaking
across submit/leave/kick/edit/read in ``services.praxis``.

The praxis lifecycle/membership functions call these transitions; they no longer
carry the window logic inline. Duel settling is deliberately NOT here — it
depends on ``services.duel`` (which imports ``services.praxis``), so keeping it
out avoids an import cycle; the submit path runs it after ``on_submit`` reports
the collab sealed.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.praxis import Praxis, PraxisStatus, PraxisType
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row


def _apply_seal(praxis: Praxis) -> None:
    """Pure state mutation for going Live: mark the whole group submitted and clear
    the window. Caller flushes and recalculates member stats."""
    praxis.status = PraxisStatus.submitted
    praxis.submitted_at = datetime.now(timezone.utc)
    praxis.submit_proposed_at = None
    for member in praxis.members:
        member.has_submitted = True


async def seal_to_live(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
    """Seal a collab to Live: status=submitted, mark everyone submitted, recalc members.

    Shared by the lazy-on-access timeout and the leave path.
    """
    _apply_seal(praxis)
    await session.flush()
    era_row = await get_current_era_row(session)
    for member in praxis.members:
        await recalculate_character_stats(member.character_id, session, era, era_row=era_row)
    await session.flush()


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
        or praxis.status != PraxisStatus.in_progress
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
    await session.flush()
    if was_live:
        # Leaving Live changes scoring — recompute every member's stats.
        era_row = await get_current_era_row(session)
        for member in praxis.members:
            await recalculate_character_stats(member.character_id, session, era, era_row=era_row)
        await session.flush()


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
            break
    await session.flush()
    await session.refresh(praxis)

    if all(m.has_submitted for m in praxis.members):
        _apply_seal(praxis)
        await session.flush()
        return True
    if praxis.type == PraxisType.collab and praxis.submit_proposed_at is None:
        # First member to submit opens the silence-is-consent countdown.
        praxis.submit_proposed_at = datetime.now(timezone.utc)
        await session.flush()
    return False


async def on_member_leave(
    praxis: Praxis, session: AsyncSession, era: EraConfig
) -> None:
    """Release a hold on leave: if everyone who stayed has already submitted, the
    collab reaches consensus and goes Live. Call after removing the leaver."""
    remaining = praxis.members
    if (
        remaining
        and praxis.status != PraxisStatus.submitted
        and all(m.has_submitted for m in remaining)
    ):
        await seal_to_live(praxis, session, era)


async def on_member_kicked(praxis: Praxis, session: AsyncSession) -> None:
    """A kick resets the changed group back to drafting (ADR-0013): cancel any
    pending-publish window and clear submissions so the group must re-consent.
    Call after removing the kicked member."""
    for member in praxis.members:
        member.has_submitted = False
    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    await session.flush()
