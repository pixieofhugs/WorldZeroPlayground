"""Single source for vote aggregation (ADR-0014)."""
from dataclasses import dataclass
from typing import Collection, Literal, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account, AccountStatus
from models.character import Character
from models.praxis import Praxis
from models.vote import Vote


@dataclass(frozen=True)
class VoteTally:
    """Aggregated vote data for one praxis."""

    points_from_votes: int
    voter_count: int


_EMPTY_TALLY = VoteTally(points_from_votes=0, voter_count=0)


def _counted_votes(query):
    """Join voters, dropping moderated ones; deletion keeps them (ADR-0081)."""
    # Deferred: services.character -> services.era -> this module is a cycle.
    from services.character import MOD_BANNED

    return (
        query.join(Character, Character.id == Vote.voter_character_id)
        .join(Account, Account.id == Vote.voter_account_id)
        .where(Account.status != AccountStatus.suspended, ~MOD_BANNED)
    )


async def counted_voters(
    praxis_id: int, session: AsyncSession
) -> list[tuple[Vote, Character]]:
    """The votes ``tally_votes`` counts, newest first, with their voters."""
    result = await session.execute(
        _counted_votes(select(Vote, Character))
        .where(Vote.praxis_id == praxis_id)
        .order_by(Vote.created_at.desc())
    )
    return [(vote, character) for vote, character in result.all()]


async def tally_votes(
    praxis_ids: Collection[int],
    session: AsyncSession,
    *,
    cast_in: int | Literal["sealed"] | None = None,
) -> dict[int, VoteTally]:
    """A ``VoteTally`` for EVERY requested id, in one query.

    ``cast_in``: ``None`` counts every vote; an era id counts votes cast in that
    era; ``"sealed"`` counts each praxis's votes from the era it was sealed in,
    the number its card and crown show (ADR-0099).

    Dense on purpose (#1378): ``id in result`` means "was in the batch", which
    page callers use to decide whether to fall back to their own query.
    """
    if not praxis_ids:
        return {}

    query = _counted_votes(
        select(Vote.praxis_id, func.sum(Vote.value), func.count(Vote.id))
    ).where(Vote.praxis_id.in_(praxis_ids)).group_by(Vote.praxis_id)
    if cast_in == "sealed":
        # era_id is stamped at seal; an unsealed praxis counts all.
        query = query.join(Praxis, Praxis.id == Vote.praxis_id).where(
            or_(Praxis.era_id.is_(None), Vote.era_id == Praxis.era_id)
        )
    elif cast_in is not None:
        query = query.where(Vote.era_id == cast_in)
    agg_result = await session.execute(query)
    tallies: dict[int, VoteTally] = {
        praxis_id: _EMPTY_TALLY for praxis_id in praxis_ids
    }
    for pid, total, count in agg_result.all():
        tallies[pid] = VoteTally(
            points_from_votes=int(total or 0),
            voter_count=int(count or 0),
        )
    return tallies


def get_tally(tallies: dict[int, VoteTally], praxis_id: int) -> VoteTally:
    """Safe read from a map gathered for a different id set."""
    return tallies.get(praxis_id, _EMPTY_TALLY)


@dataclass(frozen=True)
class ViewerVote:
    """The viewer account's vote on one praxis (#644 §7).

    ``value`` is the carried character's own star; ``voted_by_name`` names the
    account-mate who voted instead. Mutually exclusive.
    """

    value: Optional[int]
    voted_by_name: Optional[str]


async def viewer_votes_for(
    praxis_ids: Collection[int],
    viewer_character_id: int,
    viewer_account_id: int,
    session: AsyncSession,
) -> dict[int, "ViewerVote"]:
    """:class:`ViewerVote` per praxis: one batched query keyed on the account (#644)."""
    if not praxis_ids:
        return {}
    result = await session.execute(
        select(
            Vote.praxis_id,
            Vote.voter_character_id,
            Vote.value,
            Character.display_name,
        )
        .join(Character, Character.id == Vote.voter_character_id)
        .where(
            Vote.praxis_id.in_(praxis_ids),
            Vote.voter_account_id == viewer_account_id,
        )
    )
    carried_value: dict[int, int] = {}
    account_mate_name: dict[int, str] = {}
    for praxis_id, voter_character_id, value, display_name in result.all():
        if voter_character_id == viewer_character_id:
            carried_value[praxis_id] = value
        else:
            # setdefault guards pre-#1150 rows (several per account).
            account_mate_name.setdefault(praxis_id, display_name)

    votes: dict[int, ViewerVote] = {}
    for praxis_id in carried_value.keys() | account_mate_name.keys():
        own = carried_value.get(praxis_id)
        mate = account_mate_name.get(praxis_id) if own is None else None
        votes[praxis_id] = ViewerVote(value=own, voted_by_name=mate)
    return votes
