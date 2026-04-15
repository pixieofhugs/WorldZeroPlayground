"""Business logic for collaboration and duel praxis."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.collaboration import (
    Collaboration,
    CollaborationInvite,
    CollaborationInviteStatus,
    CollaborationMember,
    CollaborationMode,
    CollaborationStatus,
)
from models.task import CharacterTask, CharacterTaskStatus, Task
from schemas.collaboration import (
    CollaborationInviteOut,
    CollaborationMemberOut,
    CollaborationOut,
    DuelVoteSummary,
)
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import SNIDE_FACTION_SLUG


DUEL_LEVEL_REQUIRED = 2
COLLABORATION_LEVEL_REQUIRED = 1


def _build_member_out(member: CollaborationMember) -> CollaborationMemberOut:
    return CollaborationMemberOut(
        character_id=member.character_id,
        display_name=member.character.display_name,
        faction_slug=member.character.faction_slug,
        has_submitted=member.has_submitted,
        joined_at=member.joined_at,
    )


def _build_invite_out(invite: CollaborationInvite) -> CollaborationInviteOut:
    return CollaborationInviteOut(
        id=invite.id,
        collaboration_id=invite.collaboration_id,
        inviter_id=invite.inviter_id,
        inviter_display_name=invite.inviter.display_name,
        invitee_id=invite.invitee_id,
        invitee_display_name=invite.invitee.display_name,
        type=invite.type.value,
        status=invite.status.value,
        created_at=invite.created_at,
    )


def build_collaboration_out(
    collab: Collaboration,
    viewer_character_id: int | None = None,
) -> CollaborationOut:
    """Serialize a Collaboration. Invites only shown to members."""
    member_ids = {m.character_id for m in collab.members}
    include_invites = viewer_character_id in member_ids if viewer_character_id else False

    return CollaborationOut(
        id=collab.id,
        task_id=collab.task_id,
        task_title=collab.task.title,
        task_point_value=collab.task.point_value,
        mode=collab.mode.value,
        status=collab.status.value,
        body_text=collab.body_text,
        created_by_id=collab.created_by_id,
        created_at=collab.created_at,
        updated_at=collab.updated_at,
        members=[_build_member_out(m) for m in collab.members],
        invites=[_build_invite_out(i) for i in collab.invites] if include_invites else [],
    )


async def _count_active_tasks(character_id: int, session: AsyncSession) -> int:
    """Count in-progress CharacterTask rows for capacity enforcement."""
    result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character_id,
            CharacterTask.status == CharacterTaskStatus.in_progress,
        )
    )
    return len(result.scalars().all())


async def _get_character_task(
    character_id: int, task_id: int, session: AsyncSession
) -> CharacterTask | None:
    result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character_id,
            CharacterTask.task_id == task_id,
            CharacterTask.status == CharacterTaskStatus.in_progress,
        )
    )
    return result.scalar_one_or_none()


async def create_collaboration(
    task_id: int,
    mode: str,
    character: Character,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Collaboration:
    """Create a new collaboration or duel from an in-progress task.

    The initiating character automatically becomes the first member.
    Their existing CharacterTask row is reused (not replaced).
    """
    # Level gate
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character.id, era_row.id)
    level_required = DUEL_LEVEL_REQUIRED if mode == "duel" else COLLABORATION_LEVEL_REQUIRED
    if stats.level < level_required:
        raise HTTPException(
            status_code=403,
            detail=f"{'Duels' if mode == 'duel' else 'Collaborations'} require level {level_required}.",
        )

    # Validate mode
    try:
        collab_mode = CollaborationMode(mode)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid mode '{mode}'. Use 'collaboration' or 'duel'.")

    # Character must have the task in-progress
    character_task = await _get_character_task(character.id, task_id, session)
    if character_task is None:
        raise HTTPException(
            status_code=400,
            detail="You must have this task in-progress before starting a collaboration.",
        )

    # Validate task exists
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    collab = Collaboration(
        task_id=task_id,
        mode=collab_mode,
        status=CollaborationStatus.in_progress,
        body_text="",
        created_by_id=character.id,
    )
    session.add(collab)
    await session.flush()  # Get collab.id

    member = CollaborationMember(
        collaboration_id=collab.id,
        character_id=character.id,
        has_submitted=False,
    )
    session.add(member)
    await session.commit()
    await session.refresh(collab)
    return collab


async def invite_member(
    collaboration_id: int,
    inviter: Character,
    invitee_character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CollaborationInvite:
    """Send a collaboration or duel invite. The inviter must be a current member."""
    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    if collab.status == CollaborationStatus.published:
        raise HTTPException(status_code=400, detail="Cannot invite to a published collaboration.")

    # Inviter must be a member
    member_ids = {m.character_id for m in collab.members}
    if inviter.id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can send invites.")

    # Duels: max 2 participants
    if collab.mode == CollaborationMode.duel and len(collab.members) >= 2:
        raise HTTPException(status_code=400, detail="Duels can only have 2 participants.")

    # Collaborations: max 20 members
    if len(collab.members) >= era.max_task_signups:
        raise HTTPException(status_code=400, detail="This collaboration is already at max capacity.")

    # Can't invite yourself
    if invitee_character_id == inviter.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself.")

    # Can't invite someone already in the collaboration
    if invitee_character_id in member_ids:
        raise HTTPException(status_code=409, detail="Player is already a member.")

    # Can't send a duplicate pending invite
    existing_invite = await session.execute(
        select(CollaborationInvite).where(
            CollaborationInvite.collaboration_id == collaboration_id,
            CollaborationInvite.inviter_id == inviter.id,
            CollaborationInvite.invitee_id == invitee_character_id,
            CollaborationInvite.status == CollaborationInviteStatus.pending,
        )
    )
    if existing_invite.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="A pending invite already exists. Resolve it before sending another.",
        )

    invitee = await session.get(Character, invitee_character_id)
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invitee not found.")

    invite = CollaborationInvite(
        collaboration_id=collaboration_id,
        inviter_id=inviter.id,
        invitee_id=invitee_character_id,
        type=collab.mode,
        status=CollaborationInviteStatus.pending,
    )
    session.add(invite)
    await session.commit()
    await session.refresh(invite)
    return invite


async def respond_to_invite(
    invite_id: int,
    character: Character,
    accept: bool,
    drop_task_id: int | None,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Collaboration:
    """Accept or decline a collaboration invite.

    If accepting with a full task list (20 tasks), the caller must supply
    drop_task_id — a task to drop before joining. Returns 409 if the list is full
    and no drop_task_id was provided.

    For duel challenges: if the invitee already has the task as a solo praxis,
    accepting withdraws that praxis.
    """
    invite = await session.get(CollaborationInvite, invite_id)
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.invitee_id != character.id:
        raise HTTPException(status_code=403, detail="This invite is not for you.")

    if invite.status != CollaborationInviteStatus.pending:
        raise HTTPException(status_code=400, detail="Invite has already been resolved.")

    if not accept:
        invite.status = CollaborationInviteStatus.declined
        await session.commit()
        collab = await session.get(Collaboration, invite.collaboration_id)
        return collab

    collab = await session.get(Collaboration, invite.collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration no longer exists.")

    if collab.status == CollaborationStatus.published:
        raise HTTPException(status_code=400, detail="Cannot join a published collaboration.")

    # Check task list capacity
    active_count = await _count_active_tasks(character.id, session)
    existing_task = await _get_character_task(character.id, collab.task_id, session)
    will_add_task = existing_task is None

    if will_add_task and active_count >= era.max_task_signups:
        if drop_task_id is None:
            raise HTTPException(
                status_code=409,
                detail="Task list is full (20 tasks). Provide drop_task_id to drop a task and accept.",
            )
        # Drop the specified task
        task_to_drop = await _get_character_task(character.id, drop_task_id, session)
        if task_to_drop is None:
            raise HTTPException(
                status_code=400,
                detail="The task you want to drop is not in your in-progress list.",
            )
        task_to_drop.status = CharacterTaskStatus.abandoned
        await session.flush()

    # For duels: if the invitee already has this task as an in-progress solo praxis, withdraw it
    if collab.mode == CollaborationMode.duel and existing_task is not None:
        from models.praxis import Praxis
        existing_praxis_result = await session.execute(
            select(Praxis).where(
                Praxis.character_id == character.id,
                Praxis.task_id == collab.task_id,
                Praxis.is_withdrawn == False,
            )
        )
        existing_praxis = existing_praxis_result.scalar_one_or_none()
        if existing_praxis is not None:
            existing_praxis.is_withdrawn = True
            await session.flush()

    # Add CharacterTask if not already present
    if will_add_task:
        new_task = CharacterTask(
            character_id=character.id,
            task_id=collab.task_id,
            status=CharacterTaskStatus.in_progress,
        )
        session.add(new_task)
        await session.flush()

    # Add member
    member = CollaborationMember(
        collaboration_id=collab.id,
        character_id=character.id,
        has_submitted=False,
    )
    session.add(member)

    invite.status = CollaborationInviteStatus.accepted
    await session.commit()
    await session.refresh(collab)
    return collab


async def submit_for_member(
    collaboration_id: int,
    character: Character,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Collaboration:
    """Mark this member as having submitted. Publishes when all members have submitted."""
    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    member_ids = {m.character_id for m in collab.members}
    if character.id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this collaboration.")

    # Mark this member submitted
    for member in collab.members:
        if member.character_id == character.id:
            member.has_submitted = True
            break

    await session.flush()

    # Reload to check if all are submitted
    await session.refresh(collab)
    if all(m.has_submitted for m in collab.members):
        collab.status = CollaborationStatus.published
        await session.flush()
        # Award base points to each member
        for member in collab.members:
            from services.character_stats import recalculate_character_stats
            await recalculate_character_stats(member.character_id, session, era)

    await session.commit()
    await session.refresh(collab)
    return collab


async def reopen_collaboration(
    collaboration_id: int,
    character: Character,
    session: AsyncSession,
) -> Collaboration:
    """Reset all submit states; reopen for editing. Any member can trigger this."""
    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    member_ids = {m.character_id for m in collab.members}
    if character.id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this collaboration.")

    collab.status = CollaborationStatus.in_progress
    for member in collab.members:
        member.has_submitted = False

    await session.commit()
    await session.refresh(collab)
    return collab


async def kick_member(
    collaboration_id: int,
    kicker: Character,
    kickee_character_id: int,
    session: AsyncSession,
) -> Collaboration:
    """Remove a member from the collaboration. Any member can kick any other member.

    - Kicked member's CharacterTask is abandoned (they lose the task and progress).
    - Their contributed body_text content remains in the shared document.
    - All submission states reset.
    """
    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    member_ids = {m.character_id for m in collab.members}
    if kicker.id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this collaboration.")

    if kickee_character_id not in member_ids:
        raise HTTPException(status_code=400, detail="Target player is not a member.")

    if kickee_character_id == kicker.id:
        raise HTTPException(status_code=400, detail="Cannot kick yourself. Use /edit to leave.")

    # Remove the member record
    kickee_member_result = await session.execute(
        select(CollaborationMember).where(
            CollaborationMember.collaboration_id == collaboration_id,
            CollaborationMember.character_id == kickee_character_id,
        )
    )
    kickee_member = kickee_member_result.scalar_one_or_none()
    if kickee_member:
        await session.delete(kickee_member)

    # Abandon the kicked member's CharacterTask
    kickee_task = await _get_character_task(kickee_character_id, collab.task_id, session)
    if kickee_task:
        kickee_task.status = CharacterTaskStatus.abandoned

    # Reset all submit states
    for member in collab.members:
        if member.character_id != kickee_character_id:
            member.has_submitted = False
    collab.status = CollaborationStatus.in_progress

    await session.commit()
    await session.refresh(collab)
    return collab


async def update_document(
    collaboration_id: int,
    character: Character,
    body_text: str,
    session: AsyncSession,
) -> Collaboration:
    """Update the shared document. Any member can edit at any time.

    Editing a published collaboration reopens it (resets all submit states).
    """
    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    member_ids = {m.character_id for m in collab.members}
    if character.id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can edit the document.")

    collab.body_text = body_text

    # Editing a published collab reopens it
    if collab.status == CollaborationStatus.published:
        collab.status = CollaborationStatus.in_progress
        for member in collab.members:
            member.has_submitted = False

    await session.commit()
    await session.refresh(collab)
    return collab


async def get_duel_vote_summary(
    collaboration_id: int,
    session: AsyncSession,
) -> list[DuelVoteSummary]:
    """Return live vote tally per player for a duel, with current winner indicated."""
    from sqlalchemy import func
    from models.vote import Vote

    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    if collab.mode != CollaborationMode.duel:
        raise HTTPException(status_code=400, detail="Vote summaries are only available for duels.")

    # Sum stars per target player
    result = await session.execute(
        select(Vote.duel_vote_for, func.sum(Vote.stars)).where(
            Vote.collaboration_id == collaboration_id,
            Vote.duel_vote_for.is_not(None),
        ).group_by(Vote.duel_vote_for)
    )
    vote_totals: dict[int, int] = {char_id: int(stars) for char_id, stars in result.all()}

    summaries = []
    member_stars_list = [(m.character_id, vote_totals.get(m.character_id, 0)) for m in collab.members]
    max_stars = max((stars for _, stars in member_stars_list), default=0)

    for member in collab.members:
        stars = vote_totals.get(member.character_id, 0)
        # "Winning" means highest stars. Ties show both as winning.
        is_winning = stars == max_stars and max_stars > 0
        summaries.append(
            DuelVoteSummary(
                character_id=member.character_id,
                display_name=member.character.display_name,
                total_stars=stars,
                is_winning=is_winning,
            )
        )

    return summaries
