"""Canonical praxis service.

Handles all three praxis types: solo, collab, and duel.
Replaces the old services/submission.py and services/collaboration.py.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
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
from models.task import Task, TaskType
from models.vote import Vote
from schemas.task import TaskOut
from schemas.praxis import (
    DuelVoteSummary,
    MediaItemOut,
    PraxisCardOut,
    PraxisInviteOut,
    PraxisMemberOut,
    PraxisOut,
    PraxisUpdate,
)
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats
from services.meta_task import get_meta_task_points
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_DUEL,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_praxis_score,
)


ANALOG_FACTION_SLUG = "everymen"
ALBESCENT_FACTION_SLUG = "albescent"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


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
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Score computation
# ---------------------------------------------------------------------------


async def compute_praxis_score_from_db(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> float:
    """Compute the current score for a praxis from its votes."""
    task = praxis.task
    if task is None:
        return 0.0

    sum_result = await session.execute(
        select(func.sum(Vote.stars)).where(Vote.praxis_id == praxis.id)
    )
    total_stars = int(sum_result.scalar_one_or_none() or 0)

    if praxis.type == PraxisType.solo:
        creator = praxis.created_by
        character_faction_slug = creator.faction_slug if creator else "na"
        task_faction_slug = task.primary_faction_slug or "na"
        faction_multiplier = compute_faction_multiplier(
            character_faction_slug,
            task_faction_slug,
            era,
            collaboration_mode=COLLABORATION_MODE_SOLO,
        )
        if creator:
            era_row = await get_current_era_row(session)
            creator_stats = await get_or_create_stats(session, creator.id, era_row.id)
            creator_level = creator_stats.level
        else:
            creator_level = 0
        meta_task_points = await get_meta_task_points(praxis.id, creator_level, session)
        return compute_praxis_score(task.point_value, faction_multiplier, total_stars, meta_task_points)

    elif praxis.type == PraxisType.collab:
        # For a collab, return the sum for the praxis as a whole (not per-member)
        task_faction_slug = task.primary_faction_slug or "na"
        # Use first member's faction for simplicity (caller should use per-member)
        if praxis.members:
            first_member = praxis.members[0]
            character_faction_slug = first_member.character.faction_slug if first_member.character else "na"
        else:
            character_faction_slug = "na"
        faction_multiplier = compute_faction_multiplier(
            character_faction_slug,
            task_faction_slug,
            era,
            collaboration_mode=COLLABORATION_MODE_COLLAB,
        )
        return compute_praxis_score(task.point_value, faction_multiplier, total_stars)

    elif praxis.type == PraxisType.duel:
        # For a duel, return the combined star total across members
        faction_multiplier = 1.0
        return compute_praxis_score(task.point_value, faction_multiplier, total_stars)

    return 0.0


# ---------------------------------------------------------------------------
# Build output objects
# ---------------------------------------------------------------------------


async def build_praxis_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    viewer: Optional[Character] = None,
) -> PraxisOut:
    """Build a PraxisOut for any praxis type.

    ``viewer`` is the authenticated viewer's character, used to compute
    viewer-relative flags such as ``can_flag`` and invite visibility.
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

    score = await compute_praxis_score_from_db(praxis, session, era)

    # Duel vote summary
    duel_vote_summary: Optional[list[DuelVoteSummary]] = None
    if praxis.type == PraxisType.duel:
        duel_vote_summary = await _build_duel_vote_summary(praxis, session)

    can_flag = await can_flag_praxis(viewer, praxis, session, era)

    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""

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
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        body_text=praxis.body_text,
        is_withdrawn=praxis.is_withdrawn,
        moderation_status=praxis.moderation_status,
        admin_note=praxis.admin_note,
        flagged_at=praxis.flagged_at,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        members=members,
        invites=invites,
        media_items=media_items,
        score=score,
        duel_vote_summary=duel_vote_summary,
        can_flag=can_flag,
        applied_metatasks=applied_metatasks,
    )


async def build_praxis_card_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisCardOut:
    """Lightweight card for list views."""
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0

    score = await compute_praxis_score_from_db(praxis, session, era)
    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""

    return PraxisCardOut(
        id=praxis.id,
        task_id=praxis.task_id,
        task_title=task_title,
        task_point_value=task_point_value,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        is_withdrawn=praxis.is_withdrawn,
        moderation_status=praxis.moderation_status,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        member_count=len(praxis.members),
        score=score,
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
    )


async def _build_duel_vote_summary(
    praxis: Praxis,
    session: AsyncSession,
) -> list[DuelVoteSummary]:
    """Build per-member vote summary for a duel praxis."""
    result = await session.execute(
        select(Vote.praxis_member_id, func.sum(Vote.stars), func.count(Vote.id))
        .where(
            Vote.praxis_id == praxis.id,
            Vote.praxis_member_id.is_not(None),
        )
        .group_by(Vote.praxis_member_id)
    )
    member_vote_data: dict[int, tuple[int, int]] = {
        member_id: (int(total_stars), int(vote_count))
        for member_id, total_stars, vote_count in result.all()
    }

    summaries = []
    for member in praxis.members:
        total_stars, vote_count = member_vote_data.get(member.id, (0, 0))
        summaries.append(
            DuelVoteSummary(
                member_id=member.id,
                character_id=member.character_id,
                character_display_name=member.character.display_name if member.character else "",
                total_stars=total_stars,
                vote_count=vote_count,
            )
        )
    return summaries


# ---------------------------------------------------------------------------
# CRUD — praxis lifecycle
# ---------------------------------------------------------------------------


async def get_praxis(praxis_id: int, session: AsyncSession) -> Praxis:
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
    return praxis


async def list_praxes(
    session: AsyncSession,
    *,
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    praxis_type: Optional[PraxisType] = None,
    status: Optional[PraxisStatus] = None,
    moderation_status: Optional[str] = None,
    faction: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Praxis]:
    """List praxes with optional filters."""
    query = select(Praxis)

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
        query = query.where(Praxis.created_by_id == character_id)

    if status is not None:
        query = query.where(Praxis.status == status)

    query = query.order_by(Praxis.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())


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

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)

    if stats.level < task.level_required:
        raise HTTPException(
            status_code=403,
            detail=f"This task requires level {task.level_required}.",
        )

    # One-praxis-per-task gate (with Analog Double Dipper carve-out).
    # Uses the same helper that powers the ``can_submit_praxis`` flag on the
    # task detail response so the rule is single-sourced.
    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    if not await can_submit_praxis_for_task(character, task, session):
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a praxis for this task.",
        )

    if praxis_type == PraxisType.duel and stats.level < era.duel_level_required:
        raise HTTPException(
            status_code=403,
            detail=f"Duels require level {era.duel_level_required}.",
        )
    if praxis_type == PraxisType.collab and stats.level < era.collaboration_level_required:
        raise HTTPException(
            status_code=403,
            detail=f"Collaborations require level {era.collaboration_level_required}.",
        )

    in_progress_count = await _count_in_progress_praxes(character_id, session)
    if in_progress_count >= era.max_task_signups:
        raise HTTPException(
            status_code=400,
            detail=f"Task bank is full ({era.max_task_signups} in-progress praxes). Complete or withdraw one first.",
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
        is_withdrawn=False,
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
) -> Praxis:
    """Update title/body_text. Only the creator can update."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot edit another character's praxis.")
    if data.title is not None:
        praxis.title = data.title
    if data.body_text is not None:
        praxis.body_text = data.body_text
    await session.flush()
    # Re-fetch rather than session.refresh(praxis): refresh expires the
    # lazy='raise' relationships and breaks the subsequent build_praxis_out.
    return await get_praxis(praxis_id, session)


async def withdraw_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Mark praxis as withdrawn. Creator only."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot withdraw another character's praxis.")
    if praxis.is_withdrawn:
        raise HTTPException(status_code=422, detail="Praxis is already withdrawn.")

    praxis.is_withdrawn = True
    praxis.status = PraxisStatus.in_progress
    await session.flush()

    await recalculate_character_stats(character_id, session, era)
    await session.flush()
    return await get_praxis(praxis_id, session)


async def resubmit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Re-submit a withdrawn praxis."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot resubmit another character's praxis.")
    if not praxis.is_withdrawn:
        raise HTTPException(status_code=422, detail="Praxis is not withdrawn.")

    praxis.is_withdrawn = False
    await session.flush()

    await recalculate_character_stats(character_id, session, era)
    await session.flush()
    return await get_praxis(praxis_id, session)


async def delete_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
) -> None:
    """Delete a praxis. Creator only. Must be in_progress or withdrawn."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character's praxis.")
    if praxis.status == PraxisStatus.submitted and not praxis.is_withdrawn:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a submitted praxis. Withdraw it first.",
        )
    await session.delete(praxis)
    await session.flush()


async def can_flag_praxis(
    viewer: Optional[Character],
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True if ``viewer`` may flag ``praxis``.

    Mirrors the rules enforced in :func:`flag_praxis`:
    - Viewer must be authenticated (anonymous viewers cannot flag).
    - Viewer must be at or above ``era.flag_level_required`` in the current era.
    - Viewer cannot flag a praxis they authored (character-level check).
    """
    if viewer is None:
        return False
    if viewer.id == praxis.created_by_id:
        return False
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)
    return stats.level >= era.flag_level_required


async def can_submit_praxis_for_task(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
) -> bool:
    """Return True if ``character`` may create a new praxis for ``task``.

    Mirrors the duplicate-submission rule enforced in :func:`create_praxis`:
    - Anonymous viewers never see the submit affordance (False).
    - A character that already authors a non-withdrawn ``Praxis`` for this
      ``task`` cannot submit again, except for the Analog faction (Double
      Dipper perk). Withdrawn prior praxes do not block a fresh submission.

    This helper intentionally stays focused on the one-praxis-per-task rule.
    Level gates, bank-cap checks, and faction-visibility are handled by the
    caller or :func:`create_praxis` itself.
    """
    if character is None:
        return False

    if character.faction_slug == ANALOG_FACTION_SLUG:
        return True

    result = await session.execute(
        select(Praxis.id).where(
            Praxis.created_by_id == character.id,
            Praxis.task_id == task.id,
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none() is None


def allowed_praxis_modes(
    character: Optional[Character],
    task: Task,
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> list[str]:
    """Return the praxis mode values a character may pick for ``task``.

    Mirrors the level gates enforced in :func:`create_praxis`:
    - Solo: always allowed once a viewer is authenticated.
    - Collab: requires ``character_level >= era.collaboration_level_required``.
    - Duel: requires ``character_level >= era.duel_level_required``.

    Anonymous viewers (``character is None``) receive an empty list so the
    UI can hide the mode picker entirely.
    """
    if character is None:
        return []
    modes: list[str] = [PraxisType.solo.value]
    if character_level >= era.collaboration_level_required:
        modes.append(PraxisType.collab.value)
    if character_level >= era.duel_level_required:
        modes.append(PraxisType.duel.value)
    return modes


def is_task_eligible_for_character(
    character: Optional[Character],
    task: Task,
    character_level: int,
) -> bool:
    """Return True if ``character`` is eligible to act on ``task``.

    For standard tasks the gate is only ``task.level_required``. For metatask
    rows the character must also belong to the same faction as the metatask
    (``task.metatask_faction_slug``). Anonymous viewers are never eligible.

    Note this mirrors the metatask scoring gate in
    :func:`services.meta_task.get_meta_task_points`
    (``character_level >= task.level_required``)
    rather than the stricter :func:`apply_metatask` service gate. The flag is
    intended for UI affordances such as "metatasks this character could use
    if they had one" — apply time still runs the full guard.
    """
    if character is None:
        return False
    if character_level < task.level_required:
        return False
    if task.task_type == TaskType.metatask:
        if task.metatask_faction_slug is None:
            return False
        if character.faction_slug != task.metatask_faction_slug:
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

    # Self-flag is always rejected with its own error message so the caller
    # sees a clearer reason than a generic level failure.
    if flagged_by.id == praxis.created_by_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own praxis.")

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
# Collaboration/duel specific operations
# ---------------------------------------------------------------------------


def _check_duel_invite_eligibility(praxis: Praxis, era: EraConfig) -> None:
    """Raise 400 when a duel praxis is already at its max_duel_participants cap."""
    if len(praxis.members) >= era.max_duel_participants:
        raise HTTPException(
            status_code=400,
            detail=f"Duels can only have {era.max_duel_participants} participants.",
        )


def _check_collab_invite_eligibility(praxis: Praxis, era: EraConfig) -> None:
    """Raise 400 when a collab praxis is already at its max_collab_participants cap."""
    if len(praxis.members) >= era.max_collab_participants:
        raise HTTPException(
            status_code=400,
            detail=f"Collaboration is full (max {era.max_collab_participants} participants).",
        )


async def _check_invitee_task_eligibility(
    invitee_id: int,
    task_id: int,
    session: AsyncSession,
) -> None:
    """Reject invites to players who already did this task (non-Analog only)."""
    existing_praxis_result = await session.execute(
        select(Praxis).where(
            Praxis.type == PraxisType.solo,
            Praxis.created_by_id == invitee_id,
            Praxis.task_id == task_id,
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    if existing_praxis_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This player has already submitted proof for this task and is not eligible to be invited.",
        )

    existing_collab_result = await session.execute(
        select(PraxisMember)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == invitee_id,
            Praxis.task_id == task_id,
            Praxis.status == PraxisStatus.submitted,
        )
    )
    if existing_collab_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This player has already completed this task in a collaboration and is not eligible to be invited.",
        )


async def invite_to_praxis(
    praxis_id: int,
    invitee_id: int,
    inviter_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Create an invite. Praxis must be collab or duel. Inviter must be a member."""
    praxis = await get_praxis(praxis_id, session)

    if praxis.type == PraxisType.solo:
        raise HTTPException(status_code=400, detail="Cannot invite to a solo praxis.")
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(status_code=400, detail="Cannot invite to a submitted praxis.")

    member_ids = {m.character_id for m in praxis.members}
    if inviter_id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can send invites.")

    if praxis.type == PraxisType.duel:
        _check_duel_invite_eligibility(praxis, era)
    elif praxis.type == PraxisType.collab:
        _check_collab_invite_eligibility(praxis, era)

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

    # Eligibility check: skip for Analog faction (Double Dipper perk)
    if invitee.faction_slug != ANALOG_FACTION_SLUG:
        await _check_invitee_task_eligibility(invitee_id, praxis.task_id, session)

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

    # Collab capacity cap (enforced at accept, not just invite — avoids races
    # where multiple pending invites push the praxis past its max).
    if praxis.type == PraxisType.collab and len(praxis.members) >= era.max_collab_participants:
        raise HTTPException(
            status_code=400,
            detail=f"Collaboration is full (max {era.max_collab_participants} participants).",
        )

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


async def kick_member(
    praxis_id: int,
    member_id: int,
    requester_id: int,
    session: AsyncSession,
) -> None:
    """Remove a member. Only the creator can kick. Cannot kick self."""
    praxis = await get_praxis(praxis_id, session)

    if praxis.created_by_id != requester_id:
        raise HTTPException(status_code=403, detail="Only the creator can kick members.")

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

    await session.delete(kickee_member)

    # Reset all submitted states when membership changes
    for member in praxis.members:
        if member.character_id != member_id:
            member.has_submitted = False
    praxis.status = PraxisStatus.in_progress

    await session.flush()


async def submit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Mark the member's has_submitted=True. If all members submitted, set praxis.status=submitted."""
    praxis = await get_praxis(praxis_id, session)

    member_ids = {m.character_id for m in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this praxis.")

    for member in praxis.members:
        if member.character_id == character_id:
            member.has_submitted = True
            break

    await session.flush()
    await session.refresh(praxis)

    if all(m.has_submitted for m in praxis.members):
        praxis.status = PraxisStatus.submitted
        await session.flush()
        era_row = await get_current_era_row(session)
        for member in praxis.members:
            await recalculate_character_stats(
                member.character_id, session, era, era_row=era_row
            )

    await session.flush()
    return await get_praxis(praxis_id, session)


async def reopen_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
) -> Praxis:
    """Set praxis back to in_progress. Creator only."""
    praxis = await get_praxis(praxis_id, session)

    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Only the creator can reopen a praxis.")

    praxis.status = PraxisStatus.in_progress
    for member in praxis.members:
        member.has_submitted = False

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
    if character.faction_slug == ALBESCENT_FACTION_SLUG:
        return None
    if character_level < era.metatask_apply_level:
        return (
            f"Must be level {era.metatask_apply_level} or above "
            "to apply metatasks."
        )
    if character.faction_slug != task.metatask_faction_slug:
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
    "allowed_praxis_modes",
    "apply_metatask",
    "build_praxis_out",
    "build_praxis_card_out",
    "can_flag_praxis",
    "can_submit_praxis_for_task",
    "compute_praxis_score_from_db",
    "create_praxis",
    "delete_praxis",
    "flag_praxis",
    "get_praxis",
    "invite_to_praxis",
    "is_task_eligible_for_character",
    "kick_member",
    "list_praxes",
    "moderate_praxis",
    "remove_metatask",
    "reopen_praxis",
    "resubmit_praxis",
    "respond_to_invite",
    "submit_praxis",
    "update_praxis",
    "withdraw_praxis",
]
