from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from models.character import Character
from models.submission import Submission
from models.vote import Vote
from schemas.vote import VoteIn, VoteOut, VoteSummary
from services.submission import compute_submission_score_from_db
from services.vote import cast_or_update_vote

router = APIRouter()


@router.post("/submissions/{submission_id}/vote", response_model=VoteOut)
async def cast_vote(
    submission_id: int,
    data: VoteIn,
    voter: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")

    # Proper account-level anti-self-vote check
    author_result = await session.get(Character, sub.character_id)
    if author_result and author_result.account_id == voter.account_id:
        raise HTTPException(status_code=403, detail="Cannot vote on your own submission.")

    vote = await cast_or_update_vote(voter, sub, data.stars, session)
    return VoteOut.model_validate(vote)


@router.get("/submissions/{submission_id}/votes", response_model=VoteSummary)
async def get_vote_summary(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
):
    sub = await session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found.")

    count_result = await session.execute(
        select(func.count()).select_from(Vote).where(Vote.submission_id == submission_id)
    )
    total_votes = count_result.scalar_one()

    avg_result = await session.execute(
        select(func.avg(Vote.stars)).where(Vote.submission_id == submission_id)
    )
    avg_stars = float(avg_result.scalar_one_or_none() or 0.0)
    total_score = await compute_submission_score_from_db(sub, session)

    return VoteSummary(
        submission_id=submission_id,
        total_votes=total_votes,
        average_stars=avg_stars,
        total_score=total_score,
    )
