"""The ADR-0012 lazy-consensus state machine for collab submission.

A collab goes Live by *silence is consent*: a member **proposes**, which opens a
``collab_auto_submit_days`` window; an edit hard-resets it; once every member has
approved the collab seals immediately; a leave can release the last hold; a kick
resets the whole group. This module owns that window/deadline math and the
per-member bookkeeping so the rule lives in one place instead of leaking
across submit/leave/kick/edit/read in ``services.praxis``.

**Three signals, not one button** (ADR-0079). What used to be one per-member
``has_submitted`` doing three jobs is now:

- **Done** — :func:`mark_done`, and ``PraxisMember.is_done``. Purely social, a
  roster badge, freely reversible. It gates nothing and starts nothing, which is
  why nothing else in this module reads it.
- **Propose** — one per praxis, held on ``Praxis.submit_proposed_at``. Opens the
  publish window; the proposer implicitly approves.
- **Approve** — per member, against the live proposal, and still carried by
  ``PraxisMember.has_submitted``. All approved → publish.

``has_submitted`` keeps its name because it is also the wire field and the feed's
column; ADR-0079 splits the *meanings*, and this is the one that stayed.

The rule that replaces #1745's freeze: **an edit while a proposal is live cancels
the proposal** — approvals clear, the countdown stops, the praxis is back to
drafting. ADR-0012's "an edit means we're not done" survives verbatim; it simply
fires on a CRDT update now (:func:`on_room_edit`) instead of on a discrete save.

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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.praxis import Praxis, PraxisInviteStatus, PraxisStatus, PraxisType
from models.taunt_message import TauntTriggerType
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.era import get_current_era_row_safe, get_era_row_for_praxis
from services.habit_bonus import stamp_habit_bonus
from services.praxis_room import discard_room_document
from services.taunt_service import fan_out_taunt


async def _apply_seal(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
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

    Being that single writer is also what makes it the right place to stamp
    ``praxis.era_id`` (#1398): era membership is a **seal-time** fact, so the
    column moves with ``submitted_at`` and is written on every entry into
    ``submitted`` — an unsubmit-then-resubmit across an era boundary therefore
    re-attributes the praxis to the era it was really sealed in. Nothing reads
    the column yet; #1345's era-bounded score recalculation is the consumer, and
    rides its own PR.

    It is the right place to stamp each member's ``habit_bonus_points`` (#1617)
    for the same reason: whether a praxis was filed *habitually* is a seal-time
    fact about the moment ``submitted_at`` records, not something a scorer should
    re-derive later from whatever praxis list it happens to hold. Two consequences
    follow, and are load-bearing rather than incidental:

    - **Unsubmit-then-resubmit re-evaluates the bonus** against the new
      ``submitted_at`` — exactly what ``era_id`` already does. A member who has
      fallen out of the habit loses the points on re-seal; one who has picked it
      up gains them.
    - **A collab seals once for the group, but the bonus is per member.** Each is
      measured against *their own* praxis history, never the author's, which is
      why the stamp lives on ``PraxisMember`` and not on ``Praxis``. Three members
      of one collab may legitimately hold three different values.

    Being the single such writer is also why the ADR-0068 ``praxis_complete``
    taunt fires here rather than at either call site: one taunt **per member**,
    each reaching that member's own subscribers, so a collab needles every
    member's rivals and a duel side needles its own (ADR-0013 co-ownership).
    Unsubmit-then-resubmit fires again — accepted, rather than carry a praxis
    reference on the taunt row purely to deduplicate.

    Being the single writer is finally why the room's document is **discarded**
    here (#1745, ADR-0073 rule 7). It is flattened into ``body_text`` first, in
    this transaction, which is also the only thing that makes a praxis sealed
    mid-sentence hold that sentence: the room's own flush is on a trailing-edge
    debounce, and a player who submits two seconds after their last full stop
    would otherwise publish without it.
    """
    await discard_room_document(praxis, session)
    praxis.status = PraxisStatus.submitted
    now = datetime.now(timezone.utc)
    praxis.submitted_at = now
    praxis.submit_proposed_at = None
    # `_safe`: a praxis can be sealed against a database with no Era row at all
    # (unit fixtures), and an absent era must not turn a seal into a 500. NULL
    # then means "era unknown", exactly what every row sealed before this column
    # existed says — which is why readers keep the `submitted_at` fallback in
    # ``services.era.get_era_row_for_praxis`` until #1345 retires it.
    era_row = await get_current_era_row_safe(session)
    if era_row is not None:
        praxis.era_id = era_row.id
    for member in praxis.members:
        if not member.has_submitted:
            member.submitted_at = now
        member.has_submitted = True
    # Same `now` the praxis sealed on, so the habit window is measured from the
    # seal rather than from a second clock read.
    await stamp_habit_bonus(praxis, now, session, era)
    # Second pass on purpose: the fan-out flushes, and the seal must be whole
    # before any of it reaches the database.
    for member in praxis.members:
        await fan_out_taunt(member.character_id, TauntTriggerType.praxis_complete, session)


async def seal_to_live(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
    """Seal a collab to Live: status=submitted, mark everyone submitted, recalc members.

    Shared by the lazy-on-access timeout and the leave path.
    """
    await _apply_seal(praxis, session, era)
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


async def mark_done(
    praxis: Praxis, character_id: int, is_done: bool, session: AsyncSession
) -> None:
    """**Done**: "my part is finished" (ADR-0079). Social only, and reversible.

    It deliberately does nothing else. No window opens, no status moves, no
    approval is recorded and nobody's document changes — which is the whole
    reason this signal exists as its own flag rather than as a third meaning
    stacked on ``has_submitted``. If a future rule ever gates on it, ADR-0079
    already rejected the obvious one: Done gating Propose hands any member a veto
    by never marking Done, and the override you would then want *is* Propose.

    No ``era`` parameter, because there is no rule here to read a value for.
    """
    for member in praxis.members:
        if member.character_id == character_id:
            member.is_done = is_done
            break
    await session.flush()


async def on_member_edit(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Hard reset on a collab edit (ADR-0012): an edit means "we're not done".

    Cancels the live proposal, clears *everyone's* approval, and returns the
    collab to drafting. No-op for solo/duel, or a collab that is neither pending
    nor Live.

    **The one implementation of that rule**, and every trigger routes here:
    media add/remove; Withdraw (``pullBack``), which is the same cancellation for
    a member who has read the draft and has no edit to make yet; and, since
    ADR-0079, a text change in the room via :func:`on_room_edit`.

    ``is_done`` is deliberately untouched. An edit says the *group* is not ready
    to publish; it says nothing about whether a member considers their own part
    finished, and collapsing those two again is exactly what ADR-0079 split.
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


async def on_room_edit(
    praxis_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """A room's document moved: the live proposal, if any, is cancelled (ADR-0079).

    The **domain event** behind ``services.praxis_room``'s debounced flush, kept
    here so that "an edit cancels the proposal" has one implementation rather
    than one per trigger. The room knows *that* the text moved; only this module
    knows what that means.

    Takes an id rather than an entity because the caller is a room task with no
    praxis loaded, and leads with a column select so the overwhelmingly common
    case — someone drafting, with no proposal live — costs one cheap query and
    touches no identity map. It does not commit: the caller's transaction is the
    one that also carries the new ``body_text``, and the two must land together
    or the praxis holds new text under an old countdown.
    """
    proposed_at = await session.scalar(
        select(Praxis.submit_proposed_at).where(Praxis.id == praxis_id)
    )
    if proposed_at is None:
        return
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:  # pragma: no cover — deleted between the two statements
        return
    await on_member_edit(praxis, session, era)


async def on_submit(
    praxis: Praxis, character_id: int, session: AsyncSession, era: EraConfig
) -> bool:
    """Record a member's approval and advance the window — Propose, then Approve.

    One entry point for two of ADR-0079's three signals, because they are the same
    act at different moments and the praxis's own state is what tells them apart:

    - no window open → this is **Propose**. It opens the silence-is-consent
      window, and records the proposer as approved (they implicitly approve).
    - a window already open → this is **Approve**, a vote on the live proposal.

    Either way, once every member has approved the collab seals. Solo and duel
    always have one member, so ``all(...)`` holds on the first submit and none of
    Propose / Approve / countdown ever engages — a duel being two solo praxes
    (ADR-0011), that is the solo case twice.

    Returns ``True`` iff the praxis just sealed to Live, so the caller can settle
    any duel and recalc member stats (both kept in ``services.praxis`` to avoid a
    ``services.duel`` import cycle).
    """
    for member in praxis.members:
        if member.character_id == character_id:
            member.has_submitted = True
            member.submitted_at = datetime.now(timezone.utc)
            break
    await session.flush()
    await session.refresh(praxis)

    if all(m.has_submitted for m in praxis.members):
        await _apply_seal(praxis, session, era)
        await session.flush()
        return True
    if praxis.type == PraxisType.collab:
        # ``pending`` now means "a proposal is live" (ADR-0079) rather than
        # "some members are in, not all" — and, since #1745's freeze is retired,
        # it no longer means the document is sealed. Every member may still
        # write, and writing is what cancels this.
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
    live proposal and clear every approval so the group must re-consent.
    Call after removing the kicked member.

    ``is_done`` survives, as it does across an edit: the group has to agree
    again, but nobody's own part became unfinished because someone left."""
    for member in praxis.members:
        member.has_submitted = False
        member.submitted_at = None
    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    await session.flush()


# ``on_member_unsubmit`` — #590's *partial* pull-back, where one member's
# submission cleared and the others' stood — is gone (#1745), and ADR-0079
# **dissolves** the question rather than settling it: there is no longer a
# per-member submission for a pull-back to take back some or all of.
#
# What ``pullBack`` is now is **Withdraw proposal**: a group action any member
# may take, with exactly the effect of an edit, for someone who has read the
# draft and has no edit to make yet. So it routes through :func:`on_member_edit`
# like every other trigger, and ``services.praxis.unsubmit_praxis`` is where the
# two doors it serves — Withdraw a proposal, reopen a published praxis — part.
