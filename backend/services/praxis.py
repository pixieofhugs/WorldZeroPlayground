"""Canonical praxis service.

Handles all three praxis types: solo, collab, and duel.
Replaces the old services/submission.py and services/collaboration.py.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, exists, func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.flag import Flag, FlagReason, stored_flag_reason
from models.meta_task import PraxisMetaTask
from models.praxis import (
    MediaItem,
    ModerationStatus,
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.era import Era
from models.character_stats import CharacterStats
from models.task import Task, TaskStatus, TaskType
from models.vote import Vote
from schemas.task import TaskOut
from schemas.praxis import (
    MediaItemOut,
    PraxisCardOut,
    PraxisInviteOut,
    PraxisMemberOut,
    PraxisOut,
    PraxisUpdate,
)
from services import collab_consensus
from services.character_stats import recalculate_character_stats
from services.praxis_scoring import Contribution, compute_contributions
from services.faction_service import faction_permits
from services.meta_task import metatask_cap_for_level
from services.era import get_current_era_row, get_or_create_stats
from services.level_jump import available_level_reach, consume_level_jump
from models.duel import Duel, DuelStatus
from services.vote_tally import crowned_praxis_ids, get_tally, tally_votes, ViewerVote


EVERYMEN_FACTION_SLUG = "everymen"
ALBESCENT_FACTION_SLUG = "albescent"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def cancel_pending_publish_on_edit(
    praxis: Praxis, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> None:
    """Backwards-compatible alias for :func:`collab_consensus.on_member_edit`.

    Kept so the media/edit routes keep their existing import; the ADR-0012 window
    logic now lives in ``services.collab_consensus`` (#331).
    """
    await collab_consensus.on_member_edit(praxis, session, era)


def _require_member(praxis: Praxis, character_id: int, action: str) -> None:
    """403 unless ``character_id`` is a member of ``praxis`` (ADR-0013 co-ownership).

    A collab is co-owned by every member; solo/duel praxes have exactly one
    member (the creator), so this is equivalent to creator-only for those types.
    """
    if character_id not in {m.character_id for m in praxis.members}:
        raise HTTPException(status_code=403, detail=f"Only a member can {action} this praxis.")


def _build_member_out(member: PraxisMember) -> PraxisMemberOut:
    return PraxisMemberOut(
        id=member.id,
        praxis_id=member.praxis_id,
        character_id=member.character_id,
        character_display_name=member.character.display_name,
        has_submitted=member.has_submitted,
        joined_at=member.joined_at,
    )


def _build_invite_out(invite: PraxisInvite) -> PraxisInviteOut:
    return PraxisInviteOut(
        id=invite.id,
        praxis_id=invite.praxis_id,
        inviter_id=invite.inviter_id,
        invitee_id=invite.invitee_id,
        inviter_display_name=invite.inviter.display_name,
        invitee_display_name=invite.invitee.display_name,
        status=invite.status,
        created_at=invite.created_at,
    )


async def _count_in_progress_praxes(character_id: int, session: AsyncSession) -> int:
    """Count in-progress praxis memberships for bank capacity enforcement."""
    result = await session.execute(
        select(func.count())
        .select_from(PraxisMember)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            # pending = a collab mid-consensus; still an open, slot-consuming
            # membership for bank-cap purposes (#590).
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
    )
    return result.scalar_one()


async def recalculate_members_stats(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    era_row: Optional[Era] = None,
) -> None:
    """Recalculate stats for every member of ``praxis``, then flush (#492).

    Lifts the per-member recalc loop copy-pasted across ``submit_praxis``,
    ``unsubmit_praxis``, ``apply_metatask``, and ``remove_metatask``. Callers
    that already hold an ``era_row`` (e.g. a duel-forfeit recalc that reuses it)
    pass it in to avoid a re-fetch. ``leave_praxis`` deliberately does NOT use
    this — it recalcs only the single leaver, not all members.
    """
    if era_row is None:
        era_row = await get_current_era_row(session)
    for member in praxis.members:
        await recalculate_character_stats(
            member.character_id, session, era, era_row=era_row
        )
    await session.flush()


# ---------------------------------------------------------------------------
# Build output objects
# ---------------------------------------------------------------------------


async def build_praxis_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    viewer: Optional[Character] = None,
    *,
    crowned_ids: Optional[set[int]] = None,
) -> PraxisOut:
    """Build a PraxisOut for any praxis type.

    ``viewer`` is the authenticated viewer's character, used to compute
    viewer-relative flags such as ``can_flag`` and invite visibility.

    ``crowned_ids`` are the Task Crown holders (ADR-0028); list routes
    precompute them once via :func:`~services.vote_tally.crowned_praxis_ids`
    to avoid an N+1, single-praxis routes leave the default.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0

    members = [_build_member_out(m) for m in praxis.members]

    # Invites only visible to members
    effective_viewer_id = viewer.id if viewer is not None else None
    member_ids = {m.character_id for m in praxis.members}
    include_invites = effective_viewer_id in member_ids if effective_viewer_id else False
    invites = [_build_invite_out(i) for i in praxis.invites] if include_invites else []

    media_items = [MediaItemOut.model_validate(item) for item in praxis.media_items]

    # The score is the computed total, author-scoped (ADR-0053) — the same
    # number and the same resolver the card uses, so detail and card cannot
    # disagree. This is a single-praxis route, so the extra scoring queries are
    # acceptable; list routes precompute via ``author_contributions_for``.
    tally_map = await tally_votes([praxis.id], session)
    tally = get_tally(tally_map, praxis.id)
    contribution = (await author_contributions_for([praxis], session, era)).get(praxis.id)
    (
        metatask_points,
        display_multiplier,
        points_from_votes,
        score,
    ) = _resolve_card_scoring(contribution, task_point_value, tally.points_from_votes)

    # Look up the Duel row if this praxis is a duel side (ADR-0011). `resolved`
    # is included so a card keeps its duel link after the era froze the outcome
    # (ADR-0052) — otherwise a past duel's praxis reads back as a plain solo.
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

    # Task Crown (ADR-0028): top submitted praxis for this task, computed live.
    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    created_by_faction_slug = praxis.created_by.faction_slug if praxis.created_by else None

    # Query applied metatasks
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
        voter_count=tally.voter_count,
        is_top_for_task=praxis.id in crowned_ids,
        duel_id=duel_id,
        can_flag=can_flag,
        applied_metatasks=applied_metatasks,
    )


async def author_contributions_for(
    praxes: list[Praxis],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> dict[int, Contribution]:
    """Scoring breakdown for each praxis, computed for its AUTHOR (ADR-0047).

    The card's score stamp shows the points the praxis banked for whoever made
    it, so the scoring subject is ``praxis.created_by`` — not the viewer. This
    differs from ``compute_contributions``'s usual per-viewer use (ADR-0014).

    Praxes are grouped by author so a feed makes O(distinct authors) scoring
    passes, not O(praxes) — ``compute_contributions`` applies a single
    character's faction/level to the whole batch it is handed, so one call per
    author is required. List routes precompute this once and hand it to
    :func:`build_praxis_card_out` via ``author_contributions``.
    """
    if not praxes:
        return {}

    era_row = await get_current_era_row(session)

    author_ids = {p.created_by_id for p in praxes}
    authors_result = await session.execute(
        select(Character).where(Character.id.in_(author_ids))
    )
    authors_by_id: dict[int, Character] = {c.id: c for c in authors_result.scalars()}

    # Author level gates metatask points (compute_contributions passes it through
    # to get_meta_task_points_bulk). One bulk fetch, not one per author.
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
    """Applied metatasks (as ``TaskOut`` rows) for each praxis, in ONE query.

    The feed card's seal stack dispatches on each metatask's issuing faction, so
    it needs the ``TaskOut`` rows, not just the summed ``metatask_points``. List
    routes build cards in a per-praxis comprehension, so a per-card metatask
    query would be an N+1 across the page; this batches every praxis id on the
    page into a single join and hands the result to
    :func:`build_praxis_card_out` via ``applied_metatasks``.

    Praxis ids with no applied metatask are simply absent from the returned map
    (the card builder treats a missing entry as an empty stack).
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


def _resolve_card_scoring(
    contribution: Optional[Contribution], task_point_value: int, tally_votes_points: int
) -> tuple[int, float, int, float]:
    """Resolve the score fields from a Contribution (ADR-0053).

    Returns ``(metatask_points, display_multiplier, points_from_votes, score)``.
    ``display_multiplier`` is faction × duel collapsed into one value, and
    ``score`` is the contribution's own total — for EVERY praxis type. There is
    no collab carve-out: a collab praxis has exactly one author, so it has
    exactly one faction and one multiplier (ADR-0053 supersedes ADR-0047, whose
    collab branch contradicted its own author-scoping principle).

    The invariant the payload upholds, with no exception::

        score = (task_point_value + metatask_points) × display_multiplier
                + points_from_votes

    A duel side's multiplier is LIVE and PROVISIONAL — it moves when the
    opponent is voted, and a currently-behind Snide side reads ×0.0 (ADR-0052).
    """
    if contribution is None:
        # Defensive fallback (author missing / unscoreable): base + votes at ×1.0.
        return (
            0,
            1.0,
            tally_votes_points,
            float(task_point_value + tally_votes_points),
        )

    return (
        contribution.metatask_points,
        contribution.faction_multiplier * contribution.duel_multiplier,
        contribution.points_from_votes,
        contribution.total,
    )


async def build_praxis_card_out(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    crowned_ids: Optional[set[int]] = None,
    viewer_votes: Optional[dict[int, ViewerVote]] = None,
    author_contributions: Optional[dict[int, Contribution]] = None,
    applied_metatasks: Optional[dict[int, list[TaskOut]]] = None,
) -> PraxisCardOut:
    """Lightweight card for list views.

    ``score`` is the computed total (ADR-0053), not Merit: the points the praxis
    banked for its AUTHOR, multipliers and metatask points included. The score
    stamp reads it alongside the breakdown terms
    (``metatask_points``/``display_multiplier``/``points_from_votes``) and the
    base it already carries as ``task_point_value``.

    ``crowned_ids`` are the Task Crown holders (ADR-0028); list routes
    precompute them once via :func:`~services.vote_tally.crowned_praxis_ids`
    so the crown never becomes a per-card query.

    ``viewer_votes`` maps praxis id → the viewer account's :class:`ViewerVote`
    (#573, #644); list routes precompute it once via
    :func:`~services.vote_tally.viewer_votes_for` so neither the viewer's own-star
    highlight nor the account-mate marker becomes a per-card query. ``None``
    (anonymous viewer) leaves both ``viewer_vote`` and ``voted_by_name`` unset.

    ``author_contributions`` maps praxis id → the author's :class:`Contribution`;
    list routes precompute it once via :func:`author_contributions_for` so the
    score breakdown is not re-derived per card. When absent, this builder scores
    the single praxis itself (single-card callers).

    ``applied_metatasks`` maps praxis id → the metatasks pinned to it (as
    ``TaskOut`` rows) for the read-only seal stack; list routes precompute it
    once via :func:`applied_metatasks_for` so the seal never becomes a per-card
    query (N+1). When absent, this builder loads the single praxis's metatasks
    itself (single-card callers). A missing entry means no metatasks applied.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0
    task_level_required = praxis.task.level_required if praxis.task else 0
    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    # The author's portrait for the card byline (#888). ``created_by`` is already
    # loaded on every path into this builder (it is what feeds the display name),
    # so this costs no additional query.
    created_by_avatar_url = (
        praxis.created_by.avatar_url if praxis.created_by else None
    ) or ""

    viewer_vote_info = viewer_votes.get(praxis.id) if viewer_votes else None

    tally_map = await tally_votes([praxis.id], session)
    tally = get_tally(tally_map, praxis.id)

    # Score (ADR-0053), computed for the AUTHOR. Reuse the precomputed map when
    # the list route supplies it; otherwise score this praxis alone.
    contribution = author_contributions.get(praxis.id) if author_contributions else None
    if contribution is None:
        contribution = (
            await author_contributions_for([praxis], session, era)
        ).get(praxis.id)
    (
        metatask_points,
        display_multiplier,
        points_from_votes,
        score,
    ) = _resolve_card_scoring(contribution, task_point_value, tally.points_from_votes)

    # Task Crown (ADR-0028): top submitted praxis for this task, computed live.
    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    # Applied metatasks for the seal stack. Reuse the precomputed page-wide map
    # when the list route supplies it; otherwise load this praxis's own.
    if applied_metatasks is not None:
        praxis_metatasks = applied_metatasks.get(praxis.id, [])
    else:
        praxis_metatasks = (await applied_metatasks_for([praxis], session)).get(
            praxis.id, []
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
    )


# ---------------------------------------------------------------------------
# CRUD — praxis lifecycle
# ---------------------------------------------------------------------------


async def get_praxis(
    praxis_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> Praxis:
    """Get a praxis by id with detail-view relationships eager-loaded.

    Loads ``invites`` and ``media_items`` (in addition to the always-loaded
    ``task``/``created_by``/``members``) because every service consumer of
    this helper ultimately feeds a ``build_praxis_out`` caller. The list
    endpoint uses :func:`list_praxes` which loads only what the card needs.

    INVARIANT: must eagerly load every Praxis relationship with
    ``cascade='all, delete-orphan'`` — currently just ``invites`` — because
    :func:`delete_praxis` does ``session.delete(praxis)`` which needs those
    collections loaded in the session for the cascade to fire. The other
    relationships are ``lazy='raise'`` (see ``models/praxis.py``); dropping a
    ``selectinload`` here silently breaks delete.
    """
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.id == praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis not found.")
    await collab_consensus.settle_if_window_lapsed(praxis, session, era)
    return praxis


# Statuses in which a duel is still live and its outcome incomplete: the
# opponent has not yet committed a competing side (ADR-0011). While a duel sits
# in one of these, a *submitted* side is author-only — revealing it early would
# let the opponent crib the other body, or leak a private draft to spectators
# (#999). Every terminal-ish state reveals: ``settled``/``resolved`` (both cast),
# ``declined`` (no second party to protect), and forfeit (which keeps the duel
# ``settled``) all fall outside this tuple.
_LIVE_INCOMPLETE_DUEL_STATUSES = (DuelStatus.pending, DuelStatus.active)


def _duel_side_hidden_condition(viewer_id: Optional[int]):
    """SQL predicate — TRUE when the correlated ``Praxis`` row must be HIDDEN
    because it is a side of a live, incomplete duel and ``viewer_id`` is not its
    author (#999).

    This is the single source of truth shared by BOTH visibility doors — the
    ``/praxes/{id}`` detail gate (:func:`can_view_praxis`) and the feed/list
    predicate (:func:`praxis_visibility_condition`). Keeping one helper means the
    detail door and the feed predicate can never drift and leave the leak open on
    one path while the other is patched. A submitted duel side is world-public
    only once the duel seals (both cast) or otherwise terminates; until then only
    its author may see it.
    """
    is_live_incomplete_side = exists(
        select(Duel.id).where(
            or_(
                Duel.challenger_praxis_id == Praxis.id,
                Duel.opponent_praxis_id == Praxis.id,
            ),
            Duel.status.in_(_LIVE_INCOMPLETE_DUEL_STATUSES),
        )
    )
    if viewer_id is None:
        # Anonymous / no character: never the author, so always hidden.
        return is_live_incomplete_side
    return and_(is_live_incomplete_side, Praxis.created_by_id != viewer_id)


def praxis_visibility_condition(viewer_id: Optional[int]):
    """SQL predicate for who may see a praxis (ADR-0024).

    ``submitted`` praxes are public; an ``in_progress`` praxis is visible only to
    its members (character-scoped, matching ``_require_member``). Push this into
    the query so pagination stays honest instead of post-filtering a page.

    Exception (#999): a ``submitted`` side of a live, incomplete duel stays
    author-only until the duel seals — see :func:`_duel_side_hidden_condition`,
    the same guard :func:`can_view_praxis` runs so the two doors can't drift.
    """
    visible = Praxis.status == PraxisStatus.submitted
    if viewer_id is not None:
        member_praxis_ids = select(PraxisMember.praxis_id).where(
            PraxisMember.character_id == viewer_id
        )
        visible = or_(visible, Praxis.id.in_(member_praxis_ids))
    return and_(visible, not_(_duel_side_hidden_condition(viewer_id)))


class PraxisSort(str, Enum):
    """Feed orderings for the ``status=submitted`` praxis feed (#658).

    Both sort on ``Praxis.submitted_at`` — when the praxis was *filed* — not
    ``created_at``, which is merely when the draft was started (i.e. when the
    author signed up for the task). A praxis begun three weeks ago and filed
    this morning is news, and belongs at the top of ``newest``.
    """

    newest = "newest"
    oldest = "oldest"


class VotedFilter(str, Enum):
    """Account-scoped vote filter for the submitted feed (#644 §6).

    ``yes`` — any character on the viewer's account has voted the praxis.
    ``no`` — *needs my vote*: votable **and** unvoted. That is: no vote from the
    viewer's account, **and** the viewer's account does not co-own the praxis.
    Co-owned praxes can never be voted (ADR-0013 account-scoped anti-self-vote,
    mirrored from :func:`services.vote.cast_or_update_vote`), so a literal
    "unvoted" would park them in the work queue forever — hence the extra
    exclusion. ``yes`` and ``no`` are deliberately **not** complements: the
    viewer's own praxes are in neither.
    """

    yes = "yes"
    no = "no"


async def list_praxes(
    session: AsyncSession,
    *,
    task_id: Optional[int] = None,
    character_id: Optional[int] = None,
    member_id: Optional[int] = None,
    praxis_type: Optional[PraxisType] = None,
    status: Optional[PraxisStatus] = None,
    moderation_status: Optional[str] = None,
    faction: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[PraxisSort] = None,
    voted: Optional[VotedFilter] = None,
    viewer_id: Optional[int] = None,
    viewer_account_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    era: EraConfig = CURRENT_ERA,
) -> list[Praxis]:
    """List praxes with optional filters.

    ``in_progress`` praxes are member-only (ADR-0024): pass ``viewer_id`` to
    include the viewer's own drafts; everyone else sees only ``submitted``.

    ``character_id`` filters by authorship (``created_by_id``); ``member_id``
    filters by *membership* (``PraxisMember``), mirroring
    :func:`_count_in_progress_praxes` so a membership-based list (the sidebar's
    in-progress tasks) can never disagree with the slot count.

    ``search`` is a free-text ``ilike`` over the praxis title, its body, the
    linked task's title, and **any member's** handle / display name. The player
    axis (#681) reverses #658's deliberate exclusion of the author: the
    maintainer chose one box that finds content OR a person, accepting that a
    common word can surface every praxis by anyone whose name contains it.
    It matches *members* rather than the author so a collab surfaces for each
    participant; a duel is two praxis rows of one member each, so each side
    already surfaces for its own duelist. A leading ``@`` is a sigil and is
    dropped for the player axis only, matching the character search (#624).

    ``sort`` only applies to the ``status=submitted`` feed and is ignored
    otherwise; every caller that passes no ``sort`` keeps ``created_at DESC``.

    ``voted`` (needs ``viewer_account_id``) is the account-scoped vote filter
    (#644 §6): ``yes`` = my account has voted this praxis; ``no`` = *needs my
    vote* (unvoted by my account **and** not co-owned by my account). See
    :class:`VotedFilter`. Ignored for anonymous viewers (no account).
    """
    query = select(Praxis).where(praxis_visibility_condition(viewer_id))

    # Unconditional: both the faction filter and the ``search`` task-title match
    # need it, and joining once keeps ``?faction=x&q=y`` from double-joining.
    query = query.join(Task, Praxis.task_id == Task.id)

    if faction is not None:
        # Praxis has no faction of its own; it inherits the linked task's faction.
        query = query.where(Task.primary_faction_slug == faction)

    if search:
        term = search.strip()
        if term:
            conditions = [
                Praxis.title.ilike(f"%{term}%"),
                Praxis.body_text.ilike(f"%{term}%"),
                Task.title.ilike(f"%{term}%"),
            ]
            # Player axis (#681): match ANY member, not just the author. Every
            # praxis has PraxisMember rows (solo/duel exactly one — the creator,
            # per _require_member), so one condition covers all three types.
            # `IN (subquery)` rather than a join: a collab with two matching
            # members must still yield exactly one feed row.
            player_term = term.lstrip("@")
            if player_term:
                conditions.append(
                    Praxis.id.in_(
                        select(PraxisMember.praxis_id)
                        .join(Character, Character.id == PraxisMember.character_id)
                        .where(
                            or_(
                                Character.username.ilike(f"%{player_term}%"),
                                Character.display_name.ilike(f"%{player_term}%"),
                            )
                        )
                    )
                )
            query = query.where(or_(*conditions))

    if praxis_type is not None:
        query = query.where(Praxis.type == praxis_type)

    if voted is not None and viewer_account_id is not None:
        # Account-scoped (#644 §6): a vote from ANY character on the viewer's
        # account counts, matching the account-level anti-self-vote posture.
        account_voted = (
            select(Vote.id)
            .where(
                Vote.praxis_id == Praxis.id,
                Vote.voter_account_id == viewer_account_id,
            )
            .exists()
        )
        if voted == VotedFilter.yes:
            query = query.where(account_voted)
        else:
            # "needs my vote" = votable AND unvoted. Exclude praxes the account
            # co-owns: they can never be voted (ADR-0013 — same account-member
            # set cast_or_update_vote blocks on), so they must not park here
            # forever. Mirrors that anti-self-vote rule as a NOT EXISTS in SQL.
            account_member = (
                select(PraxisMember.id)
                .join(Character, Character.id == PraxisMember.character_id)
                .where(
                    PraxisMember.praxis_id == Praxis.id,
                    Character.account_id == viewer_account_id,
                )
                .exists()
            )
            query = query.where(~account_voted, ~account_member)

    if moderation_status is not None:
        try:
            mod_enum = ModerationStatus(moderation_status)
            query = query.where(Praxis.moderation_status == mod_enum)
        except ValueError:
            pass
    else:
        query = query.where(Praxis.moderation_status != ModerationStatus.hidden)

    if task_id is not None:
        query = query.where(Praxis.task_id == task_id)

    if character_id is not None:
        if status == PraxisStatus.in_progress:
            # ADR-0013: in-progress praxes are co-owned; surface any member's
            # active draft, not just the creator's (bank cap already counts
            # memberships — see _count_in_progress_praxes). Published/authored
            # lists keep creator semantics below.
            query = query.where(
                Praxis.id.in_(
                    select(PraxisMember.praxis_id).where(
                        PraxisMember.character_id == character_id
                    )
                )
            )
        else:
            query = query.where(Praxis.created_by_id == character_id)

    if member_id is not None:
        # Membership filter: any praxis the character holds a PraxisMember row
        # on, regardless of who created it (accepted collab invites included).
        query = query.where(
            Praxis.id.in_(
                select(PraxisMember.praxis_id).where(
                    PraxisMember.character_id == member_id
                )
            )
        )

    if status is not None:
        query = query.where(Praxis.status == status)

    if status == PraxisStatus.submitted:
        # Invariant, established by collab_consensus._apply_seal — the single
        # writer of submitted_at, on the only path to status=submitted:
        # status == submitted ⟹ submitted_at IS NOT NULL. A submitted praxis
        # with no seal time is corrupt, so it is not shown. Scoped to this
        # branch on purpose: in-progress praxes have a NULL submitted_at *by
        # definition*, and a blanket filter would empty the sidebar.
        query = query.where(Praxis.submitted_at.isnot(None))
        # That invariant is also what lets the sort below be a plain ORDER BY
        # with no coalesce and no NULLS-FIRST-on-DESC trap.

    query = query.options(selectinload(Praxis.media_items))
    if sort is not None and status == PraxisStatus.submitted:
        order = (
            Praxis.submitted_at.asc()
            if sort == PraxisSort.oldest
            else Praxis.submitted_at.desc()
        )
    else:
        order = Praxis.created_at.desc()
    query = query.order_by(order).limit(limit).offset(offset)
    result = await session.execute(query)
    praxes = list(result.scalars().all())
    for praxis in praxes:
        await collab_consensus.settle_if_window_lapsed(praxis, session, era)
    return praxes


def meets_task_level(
    character_level: int, task: Task, level_reach: int = 0
) -> bool:
    """Whether ``character_level`` clears the task's own level bar (#292).

    The single home for the **task-level** gate — the "level half" that used to
    be ANDed inline into :func:`is_task_eligible_for_character` and the sign-up
    predicate. A distinct axis from :func:`~services.faction_service.faction_permits`
    (the faction half, #171) and from the era-config thresholds
    (collab/flag/comment/metatask-apply), which each already sit in their own
    purpose-named predicate and share a single ``era.*`` source for their value.

    ``level_reach`` is the faction level-jump allowance (#811): levels above the
    character's own that they may currently reach. It is 0 for everyone without
    the ability and for anyone who has already spent it at this level — see
    :func:`services.level_jump.available_level_reach`, which is the only thing
    that should compute it. Extending the gate here (rather than per mode) is
    what gives the ability identical behaviour across solo signup, collab
    signup, and duel *initiation* (the challenger's own praxis, gated via
    :func:`create_praxis` → :func:`evaluate_signup`).

    Duel *acceptance* (the opponent, via
    :func:`services.duel.respond_to_duel_challenge`) is a deliberate exception:
    it never calls this predicate. The opponent's only level check is the flat
    ``era.duel_level_required`` floor — reaching above your own level is the
    point of a duel. See ADR-0051.
    """
    return character_level + level_reach >= task.level_required


class SignupDenialReason(str, Enum):
    """Why the type-agnostic sign-up gates reject a claim (ADR-0008)."""

    below_level = "below_level"
    task_status_closed = "task_status_closed"
    already_active_member = "already_active_member"
    bank_full = "bank_full"
    is_metatask = "is_metatask"


@dataclass(frozen=True)
class SignupEligibility:
    """Result of :func:`evaluate_signup`. ``reason`` is set iff ``allowed`` is False."""

    allowed: bool
    reason: Optional[SignupDenialReason] = None


async def evaluate_signup(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> SignupEligibility:
    """The single sign-up predicate — true iff ``create_praxis``'s **type-agnostic**
    gates would accept (ADR-0008). Owns the gates every claim shares: the task is
    not a metatask, level, retired/pending faction carve-out, active-member, and
    the task-bank cap. The
    mode-specific gates (duel-via-challenge, collab level) stay in
    :func:`allowed_praxis_modes` and are applied by :func:`_check_create_preconditions`.

    Anonymous viewers are never eligible (``allowed=False``, no ``reason``).
    """
    if character is None:
        return SignupEligibility(allowed=False)

    # Metatasks are stickers applied to a praxis (edit-praxis seal stack), never
    # signup targets — reject before any level/status work (#1001).
    if task.task_type == TaskType.metatask:
        return SignupEligibility(False, SignupDenialReason.is_metatask)

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character.id, era_row.id)

    level_reach = available_level_reach(
        character.faction_slug, stats.level, stats.level_jump_used_at_level, era
    )
    if not meets_task_level(stats.level, task, level_reach):
        return SignupEligibility(False, SignupDenialReason.below_level)

    if task.status == TaskStatus.retired and character.faction_slug not in era.allow_praxis_on_retired_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)
    if task.status == TaskStatus.pending and character.faction_slug not in era.allow_praxis_on_pending_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)

    if await is_active_member_of_task(character, task, session):
        return SignupEligibility(False, SignupDenialReason.already_active_member)

    in_progress_count = await _count_in_progress_praxes(character.id, session)
    if in_progress_count >= era.max_task_signups:
        return SignupEligibility(False, SignupDenialReason.bank_full)

    return SignupEligibility(allowed=True)


def _signup_denial_to_http(
    reason: Optional[SignupDenialReason], task: Task, era: EraConfig
) -> HTTPException:
    """Map a :class:`SignupDenialReason` to the route error it has always raised."""
    if reason == SignupDenialReason.is_metatask:
        return HTTPException(
            status_code=400,
            detail="Metatasks are applied to a praxis, not signed up for.",
        )
    if reason == SignupDenialReason.below_level:
        return HTTPException(
            status_code=403, detail=f"This task requires level {task.level_required}."
        )
    if reason == SignupDenialReason.task_status_closed:
        detail = (
            "This task is retired and is not open for new praxes."
            if task.status == TaskStatus.retired
            else "This task is pending and is not open for new praxes."
        )
        return HTTPException(status_code=403, detail=detail)
    if reason == SignupDenialReason.already_active_member:
        return HTTPException(
            status_code=409, detail="You have already submitted a praxis for this task."
        )
    # bank_full (and the anonymous/None fallback, which create_praxis never hits).
    return HTTPException(
        status_code=400,
        detail=f"Task bank is full ({era.max_task_signups} in-progress praxes). Complete or withdraw one first.",
    )


async def _check_create_preconditions(
    task_id: int,
    praxis_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig,
) -> Task:
    """Raise HTTPException unless this character may create ``praxis_type`` for ``task_id``."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    # Type-agnostic gates: level, retired/pending, active-member, bank cap — one
    # predicate, so the can_submit_praxis flag can't drift from enforcement.
    eligibility = await evaluate_signup(character, task, session, era)
    if not eligibility.allowed:
        raise _signup_denial_to_http(eligibility.reason, task, era)

    # Mode-specific gates stay here (single-sourced via allowed_praxis_modes).
    if praxis_type == PraxisType.duel:
        raise HTTPException(
            status_code=400,
            detail="Duels are issued via the challenge endpoint, not direct praxis creation (ADR-0011).",
        )

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)
    allowed = allowed_praxis_modes(character, stats.level, era)
    if praxis_type not in allowed:
        _denial: dict[PraxisType, str] = {
            PraxisType.collab: f"Collaborations require level {era.collaboration_level_required}.",
        }
        raise HTTPException(
            status_code=403,
            detail=_denial.get(praxis_type, "Praxis mode not available."),
        )

    return task


async def create_praxis(
    task_id: int,
    praxis_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    title: Optional[str] = None,
    body_text: Optional[str] = None,
) -> Praxis:
    """Create a new praxis + praxis_member for the creator.

    Enforces:
    - Task must exist and be active
    - Character level meets task.level_required
    - Bank cap: era.max_task_signups = max concurrent in_progress praxes per character
    - Duel/collab type requires minimum level
    - Spends the faction level-jump allowance if the claim needed it (#811)
    """
    task = await _check_create_preconditions(
        task_id, praxis_type, character_id, session, era
    )

    # #811: the preconditions above already allowed this claim, so if the task
    # still sits above the character's level the only thing that let them in was
    # the level jump — stamp it spent. Deliberately never refunded: withdrawing
    # or deleting the praxis does not give it back, or it could be farmed by
    # claiming and backing out.
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)
    if task.level_required > stats.level:
        consume_level_jump(stats)
        await session.flush()

    praxis = Praxis(
        task_id=task_id,
        type=praxis_type,
        status=PraxisStatus.in_progress,
        title=title,
        body_text=body_text or "",
        moderation_status=ModerationStatus.visible,
        created_by_id=character_id,
    )
    session.add(praxis)
    await session.flush()

    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)
    await session.flush()
    # Reload with detail-view options so ``build_praxis_out`` can read invites
    # and media_items without tripping lazy='raise'.
    return await get_praxis(praxis.id, session)


async def update_praxis(
    praxis_id: int,
    data: PraxisUpdate,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Update title/body_text. Any member may edit (ADR-0013).

    On a collab, an edit cancels any pending-publish window and un-submits everyone
    (ADR-0012 hard reset).
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "edit")
    if data.title is not None:
        praxis.title = data.title
    if data.body_text is not None:
        praxis.body_text = data.body_text
    await session.flush()
    await cancel_pending_publish_on_edit(praxis, session, era)
    # Re-fetch rather than session.refresh(praxis): refresh expires the
    # lazy='raise' relationships and breaks the subsequent build_praxis_out.
    return await get_praxis(praxis_id, session)


async def unsubmit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Unsubmit a praxis back to editing. Any member may act (ADR-0013). #590.

    Three cases by status:
    - ``submitted``: the whole group reopens. Votes are preserved but stop scoring
      until resubmitted; every member's ``has_submitted`` clears. Unsubmitting a
      *settled* duel side forfeits the contest permanently (ADR-0011 §Forfeit):
      the opponent wins by default and the duel stays ``settled``.
    - ``pending`` (a collab mid-consensus) where the caller has already submitted:
      only the caller's part is pulled back (``on_member_unsubmit``); other members'
      submissions stand. Pending praxes are unscored — no stat recalc.
    - anything else (a fresh ``in_progress`` praxis, or ``pending`` where the caller
      has not submitted): 422 — nothing of theirs to pull back.
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "reopen")

    # Pending collab: pull back only the caller's own submission.
    if praxis.status == PraxisStatus.pending:
        caller = next(
            (m for m in praxis.members if m.character_id == character_id), None
        )
        if caller is None or not caller.has_submitted:
            raise HTTPException(
                status_code=422, detail="Praxis is already in editing mode."
            )
        await collab_consensus.on_member_unsubmit(praxis, character_id, session, era)
        return await get_praxis(praxis_id, session)

    if praxis.status != PraxisStatus.submitted:
        raise HTTPException(status_code=422, detail="Praxis is already in editing mode.")

    # ADR-0011 §Forfeit (#307): unsubmitting a *settled* duel side forfeits the
    # contest. Mark the forfeit (first one sticks) and recalc the winner below so
    # their guaranteed-win modifier lands immediately.
    from services.duel import get_duel_for_praxis

    duel = await get_duel_for_praxis(praxis_id, session)
    forfeit_winner_character_id: Optional[int] = None
    if duel is not None and duel.status == DuelStatus.settled:
        if duel.forfeited_by_character_id is None:
            duel.forfeited_by_character_id = character_id
        winner_praxis_id = (
            duel.opponent_praxis_id
            if duel.challenger_praxis_id == praxis_id
            else duel.challenger_praxis_id
        )
        if winner_praxis_id is not None:
            winner_praxis = await session.get(Praxis, winner_praxis_id)
            if winner_praxis is not None:
                forfeit_winner_character_id = winner_praxis.created_by_id

    praxis.status = PraxisStatus.in_progress
    praxis.submit_proposed_at = None
    for member in praxis.members:
        member.has_submitted = False
    await session.flush()

    # Recalc *every* member: on a collab, co-authors' scores also counted this
    # praxis while it was submitted, so all of them must drop (the submit paths
    # already recalc all members — this fixes the prior single-actor under-recalc).
    era_row = await get_current_era_row(session)
    await recalculate_members_stats(praxis, session, era, era_row=era_row)
    if forfeit_winner_character_id is not None:
        await recalculate_character_stats(
            forfeit_winner_character_id, session, era, era_row=era_row
        )
        await session.flush()
    return await get_praxis(praxis_id, session)


async def change_praxis_type(
    praxis_id: int,
    new_type: PraxisType,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Flip a praxis between ``solo`` and ``collab`` in place (#321).

    Preserves content, **id**, and media — never delete+recreate. Guards: the
    praxis must be ``in_progress``; the actor must be a member; a duel side
    (it has a live ``Duel`` row) must dissolve the duel first; ``collab``
    requires ``era.collaboration_level_required``. ``duel`` is not a target here
    — a duel is a solo praxis + ``Duel`` row (ADR-0011), issued via the challenge
    endpoint.

    ``collab → solo`` is an intentional **takeover** (grill 2026-07-01): any
    member may do it and becomes the sole owner — ``created_by_id`` is reassigned
    to the actor, every other member and pending invite is dropped, content is
    kept. Trust has stakes.
    """
    if new_type not in (PraxisType.solo, PraxisType.collab):
        raise HTTPException(
            status_code=400, detail="Can only switch between solo and collab."
        )

    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "change the mode of")
    if praxis.status not in (PraxisStatus.in_progress, PraxisStatus.pending):
        raise HTTPException(
            status_code=422, detail="Can only change mode while the praxis is in editing."
        )
    if praxis.type == new_type:
        return praxis

    # A duel side is a solo praxis + Duel row; dissolve the duel before switching.
    from services.duel import get_duel_for_praxis

    if await get_duel_for_praxis(praxis_id, session) is not None:
        raise HTTPException(
            status_code=409, detail="End the duel before changing this praxis's mode."
        )

    if new_type == PraxisType.collab:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character_id, era_row.id)
        if stats.level < era.collaboration_level_required:
            raise HTTPException(
                status_code=403,
                detail=f"Collaborations require level {era.collaboration_level_required}.",
            )
        praxis.type = PraxisType.collab
    else:
        # collab → solo: the actor takes it over as their own solo praxis.
        # A type change is a structural edit — clear any pending-publish window
        # (ADR-0012) while this is still a collab, so a later flip back to collab
        # can't inherit a stale, already-lapsed window and instantly auto-seal.
        await cancel_pending_publish_on_edit(praxis, session, era)
        # Mutate the loaded collections so the delete-orphan cascade fires *and*
        # the returned/serialized praxis reflects the drop (session.delete alone
        # would leave the selectin-cached collections stale).
        praxis.type = PraxisType.solo
        praxis.created_by_id = character_id
        for member in list(praxis.members):
            if member.character_id != character_id:
                praxis.members.remove(member)
        for invite in list(praxis.invites):
            if invite.status == PraxisInviteStatus.pending:
                praxis.invites.remove(invite)

    # in_progress praxes aren't scored, so no stat recalc is needed here.
    await session.flush()
    return await get_praxis(praxis_id, session)


async def delete_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
) -> None:
    """Delete a praxis. Creator only. Must be in_progress."""
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character's praxis.")
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a submitted praxis. Move it to editing first.",
        )
    await session.delete(praxis)
    await session.flush()


async def can_view_praxis(
    viewer: Optional[Character], praxis: Praxis, session: AsyncSession
) -> bool:
    """Whether ``viewer`` may see ``praxis`` (ADR-0024).

    - ``hidden`` (moderation) → never (mirror the existing hidden branch: 404).
    - ``submitted`` → public, EXCEPT a live-incomplete duel side, which is
      author-only until the duel seals (#999).
    - ``in_progress`` → members only (character-scoped, matching ``_require_member``;
      the account-vs-character question in #293 is deliberately not entangled here).

    Async because the duel-seal gate needs a DB lookup. It evaluates the SAME
    :func:`_duel_side_hidden_condition` the feed predicate uses, scoped to this
    one row, so the detail door and the list door can never disagree.
    """
    if praxis.moderation_status == ModerationStatus.hidden:
        return False
    if praxis.status == PraxisStatus.submitted:
        viewer_id = viewer.id if viewer is not None else None
        hidden = await session.scalar(
            select(_duel_side_hidden_condition(viewer_id))
            .select_from(Praxis)
            .where(Praxis.id == praxis.id)
        )
        return not hidden
    if viewer is None:
        return False
    return viewer.id in {member.character_id for member in praxis.members}


async def _praxis_author_account_id(
    praxis: Praxis, session: AsyncSession
) -> Optional[int]:
    """The account that owns ``praxis``'s author (created_by is usually loaded)."""
    author = praxis.created_by
    if author is None and praxis.created_by_id is not None:
        author = await session.get(Character, praxis.created_by_id)
    return author.account_id if author is not None else None


async def _account_already_flagged(
    praxis_id: int, account_id: int, session: AsyncSession
) -> bool:
    """True if any character on ``account_id`` already flagged this praxis (#328 anti-gang).

    Joins ``Flag.flagged_by → Character.account_id`` so no ``flagged_by_account_id``
    column / migration is needed.
    """
    result = await session.execute(
        select(Flag.id)
        .join(Character, Character.id == Flag.flagged_by)
        .where(Flag.praxis_id == praxis_id, Character.account_id == account_id)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def can_flag_praxis(
    viewer: Optional[Character],
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True if ``viewer`` may flag ``praxis``.

    Mirrors the rules enforced in :func:`flag_praxis` so the ``can_flag`` UI flag
    hides the control exactly when the action would 403/409 (#328):
    - Viewer must be authenticated (anonymous viewers cannot flag).
    - Viewer's **account** cannot own the praxis author (account-scoped anti-self-flag).
    - Viewer's **account** must not already have a flag on this praxis (anti-gang).
    - Viewer must be at or above ``era.flag_level_required`` in the current era.
    """
    if viewer is None:
        return False
    author_account_id = await _praxis_author_account_id(praxis, session)
    if author_account_id is not None and author_account_id == viewer.account_id:
        return False
    if await _account_already_flagged(praxis.id, viewer.account_id, session):
        return False
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)
    return stats.level >= era.flag_level_required


def active_member_task_ids_subquery(character_id: int):
    """SQL subquery returning task IDs where ``character_id`` holds an active praxis membership.

    "Active" means the praxis status is ``in_progress`` or ``submitted``.
    Used by the task-list query to exclude tasks the character is already working on,
    and by :func:`is_active_member_of_task` for per-task checks.
    """
    return (
        select(Praxis.task_id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status.in_(
                [PraxisStatus.in_progress, PraxisStatus.pending, PraxisStatus.submitted]
            ),
        )
    )


async def is_active_member_of_task(
    character: Character,
    task: Task,
    session: AsyncSession,
) -> bool:
    """Return True if ``character`` holds an active (in_progress or submitted) praxis membership for ``task``.

    Everymen (Double Dipper perk) always returns False — they may hold multiple memberships per task.
    """
    if character.faction_slug == EVERYMEN_FACTION_SLUG:
        return False
    result = await session.execute(
        select(PraxisMember.id)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character.id,
            Praxis.task_id == task.id,
            Praxis.status.in_(
                [PraxisStatus.in_progress, PraxisStatus.pending, PraxisStatus.submitted]
            ),
        )
    )
    return result.scalar_one_or_none() is not None


async def can_submit_praxis_for_task(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True iff ``create_praxis``'s type-agnostic gates would accept — the
    truthful ``can_submit_praxis`` flag on ``TaskOut`` (ADR-0008).

    Derives from :func:`evaluate_signup`, so it covers every shared gate: level,
    retired/pending faction carve-out, active-member (Everymen Double-Dipper
    exempt), **and the task-bank cap** — the last was previously omitted here,
    which made the sign-up button lie once a character's bank was full.
    """
    return (await evaluate_signup(character, task, session, era)).allowed


def allowed_praxis_modes(
    character: Optional[Character],
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> list[PraxisType]:
    """Return the praxis modes a character may create directly.

    Single source for the mode-by-level gates — enforcement in
    :func:`_check_create_preconditions` and the UI flag on
    :class:`~schemas.task.TaskOut` both derive from this list.

    - Solo: always allowed once a viewer is authenticated.
    - Collab: requires ``character_level >= era.collaboration_level_required``.
    - Duel: issued via the challenge endpoint (ADR-0011), not direct creation.

    Anonymous viewers (``character is None``) receive an empty list so the
    UI can hide the mode picker entirely.
    """
    if character is None:
        return []
    modes: list[PraxisType] = [PraxisType.solo]
    if character_level >= era.collaboration_level_required:
        modes.append(PraxisType.collab)
    return modes


def is_task_eligible_for_character(
    character: Optional[Character],
    task: Task,
    character_level: int,
    level_reach: int = 0,
) -> bool:
    """Return True if ``character`` is eligible to act on ``task``.

    The gate is ``task.level_required`` plus whatever
    :func:`services.faction_service.faction_permits` enforces — presently
    nothing, as metatasks are faction-open. Anonymous viewers are
    never eligible.

    Note this mirrors the metatask scoring gate in
    :func:`services.meta_task.get_meta_task_points`
    (``character_level >= task.level_required``)
    rather than the stricter :func:`apply_metatask` service gate. The flag is
    intended for UI affordances such as "metatasks this character could use
    if they had one" — apply time still runs the full guard.
    """
    if character is None:
        return False
    # Two named single-purpose gates, no bundled inline checks (#171, #292).
    # ``level_reach`` (#811) is threaded through so the "eligible" affordance
    # matches what evaluate_signup would actually allow.
    if not meets_task_level(character_level, task, level_reach):
        return False
    if not faction_permits(character, task):
        return False
    return True


async def flag_praxis(
    praxis_id: int,
    flagged_by: Character,
    reason: FlagReason,
    session: AsyncSession,
    reason_detail: Optional[str] = None,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Flag a praxis for moderation review. Requires ``era.flag_level_required`` or above."""
    praxis = await get_praxis(praxis_id, session)

    # Account-scoped anti-self-flag (#328): no account can flag its own work
    # across lives — mirror the account-level anti-self-vote shape. Own message
    # so the caller sees a clearer reason than a generic level failure.
    author_account_id = await _praxis_author_account_id(praxis, session)
    if author_account_id is not None and author_account_id == flagged_by.account_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own praxis.")

    # Account-scoped uniqueness (#328): one flag per account per praxis — a second
    # life can't stack a second flag to gang up on a third-party praxis.
    if await _account_already_flagged(praxis.id, flagged_by.account_id, session):
        raise HTTPException(
            status_code=409, detail="Your account has already flagged this praxis."
        )

    if not await can_flag_praxis(flagged_by, praxis, session, era):
        raise HTTPException(
            status_code=403,
            detail=f"Must be level {era.flag_level_required} or above to flag a praxis.",
        )

    praxis.moderation_status = ModerationStatus.flagged
    praxis.flagged_at = datetime.now(timezone.utc)

    flag = Flag(
        praxis_id=praxis.id,
        flagged_by=flagged_by.id,
        reason=stored_flag_reason(reason, reason_detail),
    )
    session.add(flag)
    await session.flush()
    return await get_praxis(praxis_id, session)


# ---------------------------------------------------------------------------
# Collaboration specific operations (duels use services/duel.py — ADR-0011)
# ---------------------------------------------------------------------------


async def invite_to_praxis(
    praxis_id: int,
    invitee_id: int,
    inviter_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Create a collab invite. Praxis must be collab type. Inviter must be a member."""
    praxis = await get_praxis(praxis_id, session)

    if praxis.type != PraxisType.collab:
        raise HTTPException(
            status_code=400,
            detail="Invites are only for collab praxes. Duels use the challenge endpoint.",
        )
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(status_code=400, detail="Cannot invite to a submitted praxis.")

    member_ids = {m.character_id for m in praxis.members}
    if inviter_id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can send invites.")

    if invitee_id == inviter_id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself.")
    if invitee_id in member_ids:
        raise HTTPException(status_code=409, detail="Player is already a member.")

    # Check for duplicate pending invite
    existing_result = await session.execute(
        select(PraxisInvite).where(
            PraxisInvite.praxis_id == praxis_id,
            PraxisInvite.inviter_id == inviter_id,
            PraxisInvite.invitee_id == invitee_id,
            PraxisInvite.status == PraxisInviteStatus.pending,
        )
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="A pending invite already exists. Resolve it before sending another.",
        )

    invitee = await session.get(Character, invitee_id)
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invitee not found.")

    if await is_active_member_of_task(invitee, praxis.task, session):
        raise HTTPException(
            status_code=409,
            detail="This player already has an active praxis for this task and cannot be invited.",
        )

    invite = PraxisInvite(
        praxis_id=praxis_id,
        inviter_id=inviter_id,
        invitee_id=invitee_id,
        status=PraxisInviteStatus.pending,
    )
    session.add(invite)
    await session.flush()
    await session.refresh(invite)
    return invite


async def respond_to_invite(
    invite_id: int,
    character_id: int,
    accept: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Accept or decline an invite. Creates a PraxisMember on accept."""
    invite = await session.get(PraxisInvite, invite_id)
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.invitee_id != character_id:
        raise HTTPException(status_code=403, detail="This invite is not for you.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=400, detail="Invite has already been resolved.")

    if not accept:
        invite.status = PraxisInviteStatus.declined
        await session.flush()
        await session.refresh(invite)
        return invite

    praxis = await session.get(Praxis, invite.praxis_id)
    if praxis is None:
        raise HTTPException(status_code=404, detail="Praxis no longer exists.")

    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(status_code=400, detail="Cannot join a submitted praxis.")

    # Check bank capacity
    in_progress_count = await _count_in_progress_praxes(character_id, session)
    already_member = any(m.character_id == character_id for m in praxis.members)
    if not already_member and in_progress_count >= era.max_task_signups:
        raise HTTPException(
            status_code=409,
            detail=f"Task bank is full ({era.max_task_signups} in-progress praxes).",
        )

    # Add member
    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)

    invite.status = PraxisInviteStatus.accepted
    await session.flush()
    await session.refresh(invite)
    return invite


async def cancel_invite(
    praxis_id: int,
    invite_id: int,
    inviter_id: int,
    session: AsyncSession,
) -> None:
    """Rescind a pending invite. Only the inviter may cancel, and only while
    the invite is still pending (removing an accepted member is a separate
    concern). Deletes the invite row (#421)."""
    invite = await session.get(PraxisInvite, invite_id)
    if invite is None or invite.praxis_id != praxis_id:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.inviter_id != inviter_id:
        raise HTTPException(status_code=403, detail="Only the inviter can rescind this invite.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=409, detail="Only a pending invite can be rescinded.")

    await session.delete(invite)
    await session.flush()


async def kick_member(
    praxis_id: int,
    member_id: int,
    requester_id: int,
    session: AsyncSession,
) -> None:
    """Remove a member. Any member may kick another (incl. the creator); not self (ADR-0013)."""
    praxis = await get_praxis(praxis_id, session)

    _require_member(praxis, requester_id, "kick from")

    if member_id == requester_id:
        raise HTTPException(status_code=400, detail="Cannot kick yourself.")

    member_result = await session.execute(
        select(PraxisMember).where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == member_id,
        )
    )
    kickee_member = member_result.scalar_one_or_none()
    if kickee_member is None:
        raise HTTPException(status_code=400, detail="Target player is not a member.")

    # Remove via the collection so delete-orphan cascades the DELETE *and* the
    # in-memory members list stays consistent — the route reuses this same
    # identity-mapped praxis to build its response.
    praxis.members.remove(kickee_member)

    # A kick resets the changed group back to drafting (ADR-0013).
    await collab_consensus.on_member_kicked(praxis, session)


async def leave_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """A member removes their *own* membership from a collab (ADR-0012).

    Distinct from kick (removing someone else) and withdraw (taking the whole
    praxis out of scoring). Unlike a kick, leaving does **not** reset the remaining
    members' submissions: if everyone still here has submitted, the collab goes Live.
    """
    praxis = await get_praxis(praxis_id, session)
    if praxis.type != PraxisType.collab:
        raise HTTPException(status_code=400, detail="Only collab memberships can be left.")
    _require_member(praxis, character_id, "leave")

    leaver = next(m for m in praxis.members if m.character_id == character_id)
    praxis.members.remove(leaver)
    await session.flush()

    # A departure can complete the consensus among those who stayed.
    await collab_consensus.on_member_leave(praxis, session, era)

    # The leaver's stake is gone — recompute their stats regardless.
    await recalculate_character_stats(character_id, session, era)
    await session.flush()
    return await get_praxis(praxis_id, session)


async def submit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Mark the member's has_submitted=True.

    All members submitted → Live now. Otherwise, on a collab, this opens the
    pending-publish window (ADR-0012): silence for ``era.collab_auto_submit_days``
    auto-publishes via the lazy-on-access timeout. Solo/duel always have one member,
    so they publish immediately and never enter the window.
    """
    praxis = await get_praxis(praxis_id, session)

    member_ids = {m.character_id for m in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this praxis.")

    went_live = await collab_consensus.on_submit(praxis, character_id, session, era)
    if went_live:
        # Settle any duel BEFORE the stats recalc — the outcome feeds the duel
        # multiplier. Kept here (not in collab_consensus) because it depends on
        # services.duel, which imports services.praxis (import-cycle avoidance).
        from services.duel import maybe_settle_duel
        await maybe_settle_duel(praxis_id, session)
        await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)


async def moderate_praxis(
    praxis_id: int,
    new_status: str,
    admin_note: Optional[str],
    session: AsyncSession,
) -> Praxis:
    """Admin moderation: update moderation_status and admin_note."""
    praxis = await get_praxis(praxis_id, session)

    try:
        mod_enum = ModerationStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid moderation status: {new_status}")

    praxis.moderation_status = mod_enum

    if mod_enum == ModerationStatus.flagged:
        praxis.flagged_at = datetime.now(timezone.utc)
    if mod_enum == ModerationStatus.failed:
        praxis.admin_note = admin_note or ""
    elif mod_enum == ModerationStatus.visible:
        praxis.admin_note = None

    await session.flush()
    return await get_praxis(praxis_id, session)


# ---------------------------------------------------------------------------
# Metatasks
# ---------------------------------------------------------------------------


def _check_metatask_eligibility(
    character: Character,
    task: Task,
    character_level: int,
    era: EraConfig,
) -> Optional[str]:
    """Return a 403 reason string if this character can't apply ``task``, else None."""
    # Albescent bypasses the level gate (its charter); everyone else must meet
    # metatask_apply_level. Metatasks are faction-open, so the seam
    # `faction_permits` (ADR-0029, #171) currently permits every faction — the
    # call is retained so a future faction rule is inherited here automatically.
    if character.faction_slug == ALBESCENT_FACTION_SLUG:
        return None
    if character_level < era.metatask_apply_level:
        return (
            f"Must be level {era.metatask_apply_level} or above "
            "to apply metatasks."
        )
    if not faction_permits(character, task, era):
        return "This metatask belongs to a different faction."
    return None


async def apply_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Attach a metatask (Task with task_type=metatask) to a praxis.

    Gates (R.9):
    - The task must be ``TaskType.metatask`` (else 400).
    - The applying character must be a member of the praxis (else 403).
    - The praxis must be ``in_progress`` (else 422).
    - Level gate: at least ``era.metatask_apply_level`` (Albescent bypasses).
      Metatasks are faction-open — any faction may apply any
      faction's metatask.
    - Quantity cap: at most ``metatask_cap_for_level(level, era)`` metatasks on
      one praxis (else 422).
    """
    praxis = await get_praxis(praxis_id, session)
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.task_type != TaskType.metatask:
        raise HTTPException(
            status_code=400,
            detail="Only tasks with task_type='metatask' can be applied as metatasks.",
        )

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can apply metatasks.",
        )

    if praxis.status != PraxisStatus.in_progress:
        raise HTTPException(
            status_code=422,
            detail="Metatasks can only be applied to in-progress praxes.",
        )

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character_id, era_row.id)

    eligibility_error = _check_metatask_eligibility(character, task, stats.level, era)
    if eligibility_error is not None:
        raise HTTPException(status_code=403, detail=eligibility_error)

    # Reject duplicate links up front — a metatask can only be applied once
    # to the same praxis.
    existing = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="This metatask is already applied to the praxis.",
        )

    # Quantity cap: how many metatasks this praxis may hold rises with the
    # applying character's level (metatasks_per_praxis_max_level).
    cap = metatask_cap_for_level(stats.level, era)
    current_count = await session.scalar(
        select(func.count())
        .select_from(PraxisMetaTask)
        .where(PraxisMetaTask.praxis_id == praxis_id)
    )
    if current_count >= cap:
        raise HTTPException(
            status_code=422,
            detail=(
                f"This praxis already holds the maximum of {cap} "
                f"metatask{'s' if cap != 1 else ''} at your level."
            ),
        )

    session.add(PraxisMetaTask(praxis_id=praxis_id, task_id=task_id))
    await session.flush()

    await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)


async def remove_metatask(
    praxis_id: int,
    task_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Remove a metatask from a praxis. Any praxis member can remove."""
    praxis = await get_praxis(praxis_id, session)

    member_ids = {member.character_id for member in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="Only members of this praxis can remove metatasks.",
        )

    result = await session.execute(
        select(PraxisMetaTask).where(
            PraxisMetaTask.praxis_id == praxis_id,
            PraxisMetaTask.task_id == task_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Metatask is not applied to this praxis.")

    await session.delete(link)
    await session.flush()

    await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)


__all__ = [
    "active_member_task_ids_subquery",
    "allowed_praxis_modes",
    "apply_metatask",
    "author_contributions_for",
    "build_praxis_out",
    "build_praxis_card_out",
    "cancel_pending_publish_on_edit",
    "can_flag_praxis",
    "can_submit_praxis_for_task",
    "can_view_praxis",
    "create_praxis",
    "delete_praxis",
    "evaluate_signup",
    "flag_praxis",
    "get_praxis",
    "invite_to_praxis",
    "is_active_member_of_task",
    "is_task_eligible_for_character",
    "kick_member",
    "leave_praxis",
    "list_praxes",
    "praxis_visibility_condition",
    "PraxisSort",
    "VotedFilter",
    "moderate_praxis",
    "remove_metatask",
    "respond_to_invite",
    "SignupDenialReason",
    "SignupEligibility",
    "submit_praxis",
    "update_praxis",
    "unsubmit_praxis",
]
