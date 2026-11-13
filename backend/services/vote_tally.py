"""Single source for vote aggregation (ADR-0014), incl. the Task Crown (ADR-0028)."""
from dataclasses import dataclass
from typing import Collection, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis, PraxisStatus
from models.vote import Vote


@dataclass(frozen=True)
class VoteTally:
    """Aggregated vote data for one praxis."""

    points_from_votes: int
    voter_count: int


_EMPTY_TALLY = VoteTally(points_from_votes=0, voter_count=0)


async def tally_votes(
    praxis_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, VoteTally]:
    """A ``VoteTally`` for EVERY requested id, in one query.

    Dense on purpose (#1378): ``id in result`` means "was in the batch", which
    page callers use to decide whether to fall back to their own query.
    """
    if not praxis_ids:
        return {}

    agg_result = await session.execute(
        select(Vote.praxis_id, func.sum(Vote.value), func.count(Vote.id))
        .where(Vote.praxis_id.in_(praxis_ids))
        .group_by(Vote.praxis_id)
    )
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


async def crowned_praxis_ids(
    task_ids: Collection[int],
    session: AsyncSession,
) -> set[int]:
    """Praxes holding their task's Task Crown (ADR-0028): top vote sum among submitted.

    Ties all crown (incl. all-zero) and a sole entrant crowns; no thresholds.
    """
    if not task_ids:
        return set()

    vote_points = func.coalesce(func.sum(Vote.value), 0)
    ranked = (
        select(
            Praxis.id.label("praxis_id"),
            func.rank()
            .over(partition_by=Praxis.task_id, order_by=vote_points.desc())
            .label("crown_rank"),
        )
        .join(Vote, Vote.praxis_id == Praxis.id, isouter=True)
        .where(
            Praxis.status == PraxisStatus.submitted,
            Praxis.task_id.in_(task_ids),
        )
        .group_by(Praxis.id, Praxis.task_id)
        .subquery()
    )
    result = await session.execute(
        select(ranked.c.praxis_id).where(ranked.c.crown_rank == 1)
    )
    return set(result.scalars().all())
