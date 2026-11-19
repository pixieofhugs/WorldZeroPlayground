"""Admin ring view: where one account's votes went this era (#3546)."""
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.praxis import PraxisMember
from models.vote import Vote
from schemas.admin import RingRecipient, VoteRingOut
from services.era import get_current_era_row

_TOP_N = 3


async def get_vote_ring(account_id: int, session: AsyncSession) -> VoteRingOut:
    if await session.get(Account, account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    era_row = await get_current_era_row(session)
    in_era = Vote.created_at >= era_row.started_at

    # A vote reaches every member of its praxis, so a collab vote lands on each.
    rows = (
        await session.execute(
            select(Vote.id, Vote.value, Character.account_id, Character.display_name)
            .join(PraxisMember, PraxisMember.praxis_id == Vote.praxis_id)
            .join(Character, Character.id == PraxisMember.character_id)
            .where(
                Vote.voter_account_id == account_id,
                in_era,
                Character.account_id != account_id,
            )
        )
    ).all()
    total_votes = (
        await session.scalar(
            select(func.count(Vote.id)).where(Vote.voter_account_id == account_id, in_era)
        )
        or 0
    )

    votes_by: dict[int, list[tuple[int, int]]] = defaultdict(list)
    names: dict[int, str] = {}
    for vote_id, value, recipient_id, name in rows:
        votes_by[recipient_id].append((vote_id, value))
        names.setdefault(recipient_id, name)

    returned: set[int] = set()
    if votes_by:
        returned = set(
            await session.scalars(
                select(Vote.voter_account_id)
                .join(PraxisMember, PraxisMember.praxis_id == Vote.praxis_id)
                .join(Character, Character.id == PraxisMember.character_id)
                .where(
                    Vote.voter_account_id.in_(votes_by),
                    Character.account_id == account_id,
                    in_era,
                )
                .distinct()
            )
        )

    ranked = sorted(votes_by, key=lambda r: (-len(votes_by[r]), r))
    top_vote_ids = {v for r in ranked[:_TOP_N] for v, _ in votes_by[r]}
    return VoteRingOut(
        total_votes=total_votes,
        top3_share=len(top_vote_ids) / total_votes if total_votes else 0.0,
        recipients=[
            RingRecipient(
                account_id=r,
                display_name=names[r],
                votes=len(votes_by[r]),
                average_stars=sum(val for _, val in votes_by[r]) / len(votes_by[r]),
                share=len(votes_by[r]) / total_votes,
                reciprocal=r in returned,
            )
            for r in ranked
        ],
    )
