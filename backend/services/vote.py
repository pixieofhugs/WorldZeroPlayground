from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.praxis import ModerationStatus, Praxis
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_votes_available


async def cast_vote_on_praxis(
    voter: Character,
    praxis_id: int,
    value: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on any praxis (solo, collab, or duel side).

    Duel sides are standalone solo praxes — no special dispatch needed.
    Raises 404 if the praxis is missing or hidden.
    """
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or praxis.moderation_status == ModerationStatus.hidden:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    return await cast_or_update_vote(voter, praxis, value, session, era)


async def cast_or_update_vote(
    voter: Character,
    praxis: Praxis,
    value: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Vote:
    """Cast or update a vote on a solo or collab praxis.

    Enforces account-level anti-self-vote so alt characters on the same account
    cannot vote on each other's praxes.
    """
    if not 1 <= value <= 5:
        raise HTTPException(status_code=422, detail="Vote value must be between 1 and 5.")

    # Account-level anti-self-vote. Praxis.created_by is selectin-loaded,
    # but fall back to an explicit lookup if it isn't populated.
    author = praxis.created_by
    if author is None and praxis.created_by_id is not None:
        author = await session.get(Character, praxis.created_by_id)
    if author is not None and author.account_id == voter.account_id:
        raise HTTPException(status_code=403, detail="Cannot vote on your own praxis.")

    # Duel anti-participation (#309): a duel participant — any life on their
    # account — cannot rate EITHER side of a duel they're in, not just their own.
    # Account-level anti-self-vote above only blocks the participant's own side.
    from services.duel import get_duel_for_praxis

    duel = await get_duel_for_praxis(praxis.id, session)
    if duel is not None:
        challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
        challenger = (
            await session.get(Character, challenger_praxis.created_by_id)
            if challenger_praxis is not None
            else None
        )
        opponent = await session.get(Character, duel.opponent_character_id)
        participant_account_ids = {
            participant.account_id
            for participant in (challenger, opponent)
            if participant is not None
        }
        if voter.account_id in participant_account_ids:
            raise HTTPException(
                status_code=403,
                detail="Cannot vote on a duel you're a participant in.",
            )

    result = await session.execute(
        select(Vote).where(
            Vote.praxis_id == praxis.id,
            Vote.voter_character_id == voter.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        # Update is free — no budget deduction
        existing.value = value
        await session.flush()
        await recalculate_character_stats(praxis.created_by_id, session, era)
        await session.flush()
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
        value=value,
    )
    stats.votes_spent_this_era += 1
    session.add(vote)
    await session.flush()
    await recalculate_character_stats(praxis.created_by_id, session, era, era_row=era_row)
    await session.flush()
    await session.refresh(vote)
    return vote


