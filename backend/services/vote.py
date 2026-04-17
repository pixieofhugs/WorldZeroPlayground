from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisType
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_votes_available


async def cast_or_update_vote(
    voter: Character,
    praxis: Praxis,
    stars: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a solo or collab praxis."""
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
        await recalculate_character_stats(praxis.created_by_id, session, era)
        await session.commit()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget via CharacterStats (on-read recomputation)
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if compute_votes_available(stats, era) <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    vote = Vote(
        praxis_id=praxis.id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        stars=stars,
    )
    stats.votes_spent_this_era += 1
    session.add(vote)
    await session.flush()
    await recalculate_character_stats(praxis.created_by_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote


async def cast_or_update_duel_vote(
    voter: Character,
    praxis_id: int,
    praxis_member_id: int,
    stars: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a specific member in a duel praxis.

    - Voters must NOT be members of the duel.
    - praxis_member_id must be a member of the duel.
    - A voter may vote for one or both members; each is a separate Vote row.
    - First cast costs 1 from vote budget; updating an existing vote is free.
    """
    if not 1 <= stars <= 5:
        raise HTTPException(status_code=422, detail="Stars must be between 1 and 5.")

    praxis = await session.get(Praxis, praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")

    if praxis.type != PraxisType.duel:
        raise HTTPException(status_code=400, detail="Duel votes can only be cast on duel praxes.")

    member_ids = {m.character_id for m in praxis.members}
    member_row_ids = {m.id for m in praxis.members}
    member_account_ids = {
        m.character.account_id for m in praxis.members if m.character is not None
    }

    # Anti-self-vote: enforced at account level so alt characters on the same
    # account cannot vote on a duel their other character is in.
    if voter.account_id in member_account_ids:
        raise HTTPException(
            status_code=403,
            detail="You cannot vote on a duel where your account owns a participant.",
        )

    # praxis_member_id must refer to a member of this duel
    if praxis_member_id not in member_row_ids:
        raise HTTPException(status_code=400, detail="Target member is not part of this duel.")

    # Check for existing vote by this voter for this praxis_member in this praxis
    existing_result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis_id,
            Vote.voter_character_id == voter.id,
            Vote.praxis_member_id == praxis_member_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        # Update is free
        existing.stars = stars
        await session.commit()
        for member_id in member_ids:
            await recalculate_character_stats(member_id, session, era)
        await session.commit()
        await session.refresh(existing)
        return existing

    # New vote — deduct from budget (on-read recomputation)
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, voter.id, era_row.id)

    if compute_votes_available(stats, era) <= 0:
        raise HTTPException(status_code=403, detail="No votes remaining in your budget.")

    # Look up the character_id for the targeted member
    target_member_result = await session.execute(
        select(PraxisMember).where(PraxisMember.id == praxis_member_id)
    )
    target_member = target_member_result.scalar_one_or_none()
    if target_member is None:
        raise HTTPException(status_code=404, detail="Target praxis member not found.")

    vote = Vote(
        praxis_id=praxis_id,
        voter_character_id=voter.id,
        voter_account_id=voter.account_id,
        stars=stars,
        praxis_member_id=praxis_member_id,
    )
    stats.votes_spent_this_era += 1
    session.add(vote)
    await session.flush()
    for member_id in member_ids:
        await recalculate_character_stats(member_id, session, era)
    await session.commit()
    await session.refresh(vote)
    return vote
