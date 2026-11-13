"""Praxis read model: ORM rows to ``*Out`` bodies, plus page-wide precompute maps
that keep feeds free of N+1.

Imports ``services.praxis`` (for ``can_flag``); never the reverse.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis, PraxisInvite, PraxisMember
from models.task import Task
from schemas.praxis import (
    MediaItemOut,
    PraxisCardOut,
    PraxisInviteOut,
    PraxisMemberOut,
    PraxisOut,
)
from schemas.task import TaskOut
from services.era import get_current_era_row
from services.nudge import nudged_at_map
from services.praxis import can_flag_praxis
from services.praxis_scoring import Contribution, compute_contributions
from services.vote import viewer_can_vote, viewer_can_vote_map
from services.vote_tally import (
    crowned_praxis_ids,
    get_tally,
    tally_votes,
    ViewerVote,
    viewer_votes_for,
    VoteTally,
)


def _build_member_out(
    member: PraxisMember,
    nudged_at: Optional[datetime] = None,
) -> PraxisMemberOut:
    """One roster row. ``nudged_at`` is detail-only: cards have no nudge button."""
    return PraxisMemberOut(
        id=member.id,
        praxis_id=member.praxis_id,
        character_id=member.character_id,
        character_display_name=member.character.display_name,
        character_avatar_url=member.character.avatar_url,
        has_submitted=member.has_submitted,
        is_done=member.is_done,
        submitted_at=member.submitted_at,
        joined_at=member.joined_at,
        nudged_at=nudged_at,
    )


def _build_invite_out(invite: PraxisInvite) -> PraxisInviteOut:
    return PraxisInviteOut(
        id=invite.id,
        praxis_id=invite.praxis_id,
        inviter_id=invite.inviter_id,
        invitee_id=invite.invitee_id,
        invitee_display_name=invite.invitee.display_name,
        invitee_avatar_url=invite.invitee.avatar_url,
        status=invite.status,
        created_at=invite.created_at,
    )


async def build_praxis_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    viewer: Optional[Character],
    crowned_ids: Optional[set[int]] = None,
) -> PraxisOut:
    """Build a PraxisOut for any praxis type.

    ``viewer`` is required and keyword-only (#1974) so a forgotten viewer can't
    silently get the anonymous payload (a vote widget on your own praxis); pass
    ``None`` explicitly for anonymous. ``crowned_ids``: list-route precompute
    (ADR-0028).
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0

    # When the viewer last nudged each member, within the rate-limit window (#1083).
    nudged_at_by_character = (
        await nudged_at_map(praxis.id, viewer.id, session) if viewer is not None else {}
    )
    members = [
        _build_member_out(m, nudged_at_by_character.get(m.character_id))
        for m in praxis.members
    ]

    effective_viewer_id = viewer.id if viewer is not None else None
    member_ids = {m.character_id for m in praxis.members}
    include_invites = effective_viewer_id in member_ids if effective_viewer_id else False
    invites = [_build_invite_out(i) for i in praxis.invites] if include_invites else []

    media_items = [MediaItemOut.model_validate(item) for item in praxis.media_items]

    # Author-scoped total (ADR-0053), same resolver as the card so they agree.
    tally_map = await tally_votes([praxis.id], session)
    tally = get_tally(tally_map, praxis.id)
    contribution = (await author_contributions_for([praxis], session, era)).get(praxis.id)
    (
        metatask_points,
        display_multiplier,
        points_from_votes,
        habit_bonus_points,
        score,
    ) = _resolve_card_scoring(contribution, task_point_value, tally.points_from_votes)

    # ``resolved`` included so a past duel keeps its link (ADR-0052).
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis.id) | (Duel.opponent_praxis_id == praxis.id),
            Duel.status.in_(
                [
                    DuelStatus.pending,
                    DuelStatus.active,
                    DuelStatus.settled,
                    DuelStatus.resolved,
                ]
            ),
        )
    )
    duel_row = duel_result.scalar_one_or_none()
    duel_id: Optional[int] = duel_row.id if duel_row is not None else None

    can_flag = await can_flag_praxis(viewer, praxis, session, era)

    # Same predicate the vote endpoint enforces (#998); anonymous gets True.
    can_vote = await viewer_can_vote(viewer, praxis, session)

    # Same resolver as cards (#1382); detail has no account-mate marker slot.
    viewer_vote: Optional[int] = None
    if viewer is not None:
        own_vote = (
            await viewer_votes_for([praxis.id], viewer.id, viewer.account_id, session)
        ).get(praxis.id)
        viewer_vote = own_vote.value if own_vote is not None else None

    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    created_by_faction_slug = praxis.created_by.faction_slug if praxis.created_by else None
    created_by_avatar_url = (
        praxis.created_by.avatar_url if praxis.created_by else None
    ) or ""

    applied_metatasks: list[TaskOut] = []
    metatask_tasks_result = await session.execute(
        select(Task)
        .join(PraxisMetaTask, PraxisMetaTask.task_id == Task.id)
        .where(PraxisMetaTask.praxis_id == praxis.id)
    )
    metatask_tasks = metatask_tasks_result.scalars().all()
    if metatask_tasks:
        applied_metatasks = [TaskOut.model_validate(t) for t in metatask_tasks]

    return PraxisOut(
        id=praxis.id,
        task_id=praxis.task_id,
        task_title=task_title,
        task_point_value=task_point_value,
        task_level_required=praxis.task.level_required if praxis.task else 0,
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        body_text=praxis.body_text,
        moderation_status=praxis.moderation_status,
        admin_note=praxis.admin_note,
        flagged_at=praxis.flagged_at,
        submitted_at=praxis.submitted_at,
        submit_proposed_at=praxis.submit_proposed_at,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_by_avatar_url=created_by_avatar_url,
        created_by_faction_slug=created_by_faction_slug,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        members=members,
        invites=invites,
        media_items=media_items,
        score=score,
        metatask_points=metatask_points,
        display_multiplier=display_multiplier,
        points_from_votes=points_from_votes,
        habit_bonus_points=habit_bonus_points,
        voter_count=tally.voter_count,
        is_top_for_task=praxis.id in crowned_ids,
        duel_id=duel_id,
        can_flag=can_flag,
        applied_metatasks=applied_metatasks,
        viewer_can_vote=can_vote,
        viewer_vote=viewer_vote,
    )


async def author_contributions_for(
    praxes: list[Praxis],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> dict[int, Contribution]:
    """Scoring breakdown per praxis for its AUTHOR, not the viewer (ADR-0047).

    One ``compute_contributions`` call per distinct author, since it applies a
    single character's faction/level to its whole batch.
    """
    if not praxes:
        return {}

    era_row = await get_current_era_row(session)

    author_ids = {p.created_by_id for p in praxes}
    authors_result = await session.execute(
        select(Character).where(Character.id.in_(author_ids))
    )
    authors_by_id: dict[int, Character] = {c.id: c for c in authors_result.scalars()}

    # Author level gates metatask points.
    levels_result = await session.execute(
        select(CharacterStats.character_id, CharacterStats.level).where(
            CharacterStats.character_id.in_(author_ids),
            CharacterStats.era_id == era_row.id,
        )
    )
    level_by_author: dict[int, int] = {cid: lvl for cid, lvl in levels_result.all()}

    praxes_by_author: dict[int, list[Praxis]] = {}
    for praxis in praxes:
        praxes_by_author.setdefault(praxis.created_by_id, []).append(praxis)

    contributions: dict[int, Contribution] = {}
    for author_id, author_praxes in praxes_by_author.items():
        author = authors_by_id.get(author_id)
        if author is None:
            continue
        contributions.update(
            await compute_contributions(
                author_praxes,
                author,
                era,
                session,
                character_level=level_by_author.get(author_id, 0),
            )
        )
    return contributions


async def applied_metatasks_for(
    praxes: list[Praxis],
    session: AsyncSession,
) -> dict[int, list[TaskOut]]:
    """Applied metatasks as ``TaskOut`` rows per praxis, in one query; absent = none.

    The seal stack needs the rows (issuing faction), not just summed points.
    """
    if not praxes:
        return {}

    praxis_ids = [p.id for p in praxes]
    rows = await session.execute(
        select(PraxisMetaTask.praxis_id, Task)
        .join(Task, PraxisMetaTask.task_id == Task.id)
        .where(PraxisMetaTask.praxis_id.in_(praxis_ids))
    )
    metatasks_by_praxis: dict[int, list[TaskOut]] = {}
    for praxis_id, task in rows.all():
        metatasks_by_praxis.setdefault(praxis_id, []).append(
            TaskOut.model_validate(task)
        )
    return metatasks_by_praxis


async def duel_id_map(
    praxes: list[Praxis],
    session: AsyncSession,
) -> dict[int, int]:
    """Praxis id → duel id for each duel side on the page, in one query.

    Absent = not a duel side.

    A duel side is ``type='solo'``, so cards gate on this, not ``type`` (#992).
    Same statuses as :func:`build_praxis_out`.
    """
    if not praxes:
        return {}

    praxis_ids = {p.id for p in praxes}
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id.in_(praxis_ids))
            | (Duel.opponent_praxis_id.in_(praxis_ids)),
            Duel.status.in_(
                [
                    DuelStatus.pending,
                    DuelStatus.active,
                    DuelStatus.settled,
                    DuelStatus.resolved,
                ]
            ),
        )
    )
    mapping: dict[int, int] = {}
    for duel in duel_result.scalars().all():
        for side_id in (duel.challenger_praxis_id, duel.opponent_praxis_id):
            if side_id in praxis_ids:
                mapping[side_id] = duel.id
    return mapping


@dataclass(frozen=True)
class DuelOpponent:
    """The OTHER side of a duel, as a card names it (#596). Identity only."""

    praxis_id: int
    #: The other side's author (duel sides are solo).
    display_name: str
    #: ``None`` = unaffiliated (ADR-0039).
    faction_slug: Optional[str]
    #: Relative media path, or "" for none (banner shows the monogram).
    avatar_url: str


async def duel_opponents_for(
    praxes: list[Praxis],
    session: AsyncSession,
) -> dict[int, DuelOpponent]:
    """Praxis id → the OTHER side of its duel, for the whole page in one query.

    A duel is two praxes joined by a ``Duel`` row (ADR-0011), so members can't
    name the rival. While ``pending`` the challenger is absent from the map on
    purpose: naming someone who hasn't accepted asserts a contest that may never
    exist. Same statuses as :func:`duel_id_map`.
    """
    if not praxes:
        return {}

    praxis_ids = {p.id for p in praxes}

    challenger_praxis = aliased(Praxis)
    opponent_praxis = aliased(Praxis)
    challenger_author = aliased(Character)
    opponent_author = aliased(Character)

    rows = await session.execute(
        select(
            Duel.challenger_praxis_id,
            Duel.opponent_praxis_id,
            challenger_author.display_name,
            challenger_author.faction_slug,
            challenger_author.avatar_url,
            opponent_author.display_name,
            opponent_author.faction_slug,
            opponent_author.avatar_url,
        )
        .join(challenger_praxis, challenger_praxis.id == Duel.challenger_praxis_id)
        .join(challenger_author, challenger_author.id == challenger_praxis.created_by_id)
        # Outer: no opponent side while pending; an inner join would drop the row.
        .outerjoin(opponent_praxis, opponent_praxis.id == Duel.opponent_praxis_id)
        .outerjoin(opponent_author, opponent_author.id == opponent_praxis.created_by_id)
        .where(
            (Duel.challenger_praxis_id.in_(praxis_ids))
            | (Duel.opponent_praxis_id.in_(praxis_ids)),
            Duel.status.in_(
                [
                    DuelStatus.pending,
                    DuelStatus.active,
                    DuelStatus.settled,
                    DuelStatus.resolved,
                ]
            ),
        )
    )

    opponents: dict[int, DuelOpponent] = {}
    for (
        challenger_praxis_id,
        opponent_praxis_id,
        challenger_name,
        challenger_faction,
        challenger_avatar,
        opponent_name,
        opponent_faction,
        opponent_avatar,
    ) in rows.all():
        if challenger_praxis_id in praxis_ids and opponent_praxis_id is not None:
            opponents[challenger_praxis_id] = DuelOpponent(
                praxis_id=opponent_praxis_id,
                display_name=opponent_name or "",
                faction_slug=opponent_faction,
                avatar_url=opponent_avatar or "",
            )
        if opponent_praxis_id is not None and opponent_praxis_id in praxis_ids:
            opponents[opponent_praxis_id] = DuelOpponent(
                praxis_id=challenger_praxis_id,
                display_name=challenger_name or "",
                faction_slug=challenger_faction,
                avatar_url=challenger_avatar or "",
            )
    return opponents


def _resolve_card_scoring(
    contribution: Optional[Contribution], task_point_value: int, tally_votes_points: int
) -> tuple[int, float, int, int, float]:
    """Resolve the score fields from a Contribution (ADR-0053).

    Returns ``(metatask_points, display_multiplier, points_from_votes,
    habit_bonus_points, score)`` for every praxis type, upholding::

        score = task_point_value × display_multiplier
                + metatask_points + points_from_votes + habit_bonus_points

    ``display_multiplier`` = faction × duel, base only (ADR-0086). A duel side's
    is live and provisional (ADR-0052).
    """
    if contribution is None:
        # Author missing / unscoreable: base + votes at ×1.0.
        return (
            0,
            1.0,
            tally_votes_points,
            0,
            float(task_point_value + tally_votes_points),
        )

    return (
        contribution.metatask_points,
        contribution.faction_multiplier * contribution.duel_multiplier,
        contribution.points_from_votes,
        contribution.habit_bonus_points,
        contribution.total,
    )


async def build_praxis_card_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    viewer: Optional[Character],
    crowned_ids: Optional[set[int]] = None,
    viewer_votes: Optional[dict[int, ViewerVote]] = None,
    author_contributions: Optional[dict[int, Contribution]] = None,
    applied_metatasks: Optional[dict[int, list[TaskOut]]] = None,
    viewer_can_vote: Optional[dict[int, bool]] = None,
    duel_ids: Optional[dict[int, int]] = None,
    duel_opponents: Optional[dict[int, DuelOpponent]] = None,
    tallies: Optional[dict[int, VoteTally]] = None,
) -> PraxisCardOut:
    """Lightweight card for list views; ``score`` is the author's total (ADR-0053).

    Each optional map is a page-wide precompute from :func:`build_praxis_cards`
    (no N+1); when ``None`` the builder computes it for this praxis alone.
    For ``tallies`` and ``viewer_can_vote`` a missing entry means "not in the
    batch" and is recomputed, never read as no votes / may vote (#1974). For
    the others a missing entry means none. ``viewer`` is required, see
    :func:`build_praxis_out`.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0
    task_level_required = praxis.task.level_required if praxis.task else 0
    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    created_by_avatar_url = (
        praxis.created_by.avatar_url if praxis.created_by else None
    ) or ""

    viewer_vote_info = viewer_votes.get(praxis.id) if viewer_votes else None

    # Membership, not truthiness: a zero-vote praxis is in the map (#1378).
    tally = tallies.get(praxis.id) if tallies is not None else None
    if tally is None:
        tally = get_tally(await tally_votes([praxis.id], session), praxis.id)

    contribution = author_contributions.get(praxis.id) if author_contributions else None
    if contribution is None:
        contribution = (
            await author_contributions_for([praxis], session, era)
        ).get(praxis.id)
    (
        metatask_points,
        display_multiplier,
        points_from_votes,
        habit_bonus_points,
        score,
    ) = _resolve_card_scoring(contribution, task_point_value, tally.points_from_votes)

    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    if applied_metatasks is not None:
        praxis_metatasks = applied_metatasks.get(praxis.id, [])
    else:
        praxis_metatasks = (await applied_metatasks_for([praxis], session)).get(
            praxis.id, []
        )

    if duel_ids is not None:
        praxis_duel_id = duel_ids.get(praxis.id)
    else:
        praxis_duel_id = (await duel_id_map([praxis], session)).get(praxis.id)

    if duel_opponents is not None:
        opponent = duel_opponents.get(praxis.id)
    else:
        opponent = (await duel_opponents_for([praxis], session)).get(praxis.id)

    # Missing entry is NOT "yes" (#1974): a permission must not fail open.
    can_vote = viewer_can_vote.get(praxis.id) if viewer_can_vote else None
    if can_vote is None:
        can_vote = (await viewer_can_vote_map([praxis], viewer, session)).get(
            praxis.id, False
        )

    return PraxisCardOut(
        id=praxis.id,
        task_id=praxis.task_id,
        task_title=task_title,
        task_point_value=task_point_value,
        task_level_required=task_level_required,
        type=praxis.type,
        status=praxis.status,
        title=praxis.title,
        moderation_status=praxis.moderation_status,
        created_by_id=praxis.created_by_id,
        created_by_display_name=created_by_display_name,
        created_by_avatar_url=created_by_avatar_url,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        submitted_at=praxis.submitted_at,
        submit_proposed_at=praxis.submit_proposed_at,
        member_count=len(praxis.members),
        score=score,
        metatask_points=metatask_points,
        display_multiplier=display_multiplier,
        points_from_votes=points_from_votes,
        habit_bonus_points=habit_bonus_points,
        voter_count=tally.voter_count,
        is_top_for_task=praxis.id in crowned_ids,
        applied_metatasks=praxis_metatasks,
        task_faction_slug=praxis.task.primary_faction_slug if praxis.task else None,
        body_text=praxis.body_text,
        created_by_faction_slug=praxis.created_by.faction_slug if praxis.created_by else None,
        members=[_build_member_out(m) for m in praxis.members],
        media_items=[MediaItemOut.model_validate(item) for item in praxis.media_items],
        viewer_vote=viewer_vote_info.value if viewer_vote_info else None,
        voted_by_name=viewer_vote_info.voted_by_name if viewer_vote_info else None,
        viewer_can_vote=can_vote,
        duel_id=praxis_duel_id,
        opponent_praxis_id=opponent.praxis_id if opponent else None,
        opponent_display_name=opponent.display_name if opponent else None,
        opponent_faction_slug=opponent.faction_slug if opponent else None,
        opponent_avatar_url=opponent.avatar_url if opponent else "",
    )


async def build_praxis_cards(
    praxes: list[Praxis],
    session: AsyncSession,
    viewer: Optional[Character],
) -> list[PraxisCardOut]:
    """Enrich a page of praxes into cards with a constant number of page-wide queries.

    Every lookup is per page, never per card; ``test_praxis_list_query_count.py``
    guards it. Shared by ``/praxes`` and the rail (#1344).
    """
    crowned = await crowned_praxis_ids({praxis.task_id for praxis in praxes}, session)
    # Account-scoped: own star and account-mate "voted by" from one fetch.
    viewer_votes = (
        await viewer_votes_for(
            {praxis.id for praxis in praxes}, viewer.id, viewer.account_id, session
        )
        if viewer
        else {}
    )
    author_contributions = await author_contributions_for(praxes, session)
    applied_metatasks = await applied_metatasks_for(praxes, session)
    viewer_can_vote = await viewer_can_vote_map(praxes, viewer, session)
    duel_ids = await duel_id_map(praxes, session)
    duel_opponents = await duel_opponents_for(praxes, session)
    tallies = await tally_votes([praxis.id for praxis in praxes], session)
    return [
        await build_praxis_card_out(
            praxis,
            session,
            viewer=viewer,
            crowned_ids=crowned,
            viewer_votes=viewer_votes,
            author_contributions=author_contributions,
            applied_metatasks=applied_metatasks,
            viewer_can_vote=viewer_can_vote,
            duel_ids=duel_ids,
            duel_opponents=duel_opponents,
            tallies=tallies,
        )
        for praxis in praxes
    ]
