"""Canonical praxis service.

Handles all three praxis types: solo, collab, and duel.
Replaces the old services/submission.py and services/collaboration.py.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.flag import Flag
from models.meta_task import PraxisMetaTask
from models.praxis import (
    MediaItem,
    ModerationStatus,
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskOut
from schemas.praxis import (
    MediaItemOut,
    PraxisCardOut,
    PraxisInviteOut,
    PraxisMemberOut,
    PraxisOut,
    PraxisUpdate,
)
from services import collab_consensus
from services.character_stats import recalculate_character_stats
from services.faction_service import faction_permits
from services.era import get_current_era_row, get_or_create_stats
from models.duel import Duel, DuelStatus
from services.vote_tally import crowned_praxis_ids, get_tally, tally_votes


EVERYMEN_FACTION_SLUG = "everymen"
ALBESCENT_FACTION_SLUG = "albescent"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def cancel_pending_publish_on_edit(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Backwards-compatible alias for :func:`collab_consensus.on_member_edit`.

    Kept so the media/edit routes keep their existing import; the ADR-0012 window
    logic now lives in ``services.collab_consensus`` (#331).
    """
    await collab_consensus.on_member_edit(praxis, session, era)


def _require_member(praxis: Praxis, character_id: int, action: str) -> None:
    """403 unless ``character_id`` is a member of ``praxis`` (ADR-0013 co-ownership).

    A collab is co-owned by every member; solo/duel praxes have exactly one
    member (the creator), so this is equivalent to creator-only for those types.
    """
    if character_id not in {m.character_id for m in praxis.members}:
        raise HTTPException(status_code=403, detail=f"Only a member can {action} this praxis.")


def _build_member_out(member: PraxisMember) -> PraxisMemberOut:
    return PraxisMemberOut(
        id=member.id,
        praxis_id=member.praxis_id,
        character_id=member.character_id,
        character_display_name=member.character.display_name,
        has_submitted=member.has_submitted,
        joined_at=member.joined_at,
    )


def _build_invite_out(invite: PraxisInvite) -> PraxisInviteOut:
    return PraxisInviteOut(
        id=invite.id,
        praxis_id=invite.praxis_id,
        inviter_id=invite.inviter_id,
        invitee_id=invite.invitee_id,
        inviter_display_name=invite.inviter.display_name,
        invitee_display_name=invite.invitee.display_name,
        status=invite.status,
        created_at=invite.created_at,
    )


async def _count_in_progress_praxes(character_id: int, session: AsyncSession) -> int:
    """Count in-progress praxis memberships for bank capacity enforcement."""
    result = await session.execute(
        select(func.count())
        .select_from(PraxisMember)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status == PraxisStatus.in_progress,
        )
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Build output objects
# ---------------------------------------------------------------------------


async def build_praxis_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    viewer: Optional[Character] = None,
    *,
    crowned_ids: Optional[set[int]] = None,
) -> PraxisOut:
    """Build a PraxisOut for any praxis type.

    ``viewer`` is the authenticated viewer's character, used to compute
    viewer-relative flags such as ``can_flag`` and invite visibility.

    ``crowned_ids`` are the Task Crown holders (ADR-0028); list routes
    precompute them once via :func:`~services.vote_tally.crowned_praxis_ids`
    to avoid an N+1, single-praxis routes leave the default.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0

    members = [_build_member_out(m) for m in praxis.members]

    # Invites only visible to members
    effective_viewer_id = viewer.id if viewer is not None else None
    member_ids = {m.character_id for m in praxis.members}
    include_invites = effective_viewer_id in member_ids if effective_viewer_id else False
    invites = [_build_invite_out(i) for i in praxis.invites] if include_invites else []

    media_items = [MediaItemOut.model_validate(item) for item in praxis.media_items]

    # Merit = task base + points_from_votes (viewer-independent; ADR-0014).
    tally_map = await tally_votes([praxis.id], session)
    tally = get_tally(tally_map, praxis.id)
    task_base = praxis.task.point_value if praxis.task else 0
    score = float(task_base + tally.points_from_votes)

    # Look up the Duel row if this praxis is a duel side (ADR-0011).
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis.id) | (Duel.opponent_praxis_id == praxis.id),
            Duel.status.in_([DuelStatus.pending, DuelStatus.active, DuelStatus.settled]),
        )
    )
    duel_row = duel_result.scalar_one_or_none()
    duel_id: Optional[int] = duel_row.id if duel_row is not None else None

    can_flag = await can_flag_praxis(viewer, praxis, session, era)

    # Task Crown (ADR-0028): top submitted praxis for this task, computed live.
    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    created_by_faction_slug = praxis.created_by.faction_slug if praxis.created_by else None

    # Query applied metatasks
    applied_metatasks: list[TaskOut] = []
    metatask_tasks_result = await session.execute(
        select(Task)
        .join(PraxisMetaTask, PraxisMetaTask.task_id == Task.id)
        .where(PraxisMetaTask.praxis_id == praxis.id)
    )
    metatask_tasks = metatask_tasks_result.scalars().all()
    if metatask_tasks:
        applied_metatasks = [TaskOut.model_validate(t) for t in metatask_tasks]

    return PraxisOut(
        id=praxis.id,
        task_id=praxis.task_id,
        task_title=task_title,
        task_point_value=task_point_value,
        task_level_required=praxis.task.level_required if praxis.task else 0,
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        body_text=praxis.body_text,
        moderation_status=praxis.moderation_status,
        admin_note=praxis.admin_note,
        flagged_at=praxis.flagged_at,
        submitted_at=praxis.submitted_at,
        submit_proposed_at=praxis.submit_proposed_at,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_by_faction_slug=created_by_faction_slug,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        members=members,
        invites=invites,
        media_items=media_items,
        score=score,
        voter_count=tally.voter_count,
        is_top_for_task=praxis.id in crowned_ids,
        duel_id=duel_id,
        can_flag=can_flag,
        applied_metatasks=applied_metatasks,
    )


async def build_praxis_card_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    crowned_ids: Optional[set[int]] = None,
) -> PraxisCardOut:
    """Lightweight card for list views.

    score = Merit = task base + points_from_votes (viewer-independent; ADR-0014).

    ``crowned_ids`` are the Task Crown holders (ADR-0028); list routes
    precompute them once via :func:`~services.vote_tally.crowned_praxis_ids`
    so the crown never becomes a per-card query.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0
    task_level_required = praxis.task.level_required if praxis.task else 0
    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""

    tally_map = await tally_votes([praxis.id], session)
    tally = get_tally(tally_map, praxis.id)
    score = float(task_point_value + tally.points_from_votes)

    # Task Crown (ADR-0028): top submitted praxis for this task, computed live.
    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    return PraxisCardOut(
        id=praxis.id,
        task_id=praxis.task_id,
        task_title=task_title,
        task_point_value=task_point_value,
        task_level_required=task_level_required,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        moderation_status=praxis.moderation_status,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        submitted_at=praxis.submitted_at,
        member_count=len(praxis.members),
        score=score,
        voter_count=tally.voter_count,
        is_top_for_task=praxis.id in crowned_ids,
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
    )


# ---------------------------------------------------------------------------
# CRUD — praxis lifecycle
# ---------------------------------------------------------------------------


async def get_praxis(
    praxis_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> Praxis:
    """Get a praxis by id with detail-view relationships eager-loaded.

    Loads ``invites`` and ``media_items`` (in addition to the always-loaded
    ``task``/``created_by``/``members``) because every service consumer of
    this helper ultimately feeds a ``build_praxis_out`` caller. The list
    endpoint uses :func:`list_praxes` which loads only what the card needs.

    INVARIANT: must eagerly load every Praxis relationship with
    ``cascade='all, delete-orphan'`` — currently just ``invites`` — because
    :func:`delete_praxis` does ``session.delete(praxis)`` which needs those
    collections loaded in the session for the cascade to fire. The other
    relationships are ``lazy='raise'`` (see ``models/praxis.py``); dropping a
    ``selectinload`` here silently breaks delete.
    """
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.id == praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    await collab_consensus.settle_if_window_lapsed(praxis, session, era)
    return praxis


def praxis_visibility_condition(viewer_id: Optional[int]):
    """SQL predicate for who may see a praxis (ADR-0024).

    ``submitted`` praxes are public; an ``in_progress`` praxis is visible only to
    its members (character-scoped, matching ``_require_member``). Push this into
    the query so pagination stays honest instead of post-filtering a page.
    """
    visible = Praxis.status == PraxisStatus.submitted
    if viewer_id is not None:
        member_praxis_ids = select(PraxisMember.praxis_id).where(
            PraxisMember.character_id == viewer_id
        )
        visible = or_(visible, Praxis.id.in_(member_praxis_ids))
    return visible


async def list_praxes(
    session: AsyncSession,
    *,
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    member_id: Optional[int] = None,
    praxis_type: Optional[PraxisType] = None,
    status: Optional[PraxisStatus] = None,
    moderation_status: Optional[str] = None,
    faction: Optional[str] = None,
    viewer_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    era: EraConfig = CURRENT_ERA,
) -> list[Praxis]:
    """List praxes with optional filters.

    ``in_progress`` praxes are member-only (ADR-0024): pass ``viewer_id`` to
    include the viewer's own drafts; everyone else sees only ``submitted``.

    ``character_id`` filters by authorship (``created_by_id``); ``member_id``
    filters by *membership* (``PraxisMember``), mirroring
    :func:`_count_in_progress_praxes` so a membership-based list (the sidebar's
    in-progress tasks) can never disagree with the slot count.
    """
    query = select(Praxis).where(praxis_visibility_condition(viewer_id))

    if faction is not None:
        # Praxis has no faction of its own; it inherits the linked task's faction.
        query = query.join(Task, Praxis.task_id == Task.id).where(
            Task.primary_faction_slug == faction
        )

    if praxis_type is not None:
        query = query.where(Praxis.type == praxis_type)

    if moderation_status is not None:
        try:
            mod_enum = ModerationStatus(moderation_status)
            query = query.where(Praxis.moderation_status == mod_enum)
        except ValueError:
            pass
    else:
        query = query.where(Praxis.moderation_status != ModerationStatus.hidden)

    if task_id is not None:
        query = query.where(Praxis.task_id == task_id)

    if character_id is not None:
        if status == PraxisStatus.in_progress:
            # ADR-0013: in-progress praxes are co-owned; surface any member's
            # active draft, not just the creator's (bank cap already counts
            # memberships — see _count_in_progress_praxes). Published/authored
            # lists keep creator semantics below.
            query = query.where(
                Praxis.id.in_(
                    select(PraxisMember.praxis_id).where(
                        PraxisMember.character_id == character_id
                    )
                )
            )
        else:
            query = query.where(Praxis.created_by_id == character_id)

    if member_id is not None:
        # Membership filter: any praxis the character holds a PraxisMember row
        # on, regardless of who created it (accepted collab invites included).
        query = query.where(
            Praxis.id.in_(
                select(PraxisMember.praxis_id).where(
                    PraxisMember.character_id == member_id
                )
            )
        )

    if status is not None:
        query = query.where(Praxis.status == status)

    query = query.order_by(Praxis.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    praxes = list(result.scalars().all())
    for praxis in praxes:
        await collab_consensus.settle_if_window_lapsed(praxis, session, era)
    return praxes


def meets_task_level(character_level: int, task: Task) -> bool:
    """Whether ``character_level`` clears the task's own level bar (#292).

    The single home for the **task-level** gate — the "level half" that used to
    be ANDed inline into :func:`is_task_eligible_for_character` and the sign-up
    predicate. A distinct axis from :func:`~services.faction_service.faction_permits`
    (the faction half, #171) and from the era-config thresholds
    (collab/flag/comment/metatask-apply), which each already sit in their own
    purpose-named predicate and share a single ``era.*`` source for their value.
    """
    return character_level >= task.level_required


class SignupDenialReason(str, Enum):
    """Why the type-agnostic sign-up gates reject a claim (ADR-0008)."""

    below_level = "below_level"
    task_status_closed = "task_status_closed"
    already_active_member = "already_active_member"
    bank_full = "bank_full"


@dataclass(frozen=True)
class SignupEligibility:
    """Result of :func:`evaluate_signup`. ``reason`` is set iff ``allowed`` is False."""

    allowed: bool
    reason: Optional[SignupDenialReason] = None


async def evaluate_signup(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> SignupEligibility:
    """The single sign-up predicate — true iff ``create_praxis``'s **type-agnostic**
    gates would accept (ADR-0008). Owns the four gates every claim shares: level,
    retired/pending faction carve-out, active-member, and the task-bank cap. The
    mode-specific gates (duel-via-challenge, collab level) stay in
    :func:`allowed_praxis_modes` and are applied by :func:`_check_create_preconditions`.

    Anonymous viewers are never eligible (``allowed=False``, no ``reason``).
    """
    if character is None:
        return SignupEligibility(allowed=False)

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character.id, era_row.id)

    if not meets_task_level(stats.level, task):
        return SignupEligibility(False, SignupDenialReason.below_level)

    if task.status == TaskStatus.retired and character.faction_slug not in era.allow_praxis_on_retired_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)
    if task.status == TaskStatus.pending and character.faction_slug not in era.allow_praxis_on_pending_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)

    if await is_active_member_of_task(character, task, session):
        return SignupEligibility(False, SignupDenialReason.already_active_member)

    in_progress_count = await _count_in_progress_praxes(character.id, session)
    if in_progress_count >= era.max_task_signups:
        return SignupEligibility(False, SignupDenialReason.bank_full)

    return SignupEligibility(allowed=True)


def _signup_denial_to_http(
    reason: Optional[SignupDenialReason], task: Task, era: EraConfig
) -> HTTPException:
    """Map a :class:`SignupDenialReason` to the route error it has always raised."""
    if reason == SignupDenialReason.below_level:
        return HTTPException(
            status_code=403, detail=f"This task requires level {task.level_required}."
        )
    if reason == SignupDenialReason.task_status_closed:
        detail = (
            "This task is retired and is not open for new praxes."
            if task.status == TaskStatus.retired
            else "This task is pending and is not open for new praxes."
        )
        return HTTPException(status_code=403, detail=detail)
    if reason == SignupDenialReason.already_active_member:
        return HTTPException(
            status_code=409, detail="You have already submitted a praxis for this task."
        )
    # bank_full (and the anonymous/None fallback, which create_praxis never hits).
    return HTTPException(
        status_code=400,
        detail=f"Task bank is full ({era.max_task_signups} in-progress praxes). Complete or withdraw one first.",
    )


async def _check_create_preconditions(
    task_id: int,
    praxis_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig,
) -> Task:
    """Raise HTTPException unless this character may create ``praxis_type`` for ``task_id``."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    # Type-agnostic gates: level, retired/pending, active-member, bank cap — one
    # predicate, so the can_submit_praxis flag can't drift from enforcement.
    eligibility = await evaluate_signup(character, task, session, era)
    if not eligibility.allowed:
        raise _signup_denial_to_http(eligibility.reason, task, era)

    # Mode-specific gates stay here (single-sourced via allowed_praxis_modes).
    if praxis_type == PraxisType.duel:
        raise HTTPException(
            status_code=400,
            detail="Duels are issued via the challenge endpoint, not direct praxis creation (ADR-0011).",
        )

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)
    allowed = allowed_praxis_modes(character, stats.level, era)
    if praxis_type not in allowed:
        _denial: dict[PraxisType, str] = {
            PraxisType.collab: f"Collaborations require level {era.collaboration_level_required}.",
        }
        raise HTTPException(
            status_code=403,
            detail=_denial.get(praxis_type, "Praxis mode not available."),
        )

    return task


async def create_praxis(
    task_id: int,
    praxis_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    title: Optional[str] = None,
    body_text: Optional[str] = None,
) -> Praxis:
    """Create a new praxis + praxis_member for the creator.

    Enforces:
    - Task must exist and be active
    - Character level meets task.level_required
    - Bank cap: era.max_task_signups = max concurrent in_progress praxes per character
    - Duel/collab type requires minimum level
    """
    await _check_create_preconditions(task_id, praxis_type, character_id, session, era)

    praxis = Praxis(
        task_id=task_id,
        type=praxis_type,
        status=PraxisStatus.in_progress,
        title=title,
        body_text=body_text or "",
        moderation_status=ModerationStatus.visible,
        created_by_id=character_id,
    )
    session.add(praxis)
    await session.flush()

    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)
    await session.flush()
    # Reload with detail-view options so ``build_praxis_out`` can read invites
    # and media_items without tripping lazy='raise'.
    return await get_praxis(praxis.id, session)


async def update_praxis(
    praxis_id: int,
    data: PraxisUpdate,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Update title/body_text. Any member may edit (ADR-0013).

    On a collab, an edit cancels any pending-publish window and un-submits everyone
    (ADR-0012 hard reset).
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "edit")
    if data.title is not None:
        praxis.title = data.title
    if data.body_text is not None:
        praxis.body_text = data.body_text
    await session.flush()
    await cancel_pending_publish_on_edit(praxis, session, era)
    # Re-fetch rather than session.refresh(praxis): refresh expires the
    # lazy='raise' relationships and breaks the subsequent build_praxis_out.
    return await get_praxis(praxis_id, session)


async def withdraw_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Move praxis back to editing (in_progress). Any member may reopen (ADR-0013).

    Votes are preserved but stop contributing to score until resubmitted via
    ``submit_praxis``. For collabs/duels, member submission flags are reset so
    the full group must re-submit.

    Unsubmitting a *settled* duel side forfeits the contest (ADR-0011 §Forfeit):
    the opponent wins by default, the duel stays ``settled``, and the forfeit is
    permanent — resubmitting does not restore it.
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "reopen")
    if praxis.status == PraxisStatus.in_progress:
        raise HTTPException(status_code=422, detail="Praxis is already in editing mode.")

    # ADR-0011 §Forfeit (#307): unsubmitting a *settled* duel side forfeits the
    # contest. Mark the forfeit (first one sticks) and recalc the winner below so
    # their guaranteed-win modifier lands immediately.
    from services.duel import get_duel_for_praxis

    duel = await get_duel_for_praxis(praxis_id, session)
    forfeit_winner_character_id: Optional[int] = None
    if duel is not None and duel.status == DuelStatus.settled:
        if duel.forfeited_by_character_id is None:
            duel.forfeited_by_character_id = character_id
        winner_praxis_id = (
            duel.opponent_praxis_id
            if duel.challenger_praxis_id == praxis_id
            else duel.challenger_praxis_id
        )
        if winner_praxis_id is not None:
            winner_praxis = await session.get(Praxis, winner_praxis_id)
            if winner_praxis is not None:
                forfeit_winner_character_id = winner_praxis.created_by_id

    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    for member in praxis.members:
        member.has_submitted = False
    await session.flush()

    # Recalc *every* member: on a collab, co-authors' scores also counted this
    # praxis while it was submitted, so all of them must drop (the submit paths
    # already recalc all members — this fixes the prior single-actor under-recalc).
    era_row = await get_current_era_row(session)
    for member in praxis.members:
        await recalculate_character_stats(
            member.character_id, session, era, era_row=era_row
        )
    if forfeit_winner_character_id is not None:
        await recalculate_character_stats(
            forfeit_winner_character_id, session, era, era_row=era_row
        )
    await session.flush()
    return await get_praxis(praxis_id, session)


async def change_praxis_type(
    praxis_id: int,
    new_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Flip a praxis between ``solo`` and ``collab`` in place (#321).

    Preserves content, **id**, and media — never delete+recreate. Guards: the
    praxis must be ``in_progress``; the actor must be a member; a duel side
    (it has a live ``Duel`` row) must dissolve the duel first; ``collab``
    requires ``era.collaboration_level_required``. ``duel`` is not a target here
    — a duel is a solo praxis + ``Duel`` row (ADR-0011), issued via the challenge
    endpoint.

    ``collab → solo`` is an intentional **takeover** (grill 2026-07-01): any
    member may do it and becomes the sole owner — ``created_by_id`` is reassigned
    to the actor, every other member and pending invite is dropped, content is
    kept. Trust has stakes.
    """
    if new_type not in (PraxisType.solo, PraxisType.collab):
        raise HTTPException(
            status_code=400, detail="Can only switch between solo and collab."
        )

    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "change the mode of")
    if praxis.status != PraxisStatus.in_progress:
        raise HTTPException(
            status_code=422, detail="Can only change mode while the praxis is in editing."
        )
    if praxis.type == new_type:
        return praxis

    # A duel side is a solo praxis + Duel row; dissolve the duel before switching.
    from services.duel import get_duel_for_praxis

    if await get_duel_for_praxis(praxis_id, session) is not None:
        raise HTTPException(
            status_code=409, detail="End the duel before changing this praxis's mode."
        )

    if new_type == PraxisType.collab:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character_id, era_row.id)
        if stats.level < era.collaboration_level_required:
            raise HTTPException(
                status_code=403,
                detail=f"Collaborations require level {era.collaboration_level_required}.",
            )
        praxis.type = PraxisType.collab
    else:
        # collab → solo: the actor takes it over as their own solo praxis.
        # A type change is a structural edit — clear any pending-publish window
        # (ADR-0012) while this is still a collab, so a later flip back to collab
        # can't inherit a stale, already-lapsed window and instantly auto-seal.
        await cancel_pending_publish_on_edit(praxis, session, era)
        # Mutate the loaded collections so the delete-orphan cascade fires *and*
        # the returned/serialized praxis reflects the drop (session.delete alone
        # would leave the selectin-cached collections stale).
        praxis.type = PraxisType.solo
        praxis.created_by_id = character_id
        for member in list(praxis.members):
            if member.character_id != character_id:
                praxis.members.remove(member)
        for invite in list(praxis.invites):
            if invite.status == PraxisInviteStatus.pending:
                praxis.invites.remove(invite)

    # in_progress praxes aren't scored, so no stat recalc is needed here.
    await session.flush()
    return await get_praxis(praxis_id, session)


async def delete_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
) -> None:
    """Delete a praxis. Creator only. Must be in_progress."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character's praxis.")
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a submitted praxis. Move it to editing first.",
        )
    await session.delete(praxis)
    await session.flush()


def can_view_praxis(viewer: Optional[Character], praxis: Praxis) -> bool:
    """Whether ``viewer`` may see ``praxis`` (ADR-0024).

    - ``hidden`` (moderation) → never (mirror the existing hidden branch: 404).
    - ``submitted`` → public.
    - ``in_progress`` → members only (character-scoped, matching ``_require_member``;
      the account-vs-character question in #293 is deliberately not entangled here).

    Reads only always-loaded columns/relationships (``members``), so it stays sync.
    """
    if praxis.moderation_status == ModerationStatus.hidden:
        return False
    if praxis.status == PraxisStatus.submitted:
        return True
    if viewer is None:
        return False
    return viewer.id in {member.character_id for member in praxis.members}


async def _praxis_author_account_id(
    praxis: Praxis, session: AsyncSession
) -> Optional[int]:
    """The account that owns ``praxis``'s author (created_by is usually loaded)."""
    author = praxis.created_by
    if author is None and praxis.created_by_id is not None:
        author = await session.get(Character, praxis.created_by_id)
    return author.account_id if author is not None else None


async def _account_already_flagged(
    praxis_id: int, account_id: int, session: AsyncSession
) -> bool:
    """True if any character on ``account_id`` already flagged this praxis (#328 anti-gang).

    Joins ``Flag.flagged_by → Character.account_id`` so no ``flagged_by_account_id``
    column / migration is needed.
    """
    result = await session.execute(
        select(Flag.id)
        .join(Character, Character.id == Flag.flagged_by)
        .where(Flag.praxis_id == praxis_id, Character.account_id == account_id)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def can_flag_praxis(
    viewer: Optional[Character],
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True if ``viewer`` may flag ``praxis``.

    Mirrors the rules enforced in :func:`flag_praxis` so the ``can_flag`` UI flag
    hides the control exactly when the action would 403/409 (#328):
    - Viewer must be authenticated (anonymous viewers cannot flag).
    - Viewer's **account** cannot own the praxis author (account-scoped anti-self-flag).
    - Viewer's **account** must not already have a flag on this praxis (anti-gang).
    - Viewer must be at or above ``era.flag_level_required`` in the current era.
    """
    if viewer is None:
        return False
    author_account_id = await _praxis_author_account_id(praxis, session)
    if author_account_id is not None and author_account_id == viewer.account_id:
        return False
    if await _account_already_flagged(praxis.id, viewer.account_id, session):
        return False
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)
    return stats.level >= era.flag_level_required


def active_member_task_ids_subquery(character_id: int):
    """SQL subquery returning task IDs where ``character_id`` holds an active praxis membership.

    "Active" means the praxis status is ``in_progress`` or ``submitted``.
    Used by the task-list query to exclude tasks the character is already working on,
    and by :func:`is_active_member_of_task` for per-task checks.
    """
    return (
        select(Praxis.task_id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.submitted]),
        )
    )


async def is_active_member_of_task(
    character: Character,
    task: Task,
    session: AsyncSession,
) -> bool:
    """Return True if ``character`` holds an active (in_progress or submitted) praxis membership for ``task``.

    Everymen (Double Dipper perk) always returns False — they may hold multiple memberships per task.
    """
    if character.faction_slug == EVERYMEN_FACTION_SLUG:
        return False
    result = await session.execute(
        select(PraxisMember.id)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character.id,
            Praxis.task_id == task.id,
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.submitted]),
        )
    )
    return result.scalar_one_or_none() is not None


async def can_submit_praxis_for_task(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True iff ``create_praxis``'s type-agnostic gates would accept — the
    truthful ``can_submit_praxis`` flag on ``TaskOut`` (ADR-0008).

    Derives from :func:`evaluate_signup`, so it covers every shared gate: level,
    retired/pending faction carve-out, active-member (Everymen Double-Dipper
    exempt), **and the task-bank cap** — the last was previously omitted here,
    which made the sign-up button lie once a character's bank was full.
    """
    return (await evaluate_signup(character, task, session, era)).allowed


def allowed_praxis_modes(
    character: Optional[Character],
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> list[PraxisType]:
    """Return the praxis modes a character may create directly.

    Single source for the mode-by-level gates — enforcement in
    :func:`_check_create_preconditions` and the UI flag on
    :class:`~schemas.task.TaskOut` both derive from this list.

    - Solo: always allowed once a viewer is authenticated.
    - Collab: requires ``character_level >= era.collaboration_level_required``.
    - Duel: issued via the challenge endpoint (ADR-0011), not direct creation.

    Anonymous viewers (``character is None``) receive an empty list so the
    UI can hide the mode picker entirely.
    """
    if character is None:
        return []
    modes: list[PraxisType] = [PraxisType.solo]
    if character_level >= era.collaboration_level_required:
        modes.append(PraxisType.collab)
    return modes


def is_task_eligible_for_character(
    character: Optional[Character],
    task: Task,
    character_level: int,
) -> bool:
    """Return True if ``character`` is eligible to act on ``task``.

    For standard tasks the gate is only ``task.level_required``. For metatask
    rows the character's faction must also permit it — see
    :func:`services.faction_service.faction_permits` (same faction as the
    metatask, or Albescent, who may act on any). Anonymous viewers are never
    eligible.

    Note this mirrors the metatask scoring gate in
    :func:`services.meta_task.get_meta_task_points`
    (``character_level >= task.level_required``)
    rather than the stricter :func:`apply_metatask` service gate. The flag is
    intended for UI affordances such as "metatasks this character could use
    if they had one" — apply time still runs the full guard.
    """
    if character is None:
        return False
    # Two named single-purpose gates, no bundled inline checks (#171, #292).
    if not meets_task_level(character_level, task):
        return False
    if not faction_permits(character, task):
        return False
    return True


async def flag_praxis(
    praxis_id: int,
    flagged_by: Character,
    reason: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Flag a praxis for moderation review. Requires ``era.flag_level_required`` or above."""
    praxis = await get_praxis(praxis_id, session)

    # Account-scoped anti-self-flag (#328): no account can flag its own work
    # across lives — mirror the account-level anti-self-vote shape. Own message
    # so the caller sees a clearer reason than a generic level failure.
    author_account_id = await _praxis_author_account_id(praxis, session)
    if author_account_id is not None and author_account_id == flagged_by.account_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own praxis.")

    # Account-scoped uniqueness (#328): one flag per account per praxis — a second
    # life can't stack a second flag to gang up on a third-party praxis.
    if await _account_already_flagged(praxis.id, flagged_by.account_id, session):
        raise HTTPException(
            status_code=409, detail="Your account has already flagged this praxis."
        )

    if not await can_flag_praxis(flagged_by, praxis, session, era):
        raise HTTPException(
            status_code=403,
            detail=f"Must be level {era.flag_level_required} or above to flag a praxis.",
        )

    praxis.moderation_status = ModerationStatus.flagged
    praxis.flagged_at = datetime.now(timezone.utc)

    flag = Flag(
        praxis_id=praxis.id,
        flagged_by=flagged_by.id,
        reason=reason or "",
    )
    session.add(flag)
    await session.flush()
    return await get_praxis(praxis_id, session)


# ---------------------------------------------------------------------------
# Collaboration specific operations (duels use services/duel.py — ADR-0011)
# ---------------------------------------------------------------------------


async def invite_to_praxis(
    praxis_id: int,
    invitee_id: int,
    inviter_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Create a collab invite. Praxis must be collab type. Inviter must be a member."""
    praxis = await get_praxis(praxis_id, session)

    if praxis.type != PraxisType.collab:
        raise HTTPException(
            status_code=400,
            detail="Invites are only for collab praxes. Duels use the challenge endpoint.",
        )
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(status_code=400, detail="Cannot invite to a submitted praxis.")

    member_ids = {m.character_id for m in praxis.members}
    if inviter_id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can send invites.")

    if invitee_id == inviter_id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself.")
    if invitee_id in member_ids:
        raise HTTPException(status_code=409, detail="Player is already a member.")

    # Check for duplicate pending invite
    existing_result = await session.execute(
        select(PraxisInvite).where(
            PraxisInvite.praxis_id == praxis_id,
            PraxisInvite.inviter_id == inviter_id,
            PraxisInvite.invitee_id == invitee_id,
            PraxisInvite.status == PraxisInviteStatus.pending,
        )
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="A pending invite already exists. Resolve it before sending another.",
        )

    invitee = await session.get(Character, invitee_id)
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invitee not found.")

    if await is_active_member_of_task(invitee, praxis.task, session):
        raise HTTPException(
            status_code=409,
            detail="This player already has an active praxis for this task and cannot be invited.",
        )

    invite = PraxisInvite(
        praxis_id=praxis_id,
        inviter_id=inviter_id,
        invitee_id=invitee_id,
        status=PraxisInviteStatus.pending,
    )
    session.add(invite)
    await session.flush()
    await session.refresh(invite)
    return invite


async def respond_to_invite(
    invite_id: int,
    character_id: int,
    accept: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Accept or decline an invite. Creates a PraxisMember on accept."""
    invite = await session.get(PraxisInvite, invite_id)
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.invitee_id != character_id:
        raise HTTPException(status_code=403, detail="This invite is not for you.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=400, detail="Invite has already been resolved.")

    if not accept:
        invite.status = PraxisInviteStatus.declined
        await session.flush()
        await session.refresh(invite)
        return invite

    praxis = await session.get(Praxis, invite.praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis no longer exists.")

    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(status_code=400, detail="Cannot join a submitted praxis.")

    # Check bank capacity
    in_progress_count = await _count_in_progress_praxes(character_id, session)
    already_member = any(m.character_id == character_id for m in praxis.members)
    if not already_member and in_progress_count >= era.max_task_signups:
        raise HTTPException(
            status_code=409,
            detail=f"Task bank is full ({era.max_task_signups} in-progress praxes).",
        )

    # Add member
    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)

    invite.status = PraxisInviteStatus.accepted
    await session.flush()
    await session.refresh(invite)
    return invite


async def cancel_invite(
    praxis_id: int,
    invite_id: int,
    inviter_id: int,
    session: AsyncSession,
) -> None:
    """Rescind a pending invite. Only the inviter may cancel, and only while
    the invite is still pending (removing an accepted member is a separate
    concern). Deletes the invite row (#421)."""
    invite = await session.get(PraxisInvite, invite_id)
    if invite is None or invite.praxis_id != praxis_id:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.inviter_id != inviter_id:
        raise HTTPException(status_code=403, detail="Only the inviter can rescind this invite.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=409, detail="Only a pending invite can be rescinded.")

    await session.delete(invite)
    await session.flush()


async def kick_member(
    praxis_id: int,
    member_id: int,
    requester_id: int,
    session: AsyncSession,
) -> None:
    """Remove a member. Any member may kick another (incl. the creator); not self (ADR-0013)."""
    praxis = await get_praxis(praxis_id, session)

    _require_member(praxis, requester_id, "kick from")

    if member_id == requester_id:
        raise HTTPException(status_code=400, detail="Cannot kick yourself.")

    member_result = await session.execute(
        select(PraxisMember).where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == member_id,
        )
    )
    kickee_member = member_result.scalar_one_or_none()
    if kickee_member is None:
        raise HTTPException(status_code=400, detail="Target player is not a member.")

    # Remove via the collection so delete-orphan cascades the DELETE *and* the
    # in-memory members list stays consistent — the route reuses this same
    # identity-mapped praxis to build its response.
    praxis.members.remove(kickee_member)

    # A kick resets the changed group back to drafting (ADR-0013).
    await collab_consensus.on_member_kicked(praxis, session)


async def leave_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """A member removes their *own* membership from a collab (ADR-0012).

    Distinct from kick (removing someone else) and withdraw (taking the whole
    praxis out of scoring). Unlike a kick, leaving does **not** reset the remaining
    members' submissions: if everyone still here has submitted, the collab goes Live.
    """
    praxis = await get_praxis(praxis_id, session)
    if praxis.type != PraxisType.collab:
        raise HTTPException(status_code=400, detail="Only collab memberships can be left.")
    _require_member(praxis, character_id, "leave")

    leaver = next(m for m in praxis.members if m.character_id == character_id)
    praxis.members.remove(leaver)
    await session.flush()

    # A departure can complete the consensus among those who stayed.
    await collab_consensus.on_member_leave(praxis, session, era)

    # The leaver's stake is gone — recompute their stats regardless.
    await recalculate_character_stats(character_id, session, era)
    await session.flush()
    return await get_praxis(praxis_id, session)


async def submit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Mark the member's has_submitted=True.

    All members submitted → Live now. Otherwise, on a collab, this opens the
    pending-publish window (ADR-0012): silence for ``era.collab_auto_submit_days``
    auto-publishes via the lazy-on-access timeout. Solo/duel always have one member,
    so they publish immediately and never enter the window.
    """
    praxis = await get_praxis(praxis_id, session)

    member_ids = {m.character_id for m in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this praxis.")

    went_live = await collab_consensus.on_submit(praxis, character_id, session, era)
    if went_live:
        # Settle any duel BEFORE the stats recalc — the outcome feeds the duel
        # multiplier. Kept here (not in collab_consensus) because it depends on
        # services.duel, which imports services.praxis (import-cycle avoidance).
        from services.duel import maybe_settle_duel
        await maybe_settle_duel(praxis_id, session)
        era_row = await get_current_era_row(session)
        for member in praxis.members:
            await recalculate_character_stats(
                member.character_id, session, era, era_row=era_row
            )
        await session.flush()
    return await get_praxis(praxis_id, session)


async def moderate_praxis(
    praxis_id: int,
    new_status: str,
    admin_note: Optional[str],
    session: AsyncSession,
) -> Praxis:
    """Admin moderation: update moderation_status and admin_note."""
    praxis = await get_praxis(praxis_id, session)

    try:
        mod_enum = ModerationStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid moderation status: {new_status}")

    praxis.moderation_status = mod_enum

    if mod_enum == ModerationStatus.flagged:
        praxis.flagged_at = datetime.now(timezone.utc)
    if mod_enum == ModerationStatus.failed:
        praxis.admin_note = admin_note or ""
    elif mod_enum == ModerationStatus.visible:
        praxis.admin_note = None

    await session.flush()
    return await get_praxis(praxis_id, session)


# ---------------------------------------------------------------------------
# Metatasks
# ---------------------------------------------------------------------------


def _check_metatask_eligibility(
    character: Character,
    task: Task,
    character_level: int,
    era: EraConfig,
) -> Optional[str]:
    """Return a 403 reason string if this character can't apply ``task``, else None."""
    # Albescent bypasses both the level and faction gates (its charter). The
    # level gate is a separate axis; the faction decision routes through the
    # single seam (ADR-0029, #171) — for non-Albescent it reduces to a slug match.
    if character.faction_slug == ALBESCENT_FACTION_SLUG:
        return None
    if character_level < era.metatask_apply_level:
        return (
            f"Must be level {era.metatask_apply_level} or above "
            "to apply metatasks."
        )
    if not faction_permits(character, task, era):
        return (
            "This metatask belongs to a different faction. "
            "Only Albescent characters can apply any faction's metatask."
        )
    return None


async def apply_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Attach a metatask (Task with task_type=metatask) to a praxis.

    Gates (R.9):
    - The task must be ``TaskType.metatask`` (else 400).
    - The applying character must be a member of the praxis (else 403).
    - The praxis must be ``in_progress`` (else 422).
    - Faction gate:
        * Albescent characters may apply any faction's metatask.
        * Otherwise the character must be at least ``era.metatask_apply_level``
          AND their ``faction_slug`` must match ``task.metatask_faction_slug``.
    """
    praxis = await get_praxis(praxis_id, session)
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.task_type != TaskType.metatask:
        raise HTTPException(
            status_code=400,
            detail="Only tasks with task_type='metatask' can be applied as metatasks.",
        )

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can apply metatasks.",
        )

    if praxis.status != PraxisStatus.in_progress:
        raise HTTPException(
            status_code=422,
            detail="Metatasks can only be applied to in-progress praxes.",
        )

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)

    eligibility_error = _check_metatask_eligibility(character, task, stats.level, era)
    if eligibility_error is not None:
        raise HTTPException(status_code=403, detail=eligibility_error)

    # Reject duplicate links up front — a metatask can only be applied once
    # to the same praxis.
    existing = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This metatask is already applied to the praxis.",
        )

    session.add(PraxisMetaTask(praxis_id=praxis_id, task_id=task_id))
    await session.flush()

    era_row = await get_current_era_row(session)
    for member in praxis.members:
        await recalculate_character_stats(
            member.character_id, session, era, era_row=era_row
        )
    await session.flush()
    return await get_praxis(praxis_id, session)


async def remove_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Remove a metatask from a praxis. Any praxis member can remove."""
    praxis = await get_praxis(praxis_id, session)

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can remove metatasks.",
        )

    result = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Metatask is not applied to this praxis.")

    await session.delete(link)
    await session.flush()

    era_row = await get_current_era_row(session)
    for member in praxis.members:
        await recalculate_character_stats(
            member.character_id, session, era, era_row=era_row
        )
    await session.flush()
    return await get_praxis(praxis_id, session)


__all__ = [
    "active_member_task_ids_subquery",
    "allowed_praxis_modes",
    "apply_metatask",
    "build_praxis_out",
    "build_praxis_card_out",
    "cancel_pending_publish_on_edit",
    "can_flag_praxis",
    "can_submit_praxis_for_task",
    "can_view_praxis",
    "create_praxis",
    "delete_praxis",
    "evaluate_signup",
    "flag_praxis",
    "get_praxis",
    "invite_to_praxis",
    "is_active_member_of_task",
    "is_task_eligible_for_character",
    "kick_member",
    "leave_praxis",
    "list_praxes",
    "praxis_visibility_condition",
    "moderate_praxis",
    "remove_metatask",
    "respond_to_invite",
    "SignupDenialReason",
    "SignupEligibility",
    "submit_praxis",
    "update_praxis",
    "withdraw_praxis",
]
