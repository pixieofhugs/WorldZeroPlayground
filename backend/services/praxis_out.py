"""Praxis read model — ORM rows to ``*Out`` response bodies.

Every praxis response body is built here: the single-praxis
:func:`build_praxis_out`, the list card :func:`build_praxis_card_out`, and the
page-wide precompute maps (:func:`author_contributions_for`,
:func:`applied_metatasks_for`, :func:`duel_id_map`, :func:`duel_opponents_for`,
plus the tally/crown/vote
maps gathered in :func:`build_praxis_cards`) that keep a feed from turning into
an N+1.

Split out of ``services/praxis.py`` (#1391) — a pure move, no behaviour change.
The dependency runs one way only: the read model reads ``services.praxis`` for
the domain predicate a response field reports (``can_flag``), and nothing in
``services.praxis`` reads back. Keeping that direction is what stops the two
modules becoming an import cycle.
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
    """One roster row.

    ``nudged_at`` is viewer-relative and only the single-praxis
    :func:`build_praxis_out` supplies it — a card in a list has no nudge button,
    and threading the lookup through every list route would buy an N+1 for a
    field nothing there reads.

    ``submitted_at`` is not viewer-relative and costs nothing: it is already on
    the member row (#571) and had simply never reached the wire (#1415), so it
    goes out on cards too.
    """
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

    ``viewer`` is the authenticated viewer's character, used to compute
    viewer-relative flags such as ``can_flag``, ``viewer_can_vote`` and invite
    visibility. It is REQUIRED and keyword-only (#1974): it used to default to
    ``None``, which is also the honest answer for an anonymous reader, so a route
    that simply forgot it got the anonymous payload — ``viewer_can_vote=True`` on
    the caller's own praxis, and a vote widget drawn on it. ``viewer=None`` is
    still legal; it just has to be typed out, which turns "I forgot" into
    "I meant anonymous".

    ``crowned_ids`` are the Task Crown holders (ADR-0028); list routes
    precompute them once via :func:`~services.vote_tally.crowned_praxis_ids`
    to avoid an N+1, single-praxis routes leave the default.
    """
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0

    # Viewer-relative nudge state (#1083): when the viewer last poked each member
    # about THIS praxis, within the rate-limit window. One map, not one query per
    # row; empty for an anonymous reader, who can never nudge anyway.
    nudged_at_by_character = (
        await nudged_at_map(praxis.id, viewer.id, session) if viewer is not None else {}
    )
    members = [
        _build_member_out(m, nudged_at_by_character.get(m.character_id))
        for m in praxis.members
    ]

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
        habit_bonus_points,
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

    # Vote eligibility (#998): hide the whole vote module for a logged-in viewer
    # who owns this praxis (A) or is a participant in its duel (B). Anonymous →
    # True (the client shows its own login gate). Same predicate the vote
    # endpoint enforces, so the UI cannot disagree with a 403.
    # (#1391) This was a function-body import while the builder lived in
    # ``services.praxis``, where ``services.vote`` was a cycle risk. The read
    # model has no such edge, so it is a plain module-level import now.
    can_vote = await viewer_can_vote(viewer, praxis, session)

    # The viewer's own star (#1382) — the same account-scoped resolver the card
    # path uses, so detail and card report one ``viewer_vote`` rather than two.
    # Only the carried character's own value is taken: the account-mate
    # "voted by Alice" marker is a card affordance and detail has no slot for it.
    viewer_vote: Optional[int] = None
    if viewer is not None:
        own_vote = (
            await viewer_votes_for([praxis.id], viewer.id, viewer.account_id, session)
        ).get(praxis.id)
        viewer_vote = own_vote.value if own_vote is not None else None

    # Task Crown (ADR-0028): top submitted praxis for this task, computed live.
    if crowned_ids is None:
        crowned_ids = await crowned_praxis_ids([praxis.task_id], session)

    created_by_display_name = praxis.created_by.display_name if praxis.created_by else ""
    created_by_faction_slug = praxis.created_by.faction_slug if praxis.created_by else None
    # The author's portrait for the detail byline (#2106). Same relationship the
    # display name above is read off, so this costs no additional query.
    created_by_avatar_url = (
        praxis.created_by.avatar_url if praxis.created_by else None
    ) or ""

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


async def duel_id_map(
    praxes: list[Praxis],
    session: AsyncSession,
) -> dict[int, int]:
    """Praxis id → duel id for each duel-side praxis on the page, in ONE query.

    A duel side is stored ``type='solo'`` + a non-null ``duel_id`` (ADR-0011),
    so card mode labels/chips must gate on duel presence, not ``type`` (#992).
    Mirrors the per-praxis duel lookup in :func:`build_praxis_out` (same statuses
    incl. ``resolved`` per ADR-0052, so a past duel's side still reads as a duel),
    but batches every praxis id on the page into a single duel query rather than
    one lookup per card (N+1). The result is handed to
    :func:`build_praxis_card_out` via ``duel_ids``.

    A praxis that is not a duel side is simply absent from the returned map (the
    card builder treats a missing entry as ``duel_id=None``).
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
    """The OTHER side of a duel, as a card names it (#596).

    Identity only — who a duel side is fighting. Deliberately not the other
    side's score or standing: the card names the opponent, and the duel detail
    page (``duelCrossLink``) is what reports how the contest is going.
    """

    #: The other side's praxis, for the card's link through to it.
    praxis_id: int
    #: The other side's AUTHOR. A duel side is always solo (ADR-0011), so its
    #: author is the whole of it — there is no roster to cap.
    display_name: str
    #: The author's member faction, for the opponent's avatar. ``None`` for an
    #: unaffiliated author, which is the `default` sheet's slug (ADR-0039).
    faction_slug: Optional[str]
    #: The author's portrait (#2128), so the duel banner shows a face rather
    #: than initials. Relative media path or "" — "" is the ordinary case (no
    #: portrait uploaded) and the banner falls back to the monogram.
    avatar_url: str


async def duel_opponents_for(
    praxes: list[Praxis],
    session: AsyncSession,
) -> dict[int, DuelOpponent]:
    """Praxis id → the OTHER side of its duel, for the whole page in ONE query.

    A duel is two separate ``Praxis`` rows joined by a ``Duel`` row (ADR-0011),
    not one praxis with two members, so a duel side's own ``members`` contains
    only its own submitter and the card has no path to the rival's name. This is
    that path, batched: the same "one query for the page, never one per card"
    shape as :func:`~services.vote_tally.viewer_votes_for` and
    :func:`~services.vote_tally.crowned_praxis_ids`. A per-card version of this
    lookup would be three joins × page size; ``/tasks`` was measured at ~300
    queries a page once (#1371) and this is exactly how that happens.

    Both sides are resolved in the same statement via aliased joins rather than a
    second round trip for the ids gathered from the first: a duel row where BOTH
    sides are on the page (two rivals adjacent in a feed) maps in both directions
    off the one row.

    THE PENDING WINDOW IS THE CASE THIS GETS RIGHT. ``Duel.opponent_praxis_id``
    is NULL until the challenge is accepted, so a challenger's card has no
    opponent praxis to name yet. Such a praxis is simply ABSENT from the map, and
    the card falls back to the mode chip alone — which is what ships today. The
    challenged character is knowable (``Duel.opponent_character_id`` is set from
    the start), but naming someone who has not accepted, on a card that may yet
    become an ordinary solo praxis if they decline, asserts a contest that does
    not exist. The outer joins below are what make the absence, rather than a
    dropped row, the answer.

    Mirrors :func:`duel_id_map`'s status set (incl. ``resolved``, ADR-0052), so a
    past duel's card still names who it was against after the era froze it.
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
        # Outer, both of them: the opponent side does not exist while the duel is
        # pending, and an inner join would drop the whole row rather than leave
        # the challenger unmatched.
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
        # The challenger's card names the opponent — only once there IS one.
        if challenger_praxis_id in praxis_ids and opponent_praxis_id is not None:
            opponents[challenger_praxis_id] = DuelOpponent(
                praxis_id=opponent_praxis_id,
                display_name=opponent_name or "",
                faction_slug=opponent_faction,
                avatar_url=opponent_avatar or "",
            )
        # The opponent's card names the challenger, who always exists: a Duel row
        # cannot be created without the challenger's praxis.
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
    habit_bonus_points, score)``. ``display_multiplier`` is faction × duel
    collapsed into one value, and ``score`` is the contribution's own total — for
    EVERY praxis type. There is no collab carve-out: a collab praxis has exactly
    one author, so it has exactly one faction and one multiplier (ADR-0053
    supersedes ADR-0047, whose collab branch contradicted its own author-scoping
    principle).

    The invariant the payload upholds, with no exception::

        score = task_point_value × display_multiplier
                + metatask_points + points_from_votes + habit_bonus_points

    ``display_multiplier`` reaches the base points and nothing else (ADR-0086).
    ``metatask_points`` and ``habit_bonus_points`` (#1617) join that line rather
    than hiding inside ``score``: they are flat, they are outside the
    multiplier, and a term that moves the total without appearing in the
    breakdown is how a card and a detail page start disagreeing.

    A duel side's multiplier is LIVE and PROVISIONAL — it moves when the
    opponent is voted, and a currently-behind Snide side reads ×0.0 (ADR-0052).
    """
    if contribution is None:
        # Defensive fallback (author missing / unscoreable): base + votes at ×1.0.
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

    ``viewer`` is the authenticated viewer's character, REQUIRED and keyword-only
    for the reason spelled out on :func:`build_praxis_out` (#1974): a permission
    field whose input can be forgotten is a permission field that fails open.

    ``viewer_can_vote`` maps praxis id → whether the viewer may vote (#998); list
    routes precompute it once via :func:`~services.vote.viewer_can_vote_map` so
    the ownership/duel-participation check is not a per-card query. When absent —
    or missing an entry, which means "not in the batch", exactly as ``tallies``
    does — this builder resolves the single praxis itself from ``viewer`` rather
    than assuming ``True`` (#1974).

    ``duel_ids`` maps praxis id → its duel id when the praxis is a duel side
    (#992, ADR-0011); list routes precompute it once via :func:`duel_id_map` so
    the duel lookup is not a per-card query (N+1). When absent, this builder
    loads the single praxis's duel id itself (single-card callers). A missing
    entry means the praxis is not a duel side (``duel_id=None``).

    ``duel_opponents`` maps praxis id → the OTHER side of its duel (#596); list
    routes precompute it once via :func:`duel_opponents_for` so naming the rival
    is not a per-card join. When absent, this builder resolves the single
    praxis's own opponent (single-card callers). A missing entry means there is
    no opponent to name — either the praxis is not a duel side at all, or its
    duel is still ``pending`` and nobody has accepted yet.

    ``tallies`` maps praxis id → its :class:`~services.vote_tally.VoteTally`;
    list routes precompute it once via :func:`~services.vote_tally.tally_votes`
    so the vote sum is not a per-card query (#1378). That map covers every id it
    was gathered for, zero-vote praxes included, so a *missing* entry means "not
    in the batch" and this builder falls back to tallying the single praxis
    itself (single-card callers) rather than reading absence as no votes.
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

    # Votes. Reuse the precomputed page-wide map when the list route supplies it
    # (#1378); otherwise tally this praxis alone. Membership is the coverage
    # test, not truthiness: a zero-vote praxis IS in the map, with an empty tally.
    tally = tallies.get(praxis.id) if tallies is not None else None
    if tally is None:
        tally = get_tally(await tally_votes([praxis.id], session), praxis.id)

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
        habit_bonus_points,
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

    # Duel side (#992, ADR-0011). Reuse the precomputed page-wide map when the
    # list route supplies it; otherwise load this praxis's own duel id.
    if duel_ids is not None:
        praxis_duel_id = duel_ids.get(praxis.id)
    else:
        praxis_duel_id = (await duel_id_map([praxis], session)).get(praxis.id)

    # The other side of the duel (#596). Reuse the precomputed page-wide map when
    # the list route supplies it; otherwise resolve this praxis's own. Absent for
    # a non-duel praxis and for a challenger whose duel is still pending.
    if duel_opponents is not None:
        opponent = duel_opponents.get(praxis.id)
    else:
        opponent = (await duel_opponents_for([praxis], session)).get(praxis.id)

    # Vote eligibility (#998). Reuse the precomputed page-wide map when the list
    # route supplies it; otherwise ask the same predicate for this praxis alone.
    # A missing entry is NOT read as "yes" (#1974): absence means "not in the
    # batch", and answering a permission question from the absence of an answer
    # is precisely how this field shipped a vote widget onto its author's praxis.
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
    """Enrich a whole page of praxes into cards, eight PAGE-WIDE queries deep.

    Every lookup here is deliberately one query for the list rather than one per
    card, and they are listed together so that stays true — an eighth per-card
    query added inside :func:`build_praxis_card_out` would be invisible at the
    call site but would multiply by the page size.
    ``tests/integration/test_praxis_list_query_count.py`` asserts a small page
    and a large one cost the same, which is what stops that happening again.

    Lifted out of the ``/praxes`` route body so a second caller (the rail's
    compound read, #1344) gets an identical card rather than a near-miss
    reimplementation. Routes stay thin; this is the page's read model.
    """
    # Task Crown (ADR-0028): one windowed query for the whole page — not per card.
    crowned = await crowned_praxis_ids({praxis.task_id for praxis in praxes}, session)
    # Viewer's votes (#573, #644): one batched query for the whole page — not per
    # card. Account-scoped so both the own-star highlight and the account-mate
    # "voted by" marker come from the same fetch.
    viewer_votes = (
        await viewer_votes_for(
            {praxis.id for praxis in praxes}, viewer.id, viewer.account_id, session
        )
        if viewer
        else {}
    )
    # Score breakdown (ADR-0047): one scoring pass per distinct author for the
    # whole page — not per card. Grouped by author because the breakdown is the
    # AUTHOR's banked points, not the viewer's.
    author_contributions = await author_contributions_for(praxes, session)
    # Applied metatasks for the seal stack (#932): one page-wide join for every
    # praxis id — not a per-card query. The card's seal dispatches on each
    # metatask's issuing faction, so it needs the TaskOut rows, not just the
    # summed metatask_points the card already carries.
    applied_metatasks = await applied_metatasks_for(praxes, session)
    # Vote eligibility (#998): one ownership query + one duel query for the whole
    # page — not the per-praxis predicate per card. Hides the vote module for a
    # logged-in viewer who owns the praxis or is a participant in its duel.
    viewer_can_vote = await viewer_can_vote_map(praxes, viewer, session)
    # Duel sides (#992): one duel query for the whole page — not the per-praxis
    # duel lookup per card. A duel side is stored type='solo' + a non-null
    # duel_id (ADR-0011), so the card mode label/chip gates on this, not type.
    duel_ids = await duel_id_map(praxes, session)
    # Duel opponents (#596): one three-join query for the whole page — not a join
    # per card. A duel side's own members list holds only itself (ADR-0011), so
    # naming the rival needs the Duel row and the other side's author; this is
    # the only place on a card that reaches across a duel.
    duel_opponents = await duel_opponents_for(praxes, session)
    # Vote tallies (#1378): one grouped aggregate for the whole page — this was
    # the last per-card query here, a one-element ``tally_votes`` call inside the
    # builder, costing +1 SELECT per row on every list and doubling on each
    # "load more" refetch.
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
