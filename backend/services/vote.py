from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.collaboration import Collaboration, CollaborationMember, CollaborationMode
from models.praxis import Praxis
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats


async def cast_or_update_vote(
    voter: Character,
    praxis: Praxis,
    stars: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a solo praxis."""
    if not 1 <= stars <= 5:
        raise HTTPException(status_code=422, detail="Stars must be between 1 and 5.")

    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_character_id == voter.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        # Update is free — no budget deduction
        existing.stars = stars
        await session.commit()
        await recalculate_character_stats(praxis.character_id, session, era)
        await session.commit()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget via CharacterStats
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if stats.votes_available <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    vote = Vote(
        praxis_id=praxis.id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        stars=stars,
    )
    stats.votes_available -= 1
    session.add(vote)
    await session.flush()  # persist vote before recalculating so avg includes it
    await recalculate_character_stats(praxis.character_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote


async def cast_or_update_duel_vote(
    voter: Character,
    collaboration_id: int,
    target_character_id: int,
    stars: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a specific player in a duel collaboration.

    - Voters must NOT be members of the duel.
    - target_character_id must be a member of the duel.
    - A voter may vote for one or both players; each is a separate Vote row.
    - First cast costs 1 from vote budget; updating an existing vote is free.
    """
    if not 1 <= stars <= 5:
        raise HTTPException(status_code=422, detail="Stars must be between 1 and 5.")

    collab = await session.get(Collaboration, collaboration_id)
    if collab is None:
        raise HTTPException(status_code=404, detail="Collaboration not found.")

    if collab.mode != CollaborationMode.duel:
        raise HTTPException(status_code=400, detail="Duel votes can only be cast on duel collaborations.")

    member_ids = {m.character_id for m in collab.members}

    # Anti-self-vote: members cannot vote on their own duel
    if voter.id in member_ids:
        raise HTTPException(status_code=403, detail="Duel participants cannot vote on their own duel.")

    # target must be a duel member
    if target_character_id not in member_ids:
        raise HTTPException(status_code=400, detail="Target player is not a member of this duel.")

    # Check for existing vote by this voter for this target in this collaboration
    existing_result = await session.execute(
        select(Vote).where(
            Vote.collaboration_id == collaboration_id,
            Vote.voter_character_id == voter.id,
            Vote.duel_vote_for == target_character_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        # Update is free
        existing.stars = stars
        await session.commit()
        # Recalculate scores for both duel members
        for member_id in member_ids:
            await recalculate_character_stats(member_id, session, era)
        await session.commit()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if stats.votes_available <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    vote = Vote(
        collaboration_id=collaboration_id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        stars=stars,
        duel_vote_for=target_character_id,
    )
    stats.votes_available -= 1
    session.add(vote)
    await session.flush()
    for member_id in member_ids:
        await recalculate_character_stats(member_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote
