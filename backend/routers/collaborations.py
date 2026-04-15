"""Routes for collaborations and duels."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from game_config import CURRENT_ERA
from models.character import Character
from schemas.collaboration import (
    CollaborationCreate,
    CollaborationDocumentUpdate,
    CollaborationInviteCreate,
    CollaborationInviteOut,
    CollaborationOut,
    CollaborationVoteIn,
    DuelVoteSummary,
    InviteResponse,
)
from schemas.vote import VoteOut
from services.collaboration import (
    build_collaboration_out,
    create_collaboration,
    get_duel_vote_summary,
    invite_member,
    kick_member,
    reopen_collaboration,
    respond_to_invite,
    submit_for_member,
    update_document,
)
from services.vote import cast_or_update_duel_vote

router = APIRouter()


@router.post("", response_model=CollaborationOut)
async def create_collaboration_route(
    data: CollaborationCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Create a new collaboration or duel from an in-progress task."""
    collab = await create_collaboration(
        task_id=data.task_id,
        mode=data.mode,
        character=character,
        session=session,
        era=CURRENT_ERA,
    )
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.get("/{collaboration_id}", response_model=CollaborationOut)
async def get_collaboration_route(
    collaboration_id: int,
    character: Character | None = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Get collaboration details. Invites visible only to members."""
    from fastapi import HTTPException
    from models.collaboration import Collaboration

    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")
    return build_collaboration_out(collab, viewer_character_id=character.id if character else None)


@router.post("/{collaboration_id}/document", response_model=CollaborationOut)
async def update_document_route(
    collaboration_id: int,
    data: CollaborationDocumentUpdate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Update the shared document. Any member can edit."""
    collab = await update_document(collaboration_id, character, data.body_text, session)
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.post("/{collaboration_id}/invite", response_model=CollaborationInviteOut)
async def invite_member_route(
    collaboration_id: int,
    data: CollaborationInviteCreate,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Send an invite to another player."""
    invite = await invite_member(
        collaboration_id=collaboration_id,
        inviter=character,
        invitee_character_id=data.invitee_character_id,
        session=session,
        era=CURRENT_ERA,
    )
    from services.collaboration import _build_invite_out
    return _build_invite_out(invite)


@router.post("/{collaboration_id}/invites/{invite_id}/respond", response_model=CollaborationOut)
async def respond_to_invite_route(
    collaboration_id: int,
    invite_id: int,
    data: InviteResponse,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Accept or decline a collaboration/duel invite."""
    collab = await respond_to_invite(
        invite_id=invite_id,
        character=character,
        accept=data.accept,
        drop_task_id=data.drop_task_id,
        session=session,
        era=CURRENT_ERA,
    )
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.post("/{collaboration_id}/submit", response_model=CollaborationOut)
async def submit_route(
    collaboration_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Mark this member as having submitted. Publishes when all members submit."""
    collab = await submit_for_member(collaboration_id, character, session, era=CURRENT_ERA)
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.post("/{collaboration_id}/edit", response_model=CollaborationOut)
async def edit_route(
    collaboration_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Reopen collaboration for editing; reset all submit states."""
    collab = await reopen_collaboration(collaboration_id, character, session)
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.post("/{collaboration_id}/kick/{target_character_id}", response_model=CollaborationOut)
async def kick_member_route(
    collaboration_id: int,
    target_character_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Remove a member from the collaboration."""
    collab = await kick_member(collaboration_id, character, target_character_id, session)
    return build_collaboration_out(collab, viewer_character_id=character.id)


@router.get("/{collaboration_id}/votes", response_model=list[DuelVoteSummary])
async def get_votes_route(
    collaboration_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Get live vote tally for a duel (duel only)."""
    return await get_duel_vote_summary(collaboration_id, session)


@router.post("/{collaboration_id}/vote", response_model=VoteOut)
async def cast_vote_route(
    collaboration_id: int,
    data: CollaborationVoteIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Cast a vote for a specific player in a duel (duel only, non-members only)."""
    vote = await cast_or_update_duel_vote(
        voter=character,
        collaboration_id=collaboration_id,
        target_character_id=data.target_character_id,
        stars=data.stars,
        session=session,
        era=CURRENT_ERA,
    )
    from schemas.vote import VoteOut
    return VoteOut.model_validate(vote)
