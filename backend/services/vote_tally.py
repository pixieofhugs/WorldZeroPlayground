"""Single source for vote aggregation (ADR-0014).

``tally_votes`` is the one place in the codebase that runs
``func.sum(Vote.value)`` / ``func.count``. All scoring code and display code
consume it; scattered per-query vote sums are deleted.

``crowned_praxis_ids`` (ADR-0028) lives here too: the Task Crown ranking is a
vote aggregation (a per-task max over ``SUM(Vote.value)``), so it stays beside
the tally rather than growing a second sum elsewhere.
"""
from dataclasses import dataclass
from typing import Collection

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.praxis import Praxis, PraxisStatus
from models.vote import Vote


@dataclass(frozen=True)
class VoteTally:
    """Aggregated vote data for one praxis."""

    points_from_votes: int
    voter_count: int


_EMPTY_TALLY = VoteTally(points_from_votes=0, voter_count=0)


async def tally_votes(
    praxis_ids: list[int],
    session: AsyncSession,
) -> dict[int, VoteTally]:
    """Return a ``VoteTally`` for each requested praxis id.

    Praxes with no votes are not included in the result; callers should use
    the helper :func:`get_tally`.
    """
    if not praxis_ids:
        return {}

    agg_result = await session.execute(
        select(Vote.praxis_id, func.sum(Vote.value), func.count(Vote.id))
        .where(Vote.praxis_id.in_(praxis_ids))
        .group_by(Vote.praxis_id)
    )
    return {
        pid: VoteTally(
            points_from_votes=int(total or 0),
            voter_count=int(count or 0),
        )
        for pid, total, count in agg_result.all()
    }


def get_tally(tallies: dict[int, VoteTally], praxis_id: int) -> VoteTally:
    """Return the tally for ``praxis_id``, falling back to an empty tally."""
    return tallies.get(praxis_id, _EMPTY_TALLY)


async def crowned_praxis_ids(
    task_ids: Collection[int],
    session: AsyncSession,
) -> set[int]:
    """Ids of every praxis holding its task's Task Crown (ADR-0028).

    The crown marks the top-scoring **submitted** praxis for its task. A task's
    base points are equal across its praxes, so "top score" reduces to the most
    vote-points (``SUM(Vote.value)``). Fully permissive by design: ties are all
    crowned (co-champions, including the all-zero-votes case) and a sole entrant
    is crowned by default — no minimum-submissions, no vote threshold.

    Computed live in one windowed query over the requested tasks (RANK over the
    per-praxis vote sum, partitioned by task) — never per-card in a build loop.
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
