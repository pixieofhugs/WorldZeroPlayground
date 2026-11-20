"""Admin ring view: where one account's votes went this era (#3546)."""
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character, CharacterStatus
from models.praxis import PraxisMember
from models.vote import Vote
from schemas.admin import RingRecipient, VoteRingOut
from services.era import get_current_era_row


async def get_vote_ring(account_id: int, session: AsyncSession) -> VoteRingOut:
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
            select(func.count(Vote.id)).where(
                Vote.voter_account_id == account_id, in_era
            )
        )
        or 0
    )

    votes_by: dict[int, list[tuple[int, int]]] = defaultdict(list)
    names: dict[int, str] = {}
    for vote_id, value, recipient_id, name in rows:
        names.setdefault(recipient_id, name)
        if (vote_id, value) not in votes_by[recipient_id]:
            votes_by[recipient_id].append((vote_id, value))

    # Account-level, like the vote itself (ADR-0041): never your own account's
    # characters. Banned and departed lives can't be voted for.
    eligible = (
        await session.scalar(
            select(func.count(func.distinct(Character.account_id))).where(
                Character.account_id != account_id,
                Character.status != CharacterStatus.banned,
            )
        )
        or 0
    )

    back: dict[int, int] = {}
    back_of: dict[int, int] = {}
    if votes_by:
        back = dict(
            (
                await session.execute(
                    select(Vote.voter_account_id, func.count(func.distinct(Vote.id)))
                    .join(PraxisMember, PraxisMember.praxis_id == Vote.praxis_id)
                    .join(Character, Character.id == PraxisMember.character_id)
                    .where(
                        Vote.voter_account_id.in_(votes_by),
                        Character.account_id == account_id,
                        in_era,
                    )
                    .group_by(Vote.voter_account_id)
                )
            ).all()
        )
        back_of = dict(
            (
                await session.execute(
                    select(Vote.voter_account_id, func.count(Vote.id))
                    .where(Vote.voter_account_id.in_(votes_by), in_era)
                    .group_by(Vote.voter_account_id)
                )
            ).all()
        )

    ranked = sorted(votes_by, key=lambda r: (-len(votes_by[r]), r))
    return VoteRingOut(
        total_votes=total_votes,
        eligible=eligible,
        recipients=[
            RingRecipient(
                account_id=r,
                display_name=names[r],
                votes=len(votes_by[r]),
                average_stars=sum(val for _, val in votes_by[r]) / len(votes_by[r]),
                share=len(votes_by[r]) / total_votes,
                votes_back=back.get(r, 0),
                votes_back_of=back_of.get(r, 0),
            )
            for r in ranked
        ],
    )
