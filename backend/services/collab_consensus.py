"""The ADR-0012 lazy-consensus state machine for collab submission.

Silence is consent: Propose opens a ``collab_auto_submit_days`` window, all
approved seals, an edit cancels the proposal, a kick resets the group.

Three signals (ADR-0079): Done (``is_done``, social only), Propose
(``submit_proposed_at``), Approve (``has_approved``).

Also owns ``collab → solo`` (ADR-0060). Duel settling lives in
``services.praxis`` to avoid a ``services.duel`` import cycle.
"""
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.praxis import (
    MediaItem,
    Praxis,
    PraxisInviteStatus,
    PraxisStatus,
    PraxisType,
)
from models.taunt_message import TauntTriggerType
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.era import get_current_era_row
from services.habit_bonus import stamp_habit_bonus
from services.praxis_room import discard_room_document
from services.taunt_service import fan_out_taunt


async def _apply_seal(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
    """The only transition into ``submitted``. Caller flushes and recalcs.

    Sole writer of ``submitted_at``, establishing ``status == submitted ⟹
    submitted_at IS NOT NULL`` (``list_praxes`` relies on it, #658). Hence also
    where seal-time facts are stamped: ``era_id`` (#1398), per-member habit bonus
    (#1617, re-evaluated on resubmit), one ``praxis_complete`` taunt per member
    (ADR-0068), and the room flattened then discarded (#1745, ADR-0073 rule 7)
    so text typed just before submit is not lost to the debounce.
    """
    await discard_room_document(praxis, session)
    # Read the era before touching the row: this query autoflushes, and a
    # half-stamped "submitted" praxis fails ck_praxis_submitted_has_stamps.
    era_id = (await get_current_era_row(session)).id
    praxis.status = PraxisStatus.submitted
    now = datetime.now(timezone.utc)
    praxis.submitted_at = now
    praxis.submit_proposed_at = None
    praxis.era_id = era_id
    for member in praxis.members:
        if not member.has_approved:
            member.approved_at = now
        member.has_approved = True
    # Same `now` as the seal, not a second clock read.
    await stamp_habit_bonus(praxis, now, session, era)
    # Second pass: the fan-out flushes, so the seal must be whole first.
    for member in praxis.members:
        await fan_out_taunt(member.character_id, TauntTriggerType.praxis_complete, session)


async def _admin_among(character_ids: list[int], session: AsyncSession) -> bool:
    """Is any of these characters' accounts an admin? Admins skip the proof and
    daily-cap rules (#3473, #3474) so mods can post test praxes."""
    # Local import: dependencies imports services at module load.
    from dependencies import account_has_admin_role

    account_ids = (
        await session.scalars(
            select(Character.account_id).where(Character.id.in_(character_ids))
        )
    ).all()
    for account_id in account_ids:
        if await account_has_admin_role(account_id, session):
            return True
    return False


async def _has_proof(
    praxis: Praxis, character_ids: list[int], session: AsyncSession
) -> bool:
    """One media item from any member, or an admin among ``character_ids`` (#3473)."""
    count = await session.scalar(
        select(func.count())
        .select_from(MediaItem)
        .where(MediaItem.praxis_id == praxis.id)
    )
    return bool(count) or await _admin_among(character_ids, session)


def _check_post_cooldown(account: Account, now: datetime, era: EraConfig) -> None:
    """429 with the wait while this account's last first-time post is cooling down."""
    last = account.last_praxis_posted_at
    if last is None:
        return
    next_post_at = last + timedelta(hours=era.praxis_post_cooldown_hours)
    if now >= next_post_at:
        return
    wait = (next_post_at - now).total_seconds()
    hours = max(1, math.ceil(wait / 3600))
    raise_coded(
        429,
        ErrorCode.praxis_post_cooldown,
        f"You can post again in {hours} hours.",
        {"hours": hours, "next_post_at": next_post_at.isoformat()},
        headers={"Retry-After": str(int(wait))},
    )


async def seal_to_live(praxis: Praxis, session: AsyncSession, era: EraConfig) -> None:
    """Seal a collab to Live and recalc members. Used by timeout and leave.

    No one completes these seals, so the daily cap neither gates nor charges them.
    A collab with no proof stays unsealed (a read path must not raise).
    ``ponytail:`` timeout seals dodge the cap; charge the proposer if that is abused.
    """
    member_ids = [member.character_id for member in praxis.members]
    if not await _has_proof(praxis, member_ids, session):
        return
    await _apply_seal(praxis, session, era)
    await session.flush()
    await recalculate_members_stats(praxis, session, era)


async def settle_if_window_lapsed(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Lazy-on-access timeout (ADR-0012): auto-publish a pending collab whose window elapsed.

    Called from the read paths, so no scheduler is needed.

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
    """Done: social and reversible only (ADR-0079). Gating Propose on it would
    hand any member a veto; ADR-0079 rejected that."""
    for member in praxis.members:
        if member.character_id == character_id:
            member.is_done = is_done
            break
    await session.flush()


async def on_member_edit(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Hard reset on a collab edit (ADR-0012): cancel proposal, clear approvals.

    The one implementation: media changes, Withdraw (``pullBack``) and room text
    edits all route here. ``is_done`` is deliberately untouched (ADR-0079).
    """
    if praxis.type != PraxisType.collab:
        return
    if praxis.submit_proposed_at is None and praxis.status != PraxisStatus.submitted:
        return
    was_live = praxis.status == PraxisStatus.submitted
    praxis.submit_proposed_at = None
    praxis.status = PraxisStatus.in_progress
    for member in praxis.members:
        member.has_approved = False
        member.approved_at = None
    await session.flush()
    if was_live:
        await recalculate_members_stats(praxis, session, era)


async def on_room_edit(
    praxis_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Room text moved: cancel any live proposal (ADR-0079).

    Column select first so the common no-proposal case is one cheap query. Does
    not commit: must land with the caller's new ``body_text``.
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
    """Propose (no window open) or Approve (window open); seal when all approve.

    Solo and duel have one member, so they seal on first submit. Returns True
    iff just sealed, so the caller settles duels and recalcs.

    Refuses without proof (#3473) and, for the call that completes a praxis's
    first seal, inside the account's post cooldown (#3474); the cooldown is
    charged to that account only. Resubmits (``submitted_at`` already set) are free.
    """
    if not await _has_proof(praxis, [character_id], session):
        raise_coded(
            422,
            ErrorCode.praxis_needs_proof,
            "Add a photo, video or audio file before you submit.",
        )
    completes = all(
        m.has_approved or m.character_id == character_id for m in praxis.members
    )
    first_seal = completes and praxis.submitted_at is None
    account: Account | None = None
    if first_seal and not await _admin_among([character_id], session):
        # Row lock: two parallel submits must not both pass the cooldown.
        account = await session.scalar(
            select(Account)
            .join(Character, Character.account_id == Account.id)
            .where(Character.id == character_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if account is not None:
            _check_post_cooldown(account, datetime.now(timezone.utc), era)

    for member in praxis.members:
        if member.character_id == character_id:
            member.has_approved = True
            member.approved_at = datetime.now(timezone.utc)
            break
    await session.flush()
    await session.refresh(praxis)

    if all(m.has_approved for m in praxis.members):
        await _apply_seal(praxis, session, era)
        if account is not None:
            account.last_praxis_posted_at = praxis.submitted_at
        await session.flush()
        return True
    if praxis.type == PraxisType.collab:
        # ``pending`` = a proposal is live (ADR-0079); members may still write.
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
    """Shared ``collab → solo`` for takeover (#321) and last-member leave (ADR-0060).

    Preserves content/id/media. ``created_by_id`` moves because ``delete_praxis``
    is creator-only. Auth, status guards and recalc stay with callers. The window
    is cancelled before the retype (on_member_edit no-ops on solo), and never on
    a submitted praxis, which would unpublish it.
    """
    if praxis.status != PraxisStatus.submitted:
        await on_member_edit(praxis, session, era)

    # Mutate collections, not session.delete, so selectin caches are not stale.
    praxis.type = PraxisType.solo
    praxis.created_by_id = new_owner_character_id
    for member in list(praxis.members):
        if member.character_id != new_owner_character_id:
            praxis.members.remove(member)
    for invite in list(praxis.invites):
        if invite.status == PraxisInviteStatus.pending:
            praxis.invites.remove(invite)
    await session.flush()


async def convert_if_sole_member(
    praxis: Praxis, session: AsyncSession, era: EraConfig
) -> None:
    """The one ``collab → solo`` trigger for any exit (leave or kick, ADR-0060)."""
    if praxis.type == PraxisType.collab and len(praxis.members) == 1:
        survivor_character_id = praxis.members[0].character_id
        await convert_to_solo(praxis, survivor_character_id, session, era)
        if praxis.status == PraxisStatus.submitted:
            # Collab modifiers give way to solo ones: reprice the survivor.
            await recalculate_character_stats(survivor_character_id, session, era)
            await session.flush()


async def on_member_leave(
    praxis: Praxis, session: AsyncSession, era: EraConfig
) -> None:
    """Call after removing the leaver: seal if the rest approved, then convert a
    one-member collab to solo (ADR-0060). Order matters: converting first would
    discard the consensus the departure just completed.
    """
    remaining = praxis.members
    if (
        remaining
        and praxis.status != PraxisStatus.submitted
        and all(m.has_approved for m in remaining)
    ):
        await seal_to_live(praxis, session, era)

    await convert_if_sole_member(praxis, session, era)


async def on_member_kicked(
    praxis: Praxis, session: AsyncSession, era: EraConfig
) -> None:
    """Call after removing the kicked member: group re-consents (ADR-0013), or
    converts to solo if one member is left. ``is_done`` survives."""
    for member in praxis.members:
        member.has_approved = False
        member.approved_at = None
    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    await session.flush()
    await convert_if_sole_member(praxis, session, era)
