"""Canonical praxis service.

Handles all three praxis types: solo, collab, and duel.
Replaces the old services/submission.py and services/collaboration.py.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Collection, List, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_, exists, func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.flag import Flag, FlagReason, stored_flag_reason
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
from models.character_stats import CharacterStats
from models.task import Task, TaskStatus, TaskType
from models.vote import Vote
from schemas.praxis import (
    MediaItemOut,
    MediaUploadResultOut,
    PraxisUpdate,
)
from services import collab_consensus
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.faction_service import faction_permits
from services.media import process_and_save_media
from services.era import (
    get_current_era_row,
    get_current_era_row_safe,
    get_era_row_for_praxis,
    get_or_create_stats,
)
from services.level_jump import available_level_reach, consume_level_jump
from models.duel import Duel, DuelStatus


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _require_member(praxis: Praxis, character_id: int, action: str) -> None:
    """403 unless ``character_id`` is a member of ``praxis`` (ADR-0013 co-ownership).

    A collab is co-owned by every member; solo/duel praxes have exactly one
    member (the creator), so this is equivalent to creator-only for those types.
    """
    if character_id not in {m.character_id for m in praxis.members}:
        raise HTTPException(status_code=403, detail=f"Only a member can {action} this praxis.")


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


def praxis_membership_condition(character_id: int):
    """SQL predicate — TRUE when ``character_id`` holds a ``PraxisMember`` row on
    the correlated ``Praxis``.

    The single spelling of "is part of this praxis" in SQL. Membership is not
    authorship (ADR-0013 co-ownership): an accepted collab invite makes you a
    member of a praxis you did not create, while solo/duel praxes have exactly
    one member — their creator — so for those the two coincide.

    Shared by the viewer-scoped visibility gate (:func:`praxis_visibility_condition`)
    and by the subject-scoped ``character_id``/``member_id`` filters in
    :func:`list_praxes`, so a second membership join cannot drift from the first.

    ``IN (subquery)`` rather than a join: a praxis yields exactly one row however
    many of its members match.
    """
    return Praxis.id.in_(
        select(PraxisMember.praxis_id).where(
            PraxisMember.character_id == character_id
        )
    )


def praxis_visibility_condition(viewer_id: Optional[int]):
    """SQL predicate for who may see a praxis (ADR-0024).

    ``submitted`` praxes are public; an ``in_progress`` praxis is visible only to
    its members (character-scoped, matching ``_require_member``). Push this into
    the query so pagination stays honest instead of post-filtering a page.

    Exception (#999): a ``submitted`` side of a live, incomplete duel stays
    author-only until the duel seals — see :func:`_duel_side_hidden_condition`,
    the same guard :func:`can_view_praxis` runs so the two doors can't drift.

    This is the *viewer* gate and nothing else: it answers "may this reader see
    the row", never "is this row part of character X's record". A caller that
    wants the latter ANDs :func:`praxis_membership_condition` on top — see the
    profile grid in :func:`list_praxes` and ``GET /characters/{id}/praxes``.
    """
    visible = Praxis.status == PraxisStatus.submitted
    if viewer_id is not None:
        visible = or_(visible, praxis_membership_condition(viewer_id))
    return and_(visible, not_(_duel_side_hidden_condition(viewer_id)))


class PraxisSort(str, Enum):
    """Feed orderings for the ``status=submitted`` praxis feed (#658).

    ``newest``/``oldest`` sort on ``Praxis.submitted_at`` — when the praxis was
    *filed* — not ``created_at``, which is merely when the draft was started
    (i.e. when the author signed up for the task). A praxis begun three weeks
    ago and filed this morning is news, and belongs at the top of ``newest``.

    ``most_voted``/``least_voted`` (#1362) order on how many votes a praxis has
    drawn. ``voter_count`` on the card is computed in Python by
    :func:`services.vote_tally.tally_votes` *after* the fetch, so it cannot
    order the query — the ORDER BY uses a correlated ``COUNT`` over ``Vote``
    counting exactly the same rows. Both carry a mandatory ``submitted_at DESC``
    tiebreak: most praxes have zero votes, so ties are the common case, and the
    feed's growing window (``usePagedResource`` refetches a wider ``limit``)
    would shuffle rows between pages under an untied ordering.
    """

    newest = "newest"
    oldest = "oldest"
    most_voted = "most_voted"
    least_voted = "least_voted"


class PraxisEraScope(str, Enum):
    """Which era's praxes a praxis list shows (#1362).

    Neither ``Praxis`` nor ``Task`` carries an ``era_id``, and an era reset
    (:func:`services.era.apply_era_reset`) never touches praxes — so a praxis
    list is an all-eras-forever list unless it is bounded by seal time.
    ``this_era`` (the default) is ``Praxis.submitted_at >= Era.started_at`` for
    the live era row; ``all_eras`` is the opt-out that restores the unbounded
    list. No column and no migration: the seal time already carries the fact.

    An *unsealed* praxis (``submitted_at IS NULL``, which by definition is every
    ``in_progress`` draft) is in-flight work and passes both scopes — it belongs
    to no past era, and excluding it would empty the sidebar's draft list.

    Read-side only. Past-era praxes remain votable and the score recalc still
    re-sums every era — that is #1345, deliberately not this scope.
    """

    this_era = "this_era"
    all_eras = "all_eras"


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
    faction: Optional[List[str]] = None,
    search: Optional[str] = None,
    sort: Optional[PraxisSort] = None,
    era_scope: PraxisEraScope = PraxisEraScope.this_era,
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

    ``character_id`` is the **profile grid** filter (#1112): the praxes that make
    up a character's public record — every praxis they are a *member* of
    (``PraxisMember``, so accepted collab invites count, not just what they
    authored), defaulting to ``submitted`` so no draft reaches any profile. Pass
    an explicit ``status`` to override that default.

    ``member_id`` is the raw membership filter with no status default, for
    callers that want in-flight work (the sidebar's in-progress list). Both
    spell membership via :func:`praxis_membership_condition`, which also backs
    :func:`_count_in_progress_praxes`'s rule, so a membership-based list can
    never disagree with the slot count.

    ``search`` is a free-text ``ilike`` over the praxis title, its body, the
    linked task's title, and **any member's** handle / display name. The player
    axis (#681) reverses #658's deliberate exclusion of the author: the
    maintainer chose one box that finds content OR a person, accepting that a
    common word can surface every praxis by anyone whose name contains it.
    It matches *members* rather than the author so a collab surfaces for each
    participant; a duel is two praxis rows of one member each, so each side
    already surfaces for its own duelist. A leading ``@`` is a sigil and is
    dropped for the player axis only, matching the character search (#624).

    ``faction`` is a multi-select (#1362): a list of task faction slugs, ORed.
    An empty list is a no-op, not "match nothing".

    ``sort`` only applies to the ``status=submitted`` feed and is ignored
    otherwise; every caller that passes no ``sort`` keeps ``created_at DESC``.

    ``era_scope`` defaults to ``this_era`` — praxes sealed since the live era
    began, plus every unsealed draft. See :class:`PraxisEraScope` for why that
    is a seal-time bound and not a column.

    ``voted`` (needs ``viewer_account_id``) is the account-scoped vote filter
    (#644 §6): ``yes`` = my account has voted this praxis; ``no`` = *needs my
    vote* (unvoted by my account **and** not co-owned by my account). See
    :class:`VotedFilter`. Ignored for anonymous viewers (no account).
    """
    query = select(Praxis).where(praxis_visibility_condition(viewer_id))

    # Unconditional: both the faction filter and the ``search`` task-title match
    # need it, and joining once keeps ``?faction=x&q=y`` from double-joining.
    query = query.join(Task, Praxis.task_id == Task.id)

    if faction:
        # Praxis has no faction of its own; it inherits the linked task's
        # faction. Multi-select (#1362): an EMPTY list means "no faction filter",
        # never "match nothing" — clearing every checkbox shows everything.
        query = query.where(Task.primary_faction_slug.in_(faction))

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
        # The profile grid (#1112). Membership, not authorship, for EVERY status
        # — ADR-0013 co-ownership does not switch on whether the praxis shipped,
        # so a finished collab belongs on each member's profile, not only its
        # creator's. And with no explicit status this is a public record of
        # FINISHED work: it defaults to ``submitted``, hiding drafts from every
        # viewer including their own owner.
        #
        # Nothing is lost — in-flight work lives in the sidebar, which asks for
        # it by membership already (``member_id`` + ``status=in_progress``), and
        # an explicit ``status`` still wins here, which is how task detail finds
        # the viewer's own draft for a task.
        query = query.where(praxis_membership_condition(character_id))
        if status is None:
            status = PraxisStatus.submitted

    if member_id is not None:
        # Raw membership filter: any praxis the character holds a PraxisMember
        # row on, at whatever status the caller asked for. Unlike ``character_id``
        # above it defaults to nothing, so the sidebar can read drafts.
        query = query.where(praxis_membership_condition(member_id))

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

    if era_scope == PraxisEraScope.this_era:
        era_row = await get_current_era_row_safe(session)
        # None = the era is unseeded. Fall through UNSCOPED rather than
        # returning nothing: an install with no era row is not an install where
        # nobody has done anything.
        if era_row is not None:
            query = query.where(
                or_(
                    Praxis.submitted_at.is_(None),
                    Praxis.submitted_at >= era_row.started_at,
                )
            )

    query = query.options(selectinload(Praxis.media_items))
    if sort is not None and status == PraxisStatus.submitted:
        if sort in (PraxisSort.most_voted, PraxisSort.least_voted):
            # Correlated COUNT — the same rows tally_votes counts for
            # ``voter_count``, which is computed after the fetch and so cannot
            # order the query. The submitted_at tiebreak is mandatory; see
            # PraxisSort.
            vote_count = (
                select(func.count(Vote.id))
                .where(Vote.praxis_id == Praxis.id)
                .scalar_subquery()
            )
            order = (
                vote_count.desc()
                if sort == PraxisSort.most_voted
                else vote_count.asc(),
                Praxis.submitted_at.desc(),
            )
        else:
            order = (
                Praxis.submitted_at.asc()
                if sort == PraxisSort.oldest
                else Praxis.submitted_at.desc(),
            )
    else:
        order = (Praxis.created_at.desc(),)
    query = query.order_by(*order).limit(limit).offset(offset)
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


#: The one reason sign-up can be *open* that "you have not started this" does not
#: explain: the viewer is already on the task and their faction may hold more than
#: one membership on it (Double Dipper — ``can_hold_multiple_memberships``). It is
#: never inferred from a slug; see :func:`signup_reason`, which derives it from the
#: raw membership fact and the predicate's own verdict (#1497).
SIGNUP_REASON_MULTI_MEMBERSHIP = "multi_membership"


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


@dataclass(frozen=True)
class SignupFacts:
    """The character-scoped DB facts :func:`evaluate_signup` needs, read once.

    Every gate in that predicate except the task's own columns comes from three
    reads that are identical for every task a single request asks about: the
    viewer's current-era stats, their in-progress praxis count (the bank cap),
    and which of the tasks in hand they already hold a membership on. Gathered
    per page by :func:`gather_signup_facts`, a 50-row browse pays for them once
    instead of 50 times (#1377).

    ``task_ids`` is the page these facts were gathered for. Both membership sets
    are only meaningful within it, so :func:`evaluate_signup` and
    :func:`signup_reason` fall back to their own query for a task outside the set
    rather than reading absence as "not a member".

    The two membership sets answer different questions and differ by exactly the
    Double Dipper ability: ``active_member_task_ids`` is what *blocks* a fresh
    claim, ``held_membership_task_ids`` is what the viewer is on at all. The wire
    needs both to say "begin again" rather than "you are already on this" (#1497).
    """

    stats: CharacterStats
    in_progress_praxis_count: int
    task_ids: frozenset[int]
    active_member_task_ids: frozenset[int]
    held_membership_task_ids: frozenset[int]


async def gather_signup_facts(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> SignupFacts:
    """Read one page's worth of :class:`SignupFacts` in five queries, not five per row.

    ``era`` is threaded into the membership read so a caller evaluating against a
    non-current ruleset gets facts from that same ruleset — precomputed facts
    that disagree with the predicate would be the #1377 bug wearing a new hat.

    The fifth read is the raw membership set (#1497). It is a second page-wide
    query rather than a Python derivation of the first because deriving it would
    mean restating the Double Dipper carve-out outside the SQL that owns it — the
    #1359 defect exactly.
    """
    era_row = await get_current_era_row(session)
    return SignupFacts(
        stats=await get_or_create_stats(session, character.id, era_row.id),
        in_progress_praxis_count=await _count_in_progress_praxes(character.id, session),
        task_ids=frozenset(task_ids),
        active_member_task_ids=await active_member_task_ids(
            character, task_ids, session, era
        ),
        held_membership_task_ids=await held_membership_task_ids(
            character, task_ids, session
        ),
    )


async def evaluate_signup(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    facts: Optional[SignupFacts] = None,
) -> SignupEligibility:
    """The single sign-up predicate — true iff ``create_praxis``'s **type-agnostic**
    gates would accept (ADR-0008). Owns the gates every claim shares: the task is
    not a metatask, level, retired/pending faction carve-out, active-member, and
    the task-bank cap. The
    mode-specific gates (duel-via-challenge, collab level) stay in
    :func:`allowed_praxis_modes` and are applied by :func:`_check_create_preconditions`.

    Anonymous viewers are never eligible (``allowed=False``, no ``reason``).

    ``facts`` is the page-wide precompute (:func:`gather_signup_facts`) a list
    route passes in so this predicate stops being an N+1 (#1377). It must have
    been gathered for ``character``; omitting it makes every read here, exactly
    as before. It changes no answer — only how many queries the answer costs.
    """
    if character is None:
        return SignupEligibility(allowed=False)

    # Metatasks are stickers applied to a praxis (edit-praxis seal stack), never
    # signup targets — reject before any level/status work (#1001).
    if task.task_type == TaskType.metatask:
        return SignupEligibility(False, SignupDenialReason.is_metatask)

    if facts is not None:
        stats = facts.stats
    else:
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

    if facts is not None and task.id in facts.task_ids:
        already_member = task.id in facts.active_member_task_ids
    else:
        already_member = await is_active_member_of_task(character, task, session, era)
    if already_member:
        return SignupEligibility(False, SignupDenialReason.already_active_member)

    in_progress_count = (
        facts.in_progress_praxis_count
        if facts is not None
        else await _count_in_progress_praxes(character.id, session)
    )
    if in_progress_count >= era.max_task_signups:
        return SignupEligibility(False, SignupDenialReason.bank_full)

    return SignupEligibility(allowed=True)


async def signup_reason(
    character: Optional[Character],
    task: Task,
    eligibility: SignupEligibility,
    session: AsyncSession,
    *,
    facts: Optional[SignupFacts] = None,
) -> Optional[str]:
    """The ``TaskOut.signup_reason`` the wire carries — *why* this viewer may or may
    not claim this task (#1497).

    ``None`` means "nothing to explain": an ordinary first claim, or an anonymous
    viewer who has no standing to be given a reason. Otherwise it is either a
    :class:`SignupDenialReason` value (the blocked state, so the client can say
    which gate closed) or :data:`SIGNUP_REASON_MULTI_MEMBERSHIP`.

    The allowed-but-notable case is derived, never branched on a slug: if
    :func:`evaluate_signup` says yes *and* the viewer already holds a membership,
    the only rule that can have let both be true is the multi-membership ability.
    That is why this reads the raw membership set rather than
    ``active_member_task_ids``, which the ability empties by construction.

    ``facts`` is the page-wide precompute and carries #1377's property: an id
    outside ``facts.task_ids`` falls back to its own read instead of taking the
    absence as "not a member".
    """
    if eligibility.reason is not None:
        return eligibility.reason.value
    if not eligibility.allowed or character is None:
        return None

    if facts is not None and task.id in facts.task_ids:
        holds_membership = task.id in facts.held_membership_task_ids
    else:
        holds_membership = task.id in await held_membership_task_ids(
            character, [task.id], session
        )
    return SIGNUP_REASON_MULTI_MEMBERSHIP if holds_membership else None


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
    # predicate, so the can_sign_up flag can't drift from enforcement.
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
    await collab_consensus.on_member_edit(praxis, session, era)
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
    # The era is the one the praxis was sealed in — the seal time survives the
    # status flip above, and it is that era's row the points came out of (#1345).
    # The forfeit winner's duel side is the same praxis's era by construction.
    era_row = await get_era_row_for_praxis(praxis, session)
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
        # collab → solo: the actor takes it over as their own solo praxis. The
        # mutation itself is shared with the ADR-0060 involuntary conversion
        # (a collab that drops to one member) so the two cannot drift. What
        # stays here is what makes this a *takeover*: the 422 status guard above
        # and the choice of the actor as the new owner.
        await collab_consensus.convert_to_solo(praxis, character_id, session, era)

    # in_progress praxes aren't scored, so no stat recalc is needed here. The
    # ADR-0060 conversion cannot reuse that reasoning — it can fire on a
    # submitted praxis — so it recalcs at its own call site.
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


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------


async def _next_media_display_order(praxis_id: int, session: AsyncSession) -> int:
    """One past the highest ``display_order`` already on the praxis (0 if empty).

    So a second batch appends to the gallery instead of interleaving with the
    first. Gaps are harmless — the relationship orders by ``display_order``, not
    by contiguity.
    """
    highest = await session.scalar(
        select(func.max(MediaItem.display_order)).where(MediaItem.praxis_id == praxis_id)
    )
    return 0 if highest is None else highest + 1


async def add_media_batch(
    praxis: Praxis,
    uploads: List[UploadFile],
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> List[MediaUploadResultOut]:
    """Save N uploads onto one praxis, returning a per-file outcome per upload.

    Caller contract: the praxis has been fetched and ``_require_member`` has
    already passed — those are batch-wide verdicts and must be settled before a
    single byte is written.

    **Partial success is the point.** Each upload is validated and stored on its
    own; a file the pipeline rejects (unsupported type, over the byte cap,
    unwritable) yields an error entry and the batch carries on. Results come back
    in *request order*, one entry per upload, so the caller can match outcomes to
    the files it sent positionally or by ``filename``.

    ``display_order`` is derived from request position (appended after any media
    already attached) — unlike the single-file route, this endpoint does not
    accept an explicit ``display_order``, because a multi-file selection *is* its
    own order.

    ADR-0012: media is part of the shared document, so a successful batch cancels
    a pending publish — once for the whole batch, and not at all if every file
    was rejected (nothing was edited).

    ponytail: two uploads with the same filename land on the same path, so the
    later one overwrites the earlier while both rows persist. That is the shared
    pipeline's pre-existing behaviour (the single-file route has always done it
    when you upload ``photo.jpg`` twice); batching only makes it easier to hit by
    picking same-named files from two folders in one selection. The upgrade path
    is to uniquify the stored filename inside ``process_and_save_media`` — which
    changes the single-file route too, so it belongs in its own change.
    """
    display_order = await _next_media_display_order(praxis.id, session)
    results: List[MediaUploadResultOut] = []
    saved_count = 0

    for upload in uploads:
        # The *client-supplied* name, unsanitized: the composer reports failures
        # by the name the player picked, not by the name we chose to store.
        filename = upload.filename or ""
        try:
            media_item = await process_and_save_media(
                upload, praxis.id, character_id, display_order
            )
            session.add(media_item)
            await session.flush()
            await session.refresh(media_item)
        except HTTPException as exception:
            results.append(
                MediaUploadResultOut(
                    filename=filename,
                    error=str(exception.detail),
                    status_code=exception.status_code,
                )
            )
            continue
        results.append(
            MediaUploadResultOut(
                filename=filename,
                media_item=MediaItemOut.model_validate(media_item),
            )
        )
        display_order += 1
        saved_count += 1

    if saved_count:
        await collab_consensus.on_member_edit(praxis, session, era)
    return results


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


def multi_membership_faction_slugs(era: EraConfig = CURRENT_ERA) -> tuple[str, ...]:
    """Slugs whose members may hold more than one active membership on a task.

    The "Double Dipper" ability (Everymen in Era 1) read off ``era`` rather than
    branched on a slug — it is a ``FactionConfig.can_hold_multiple_memberships``
    field, the same shape as WOW's level jump (#1359).

    This is the *only* statement of the rule. :func:`active_member_task_ids_subquery`
    applies it in SQL and every Python caller reaches that subquery, so the
    browse list and the sign-up predicate cannot answer differently.
    """
    return tuple(
        sorted(
            slug
            for slug, faction in era.factions.items()
            if faction.can_hold_multiple_memberships
        )
    )


def _held_membership_task_ids_subquery(character_id: int):
    """Task IDs where ``character_id`` holds an active praxis membership — **the raw
    fact, with no ability applied**.

    "Active" means the praxis status is ``in_progress``, ``pending`` or ``submitted``.

    "Am I on this task" is not the same question as "does being on this task stop me
    claiming it again". Double Dipper is precisely the gap between the two, and
    ``TaskOut.signup_reason`` needs both sides of it to tell "begin again" from
    "you have never started this" (#1497).
    :func:`active_member_task_ids_subquery` is this select plus the carve-out, so
    the carve-out is still written exactly once.
    """
    return (
        select(Praxis.task_id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .join(Character, Character.id == PraxisMember.character_id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status.in_(
                [PraxisStatus.in_progress, PraxisStatus.pending, PraxisStatus.submitted]
            ),
        )
    )


def active_member_task_ids_subquery(
    character_id: int, era: EraConfig = CURRENT_ERA
):
    """SQL subquery returning task IDs whose membership **blocks** a fresh claim.

    Used by the task-list query to exclude tasks the character is already working on,
    and by :func:`active_member_task_ids` for the Python answer.

    The Double Dipper carve-out lives *here*, in the SQL, and not in a Python
    branch above it: the browse exclusion (``services.task.list_tasks``) reaches
    this function without going through the predicate, so a carve-out stated
    anywhere else is one the browse silently ignores — which is exactly how a
    task an Everymen character could legitimately claim again went missing from
    their own list (#1359). The join is on the membership's character, whose id
    is a primary key, so it adds a row lookup and no fan-out.
    """
    return _held_membership_task_ids_subquery(character_id).where(
        Character.faction_slug.notin_(multi_membership_faction_slugs(era))
    )


async def held_membership_task_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> frozenset[int]:
    """Which of ``task_ids`` ``character`` is on **at all** — ONE query, no carve-out.

    The batch sibling of :func:`active_member_task_ids`, reading
    :func:`_held_membership_task_ids_subquery` instead. Takes no ``era`` because no
    ruleset changes the raw fact; only what the fact *means* is era-dependent, and
    that lives in :func:`multi_membership_faction_slugs`.
    """
    if not task_ids:
        return frozenset()
    result = await session.execute(
        _held_membership_task_ids_subquery(character.id).where(
            Praxis.task_id.in_(task_ids)
        )
    )
    return frozenset(result.scalars().all())


async def active_member_task_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> frozenset[int]:
    """Which of ``task_ids`` ``character`` already holds an active membership on — ONE query.

    "Active" is the same population as :func:`active_member_task_ids_subquery`,
    which is also where the Double Dipper carve-out is applied: a member of a
    faction that may hold multiple memberships matches no row, so the gate never
    closes for them.

    The batch form of :func:`is_active_member_of_task`, which delegates here
    — one implementation, so the page-wide answer and the single-task answer
    cannot drift (#1377).
    """
    if not task_ids:
        return frozenset()
    result = await session.execute(
        active_member_task_ids_subquery(character.id, era).where(
            Praxis.task_id.in_(task_ids)
        )
    )
    return frozenset(result.scalars().all())


async def is_active_member_of_task(
    character: Character,
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True if ``character`` holds an active praxis membership for ``task``.

    False for a faction the era grants Double Dipper to — see
    :func:`multi_membership_faction_slugs`.
    """
    return task.id in await active_member_task_ids(character, [task.id], session, era)


async def can_sign_up_for_task(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    facts: Optional[SignupFacts] = None,
) -> bool:
    """Return True iff ``create_praxis``'s type-agnostic gates would accept — the
    truthful ``can_sign_up`` flag on ``TaskOut`` (ADR-0008).

    Derives from :func:`evaluate_signup`, so it covers every shared gate: level,
    retired/pending faction carve-out, active-member (Everymen Double-Dipper
    exempt), **and the task-bank cap** — the last was previously omitted here,
    which made the sign-up button lie once a character's bank was full.

    ``facts`` is passed straight through — see :func:`evaluate_signup`.
    """
    return (await evaluate_signup(character, task, session, era, facts=facts)).allowed


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
    :func:`services.meta_task.get_meta_task_points_bulk`
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
    """Create a collab invite. Praxis must be collab type. Inviter must be a member.

    **The invitee is not held to sign-up eligibility.** Whether they could have
    claimed this task themselves is a different question from whether they may
    join someone else's praxis on it: under Era 1 a level-1 character of the
    wrong faction can be invited onto a level-6 task, accept, and submit. That is
    deliberate — an Easter egg encouraging collaboration across factions and
    character levels (owner ruling, 2026-08-01; #1511).

    Which gates the invite lifts is era-owned, not hardcoded here:
    ``era.collab_invite_bypasses_level`` and ``era.collab_invite_bypasses_faction``.
    Set either False and this door enforces the same predicate sign-up does
    (:func:`meets_task_level`, :func:`~services.faction_service.faction_permits`).
    The task-bank flag is charged on the accept, in :func:`respond_to_invite`.

    What no era flag lifts: the invitee must not already hold an active
    membership on the task. That is a data-integrity rule (one live praxis per
    character per task), not an eligibility one.
    """
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

    if await is_active_member_of_task(invitee, praxis.task, session, era):
        raise HTTPException(
            status_code=409,
            detail="This player already has an active praxis for this task and cannot be invited.",
        )

    # The two eligibility axes, each read from the era rather than skipped by
    # omission (#1511). Both are False-by-default *bypasses*: under Era 1 neither
    # branch runs, so this costs nothing and changes nothing.
    if not era.collab_invite_bypasses_level:
        era_row = await get_current_era_row(session)
        invitee_stats = await get_or_create_stats(session, invitee.id, era_row.id)
        # ponytail: the faction level-jump allowance (#811) is not extended to the
        # invite door — reach is spent by claiming, and nothing here would consume
        # it. Upgrade path if an era ever wants it: pass available_level_reach(...)
        # here and consume_level_jump on accept, as create_praxis does.
        if not meets_task_level(invitee_stats.level, praxis.task):
            raise HTTPException(
                status_code=403,
                detail=f"This task requires level {praxis.task.level_required}.",
            )
    if not era.collab_invite_bypasses_faction and not faction_permits(
        invitee, praxis.task, era
    ):
        raise HTTPException(
            status_code=403,
            detail="This player's faction may not act on this task.",
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
    """Accept or decline an invite. Creates a PraxisMember on accept.

    The task bank is the one sign-up gate the collab door does not lift under
    Era 1 (``era.collab_invite_bypasses_task_bank`` is False), and it is charged
    here rather than at invite time: the cost is the invitee's to accept, and
    their bank may have emptied or filled since the invite was sent. The level
    and faction bypasses live on the invite itself
    (:func:`invite_to_praxis`, #1511).
    """
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

    # Check bank capacity — unless this era's collab door lifts it too (#1511).
    already_member = any(m.character_id == character_id for m in praxis.members)
    if not era.collab_invite_bypasses_task_bank and not already_member:
        in_progress_count = await _count_in_progress_praxes(character_id, session)
        if in_progress_count >= era.max_task_signups:
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
    requester_id: int,
    session: AsyncSession,
) -> None:
    """Rescind a pending invite. Any **member** may, and only while it is still
    pending (removing an accepted member is :func:`kick_member`'s job). Deletes
    the invite row (#421).

    Until #1415 this was inviter-only, which made the roster's rescind control
    appear on some pending rows and not others with nothing on screen to explain
    why. A collab is co-owned — ADR-0013 gives ``created_by_id`` no powers and
    any member may already invite (:func:`invite_to_praxis`) and kick
    (:func:`kick_member`) — so "only the person who typed the name may untype
    it" was the one asymmetric rule in the set, and it is gone.

    The guard that remains is membership: an outsider, including the invitee
    themselves, still gets 403. Declining is the invitee's verb
    (:func:`respond_to_invite`), and it keeps the row.
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, requester_id, "rescind an invite to")

    invite = next(
        (candidate for candidate in praxis.invites if candidate.id == invite_id), None
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=409, detail="Only a pending invite can be rescinded.")

    # Removed through the collection, not ``session.delete``: ``Praxis.invites``
    # is delete-orphan, so this issues the DELETE *and* keeps the in-memory list
    # consistent for anything that reuses this identity-mapped praxis — the same
    # reason :func:`kick_member` removes through ``praxis.members``.
    praxis.invites.remove(invite)
    await session.flush()


async def kick_member(
    praxis_id: int,
    member_id: int,
    requester_id: int,
    session: AsyncSession,
) -> None:
    """Remove a member. Any member may kick another (incl. the creator); not self (ADR-0013).

    Only while the praxis is still open (``in_progress`` or ``pending``). A kick
    resets the whole group back to drafting, so allowing it on a published praxis
    would silently unpublish it and wipe every member's cast — reopen first, then
    kick. Leaving is deliberately not restricted this way (ADR-0012): a member may
    walk away from a published collab without dragging it back into editing.
    """
    praxis = await get_praxis(praxis_id, session)

    _require_member(praxis, requester_id, "kick from")

    if member_id == requester_id:
        raise HTTPException(status_code=400, detail="Cannot kick yourself.")

    if praxis.status not in (PraxisStatus.in_progress, PraxisStatus.pending):
        raise HTTPException(
            status_code=422,
            detail="Cannot kick from a published praxis. Move it to editing first.",
        )

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

    # The leaver's stake is gone — recompute their stats regardless, against the
    # era the praxis belongs to, since that is the row their stake was in (#1345).
    await recalculate_character_stats(
        character_id, session, era, era_row=await get_era_row_for_praxis(praxis, session)
    )
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
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Admin moderation: update moderation_status and admin_note.

    Every transition recalculates each member's stats (#1373). ``hidden`` and
    ``failed`` are unscored (see ``services.character_stats``), so both marking
    and *un*marking moves the members' scores — and a score that only corrects
    itself on the author's next unrelated vote is the bug this closes. The
    recalc is unconditional rather than gated on "did the scored-ness change":
    it is the same handful of queries the vote path already runs per vote, and
    an admin action is rare.
    """
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
    await recalculate_members_stats(praxis, session, era)
    return await get_praxis(praxis_id, session)


__all__ = [
    "active_member_task_ids",
    "active_member_task_ids_subquery",
    "allowed_praxis_modes",
    "can_flag_praxis",
    "can_sign_up_for_task",
    "can_view_praxis",
    "create_praxis",
    "delete_praxis",
    "evaluate_signup",
    "flag_praxis",
    "gather_signup_facts",
    "get_praxis",
    "held_membership_task_ids",
    "invite_to_praxis",
    "is_active_member_of_task",
    "is_task_eligible_for_character",
    "kick_member",
    "leave_praxis",
    "list_praxes",
    "praxis_membership_condition",
    "praxis_visibility_condition",
    "PraxisEraScope",
    "PraxisSort",
    "VotedFilter",
    "moderate_praxis",
    "multi_membership_faction_slugs",
    "respond_to_invite",
    "SIGNUP_REASON_MULTI_MEMBERSHIP",
    "signup_reason",
    "SignupDenialReason",
    "SignupEligibility",
    "SignupFacts",
    "submit_praxis",
    "update_praxis",
    "unsubmit_praxis",
]
