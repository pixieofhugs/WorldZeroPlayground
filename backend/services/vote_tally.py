"""Single source for vote aggregation (ADR-0014).

``tally_votes`` is the one place in the codebase that runs
``func.sum(Vote.value)`` / ``func.count``. All scoring code and display code
consume it; scattered per-query vote sums are deleted.

``crowned_praxis_ids`` (ADR-0028) lives here too: the Task Crown ranking is a
vote aggregation (a per-task max over ``SUM(Vote.value)``), so it stays beside
the tally rather than growing a second sum elsewhere.
"""
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


@dataclass(frozen=True)
class ViewerVote:
    """The viewer *account*'s vote state on one praxis (#644 §7).

    ``value`` is the **carried character's** own star (1-5) — the character-scoped
    ``viewer_vote`` that renders the viewer's highlight — or ``None`` if the
    carried character has not voted. ``voted_by_name`` names an *account-mate*
    character who voted when the carried character did not: the account-scoped
    "voted by Alice" marker. The two are mutually exclusive by construction — the
    marker only fires when the carried character's own star is absent.

    Since #1150 an account holds at most ONE vote per praxis, so the marker means
    "your account's vote on this praxis was set by another of your lives"; rating
    it as the carried character re-rates that row and moves the attribution to it,
    retiring the marker. The two fields could not co-occur before either; now the
    data cannot even represent it.
    """

    value: Optional[int]
    voted_by_name: Optional[str]


async def viewer_votes_for(
    praxis_ids: Collection[int],
    viewer_character_id: int,
    viewer_account_id: int,
    session: AsyncSession,
) -> dict[int, "ViewerVote"]:
    """The viewer account's vote state per praxis, one batched query (not per-card).

    Account-scoped (#644): matches on ``Vote.voter_account_id`` so a vote cast by
    any character on the viewer's account is seen, then splits each praxis into the
    carried character's own star (``value``) and, only when that is absent, the
    display name of an account-mate who voted (``voted_by_name``). ``viewer_vote``
    on the card stays character-scoped; the marker is the account-scoped extra.
    """
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
            # One row per (praxis, account) since #1150, so there is only ever one
            # mate to name. setdefault stays as defence for pre-#1150 rows: first
            # account-mate wins, a deterministic single name for the marker.
            account_mate_name.setdefault(praxis_id, display_name)

    votes: dict[int, ViewerVote] = {}
    for praxis_id in carried_value.keys() | account_mate_name.keys():
        own = carried_value.get(praxis_id)
        # Marker only when the carried character did NOT vote this praxis.
        mate = account_mate_name.get(praxis_id) if own is None else None
        votes[praxis_id] = ViewerVote(value=own, voted_by_name=mate)
    return votes


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
