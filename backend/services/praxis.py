"""Canonical praxis service.

Handles all three praxis types: solo, collab, and duel.
"""

import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from errors import (
    DETAIL_CONTEXT_PARAM,
    ErrorCode,
    coded_error,
    detail_message,
    raise_coded,
)
from faction_slugs import faction_filter_slugs
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.duel import DuelStatus
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
from models.task import Task, TaskStatus
from models.vote import Vote
from schemas.praxis import (
    MediaItemOut,
    MediaUploadResultOut,
)
from services import collab_consensus
from services.albescent_reveal import is_albescent_revealed
from services.character_stats import (
    recalculate_character_stats,
    recalculate_members_stats,
)
from services.era import (
    get_current_era_row,
    get_current_era_row_safe,
    get_era_row_for_praxis,
    get_or_create_stats,
)
from services.faction_service import faction_permits
from services.level_jump import consume_level_jump
from services.media import (
    process_and_save_media,
    resolve_stored_media_path,
    restore_media_to_mount,
    withdraw_media_from_mount,
)
from services.praxis_duel import (
    discard_dissolved_duels_for_praxis,
    get_duel_for_praxis,
    maybe_settle_duel,
)
from services.praxis_room import close_member_sockets
from services.praxis_visibility import (
    duel_side_hidden_condition,
    praxis_membership_condition,
    praxis_visibility_condition,
)
from services.signup_eligibility import (
    # Re-exported for existing `from services.praxis import ...` call sites
    # (SIGNUP_REASON_MULTI_MEMBERSHIP, gather_signup_facts) that this module
    # does not call itself — the definitions live in signup_eligibility now.
    SIGNUP_REASON_MULTI_MEMBERSHIP,  # noqa: F401 - re-export, see comment above
    SignupDenialReason,
    allowed_praxis_modes,
    count_in_progress_praxes,
    evaluate_signup,
    gather_signup_facts,  # noqa: F401 - re-export, see comment above
    is_active_member_of_task,
    meets_task_level,
)
from services.vote import void_account_vote_on_join

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

    The loads here are for the *detail view* only. Deleting a praxis does not
    depend on them: the FKs into ``praxis.id`` are ``ON DELETE CASCADE`` and
    the collections are ``passive_deletes=True``, so :func:`delete_praxis`
    works whether or not a collection is loaded. The inverse is the trap —
    eagerly loading ``media_items``, which has no ``delete-orphan`` cascade,
    makes ``session.delete(praxis)`` try to write ``praxis_id = NULL`` into a
    NOT NULL column. See ``MediaItem.praxis_id``.
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
    # Not folded into `viewer_account_id`: that one is an id used in a query,
    # this is the row whose sticky reveal flag decides whether an explicit
    # ?faction=albescent is answered literally (#2422).
    viewer_account: Optional[Account] = None,
    # Resolved by the route: admin status is an ``account_role`` row, and an
    # admin is treated as revealed (#2400).
    viewer_is_admin: bool = False,
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
    :func:`services.signup_eligibility.count_in_progress_praxes`'s rule, so a
    membership-based list can never disagree with the slot count.

    ``search`` is a free-text ``ilike`` over the praxis title, its body, the
    linked task's title, and **any member's** handle / display name. One box
    finds content OR a person (the player axis, #681), accepting that a common
    word can surface every praxis by anyone whose name contains it.
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

    # Praxis has no faction of its own; it inherits the linked task's faction.
    # Multi-select (#1362): an EMPTY list means "no faction filter", never
    # "match nothing" — clearing every checkbox shows everything. Routed through
    # the same helper as the task browse so Unaffiliated means the same set of
    # slugs on both, Albescent included (#1975) — and so a revealed viewer's
    # explicit ask un-folds on both, too (#2422).
    faction_slugs = faction_filter_slugs(
        faction,
        reveal_albescent=is_albescent_revealed(
            viewer_account, is_admin=viewer_is_admin
        ),
    )
    if faction_slugs:
        query = query.where(Task.primary_faction_slug.in_(faction_slugs))

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

    # Hidden is excluded unconditionally, and the caller's filter may only narrow
    # within what is left — it may never widen it. `moderation_status` is an
    # ungated query param, so an exclusion sitting in that filter's `else` would
    # let `?moderation_status=hidden` select exactly the content an admin has
    # taken off the site, and an unparseable value would drop the default with
    # it. The detail door (`can_view_praxis`) refuses hidden outright; this list
    # door has to reach the same answer. Asking for `hidden` yields an empty
    # page, not a 422 — a distinguishable error would answer "does hidden
    # content exist here?".
    query = query.where(Praxis.moderation_status != ModerationStatus.hidden)
    if moderation_status is not None:
        try:
            query = query.where(
                Praxis.moderation_status == ModerationStatus(moderation_status)
            )
        except ValueError:
            # Ignored: an unparseable value costs the caller their own filter
            # and nothing else — the hidden exclusion above already applies.
            pass

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


def _signup_denial_to_http(
    reason: Optional[SignupDenialReason], task: Task, era: EraConfig
) -> HTTPException:
    """Map a :class:`SignupDenialReason` to the route error it has always raised.

    Every branch carries an :class:`ErrorCode` (#1401). This helper *returns*
    rather than raises, which is exactly the shape a ``raise HTTPException``
    text scan cannot see — hence :func:`errors.coded_error` and hence the
    ratchet's AST scan.
    """
    if reason == SignupDenialReason.is_metatask:
        return coded_error(
            400,
            ErrorCode.task_is_metatask,
            "Metatasks are applied to a praxis, not signed up for.",
        )
    if reason == SignupDenialReason.below_level:
        return coded_error(
            403,
            ErrorCode.task_level_too_low,
            f"This task requires level {task.level_required}.",
            {"level": task.level_required},
        )
    if reason == SignupDenialReason.task_status_closed:
        # The status word is the only thing that varies, and it is also the
        # catalog discriminator — so the branch picks a context and the prose
        # follows from it rather than the two being spelled out twice.
        status_context = (
            "retired" if task.status == TaskStatus.retired else "pending"
        )
        return coded_error(
            403,
            ErrorCode.task_not_open_for_signup,
            f"This task is {status_context} and is not open for new praxis.",
            {DETAIL_CONTEXT_PARAM: status_context},
        )
    if reason == SignupDenialReason.already_active_member:
        return coded_error(
            409,
            ErrorCode.task_already_active_member,
            "You have already submitted a praxis for this task.",
            {DETAIL_CONTEXT_PARAM: "signup"},
        )
    # bank_full (and the anonymous/None fallback, which create_praxis never hits).
    return coded_error(
        400,
        ErrorCode.task_bank_full,
        f"Task bank is full ({era.max_task_signups} in-progress praxis). Complete or withdraw one first.",
        {"limit": era.max_task_signups, DETAIL_CONTEXT_PARAM: "signup"},
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
        # Only collab has prose of its own; anything else is a mode the era does
        # not offer this character at all, and says so generically (#1401 keeps
        # both strings byte-identical — it adds the code, not new copy).
        if praxis_type == PraxisType.collab:
            raise_coded(
                403,
                ErrorCode.collaboration_level_too_low,
                f"Collaborations require level {era.collaboration_level_required}.",
                {"level": era.collaboration_level_required},
            )
        raise_coded(
            403, ErrorCode.praxis_mode_unavailable, "Praxis mode not available."
        )

    return task


#: Namespace for :func:`_lock_signups_for_character`'s advisory lock. Postgres
#: advisory locks share one global 64-bit space across the whole database, so a
#: bare ``character_id`` would collide with any other feature that ever locks on
#: an id. The two-argument form takes an explicit namespace instead.
#:
#: ponytail: that form is ``(int4, int4)``, so it presumes ``character.id`` fits
#: in 32 bits. It is a BIGINT column; past 2^31 characters this needs the
#: one-argument int8 form with the namespace folded into the high half.
_SIGNUP_LOCK_NAMESPACE = 0x5A19


async def _lock_signups_for_character(character_id: int, session: AsyncSession) -> None:
    """Serialise one character's task signups for the rest of this transaction.

    :func:`_check_create_preconditions` is a read-then-write: it SELECTs whether
    the character already holds an active membership on the task (and how full
    their bank is), then INSERTs on the strength of that answer. Nothing in the
    schema can catch a second signup that slips between the two — the
    "one active membership per character per task" rule spans ``praxis_member``
    and ``praxis.status``/``task_id``, so it is not expressible as a unique
    index without denormalising ``task_id`` onto the membership.

    That gap is not theoretical. In production four praxes were created for one
    character on one task inside 110 milliseconds — two of them 2ms apart — by a
    single tap on a phone that fired four requests. All four ran the membership
    check before any of them committed, so all four were told they were the
    first.

    An advisory lock rather than ``SELECT ... FOR UPDATE`` on the character row:
    the thing being serialised is a *decision spanning several tables*, not a
    mutation of ``character``, and taking a row lock for it would mean anything
    else touching that row inherits the contention. ``xact`` releases at
    commit or rollback, so no path can leak it. Contention is per character, so
    two different players never wait on each other.

    ponytail: the client is not fixed here — four ``handleSignup`` copies would
    each need an in-flight guard, and every one of them would still be advisory.
    The server has to refuse regardless. Add the client guard when the wasted
    round-trips are worth four diffs.
    """
    await session.execute(
        select(func.pg_advisory_xact_lock(_SIGNUP_LOCK_NAMESPACE, character_id))
    )


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

    Every one of those gates is a *read* followed by a write, so they only hold
    against one signup at a time — see :func:`_lock_signups_for_character`.
    """
    await _lock_signups_for_character(character_id, session)

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


# There is no praxis text write in this service. ``praxis.title`` and
# ``praxis.body_text`` are derived columns, written only by the praxis's room
# (``services/praxis_room.py``, ADR-0073), and ADR-0013's "any member may edit"
# has its one implementation in the room's door — ``_require_member(praxis,
# character_id, "edit")`` at connect.
#
# A text edit triggers ADR-0012's hard reset (ADR-0079) through that room rather
# than through a route: ``services.praxis_room._RoomFlusher.write`` calls
# ``collab_consensus.on_room_edit`` on the trailing edge of its debounce. Media
# edits and Withdraw reach the same rule through ``on_member_edit``.


async def unsubmit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Withdraw a proposal, or reopen a published praxis. Any member may act
    (ADR-0013). #590, ADR-0079.

    One route, two doors, told apart by status — and ADR-0059's point stands for
    both: re-entry is a deliberate act, not a raw write.

    - ``submitted``: the whole group reopens. Votes are preserved but stop scoring
      until resubmitted; every member's approval clears. Unsubmitting a
      *settled* duel side forfeits the contest permanently (ADR-0011 §Forfeit):
      the opponent wins by default and the duel stays ``settled``.
    - ``pending`` (a proposal is live): **Withdraw proposal**. Same effect as an
      edit — the countdown stops, every approval clears, the praxis is back to
      drafting. Pending praxes are unscored, so no stat recalc.
    - ``in_progress``: 422 — there is nothing to withdraw and nothing to reopen.
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "reopen")

    # Withdraw: a group action, for a member who has read the draft and has no
    # edit to make yet (ADR-0079). It is not a per-member pull-back — there is no
    # per-member submission left to take back — so it runs the same cancellation
    # a keystroke would.
    if praxis.status == PraxisStatus.pending:
        await collab_consensus.on_member_edit(praxis, session, era)
        return await get_praxis(praxis_id, session)

    if praxis.status != PraxisStatus.submitted:
        raise HTTPException(status_code=422, detail="Praxis is already in editing mode.")

    # ADR-0011 §Forfeit (#307): unsubmitting a *settled* duel side forfeits the
    # contest. Mark the forfeit (first one sticks) and recalc the winner below so
    # their guaranteed-win modifier lands immediately.
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
    # No thaw to announce (ADR-0079): the room was never sealed. The document
    # this reopens is a fresh one all the same, seeded on first connect from the
    # ``body_text`` this praxis published with, because publishing destroys the
    # old one (ADR-0073 rule 7).

    # Recalc *every* member, not just the actor: on a collab, co-authors' scores
    # also counted this praxis while it was submitted, so all of them must drop
    # — which is the same set the submit paths recalc.
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
    if await get_duel_for_praxis(praxis_id, session) is not None:
        raise HTTPException(
            status_code=409, detail="End the duel before changing this praxis's mode."
        )

    if new_type == PraxisType.collab:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character_id, era_row.id)
        if stats.level < era.collaboration_level_required:
            raise_coded(
                403,
                ErrorCode.collaboration_level_too_low,
                f"Collaborations require level {era.collaboration_level_required}.",
                {"level": era.collaboration_level_required},
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
    """Delete a praxis. Creator only. Must be in_progress.

    A duel side is deletable once its challenge has been dissolved (#1831): the
    declined Duel row goes with the praxis, because the two duel FKs are the one
    pair into ``praxis.id`` that does not cascade. A live or resolved duel still
    refuses the delete — the reasoning is on
    :func:`services.praxis_duel.discard_dissolved_duels_for_praxis`, which owns
    the predicate.
    """
    praxis = await get_praxis(praxis_id, session)
    if praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character's praxis.")
    if praxis.status == PraxisStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a submitted praxis. Move it to editing first.",
        )
    await discard_dissolved_duels_for_praxis(praxis_id, session)
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
                    # `detail_message`, not `str(...)`: since #1401 the media
                    # limits raise a coded `{code, message}` body, and `str()`
                    # on that renders a dict repr into a field a player reads.
                    error=detail_message(exception.detail),
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


async def delete_media_item(
    praxis: Praxis,
    media_item: MediaItem,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Remove one media item from a live praxis: DB row authoritative, disk best-effort.

    Caller contract: the praxis has been fetched, ``_require_member`` has
    passed, and ``media_item`` has been confirmed to belong to ``praxis`` —
    same batch-wide-verdicts-first contract as :func:`add_media_batch`.

    Through the shared predicate, not a bare join. ``resolve_stored_media_path``
    is the one "is this a file we own?" gate every column-value-to-filesystem
    operation passes (see its docstring): ``file_path`` is server-generated
    today so there is no live traversal, but joining ``MEDIA_ROOT`` to it
    directly would let a stored value with an absolute or ``..``-bearing path
    escape ``MEDIA_ROOT`` entirely, the day any other writer touches that
    column. Same two lines as ``delete_stored_avatar``.

    ``resolve_stored_media_path`` returning ``None`` -- an unresolvable path,
    same as a row this process does not own -- means there is nothing on disk
    to touch, and removing the row is still a no-op success, never a 500.
    """
    abs_path = resolve_stored_media_path(media_item.file_path)
    if abs_path is not None:
        try:
            os.remove(abs_path)
        except OSError:
            pass
        # Each upload owns its directory (#1336), so removing the file leaves
        # that directory empty. rmdir refuses a non-empty one, which is
        # exactly the guard we want for pre-#1336 rows that still share a
        # per-praxis directory.
        try:
            os.rmdir(os.path.dirname(abs_path))
        except OSError:
            pass

    await session.delete(media_item)
    await session.flush()
    # Removing media edits the shared document — cancels a pending publish (ADR-0012).
    await collab_consensus.on_member_edit(praxis, session, era)


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
    :func:`duel_side_hidden_condition` the feed predicate uses, scoped to this
    one row, so the detail door and the list door can never disagree.
    """
    if praxis.moderation_status == ModerationStatus.hidden:
        return False
    if praxis.status == PraxisStatus.submitted:
        viewer_id = viewer.id if viewer is not None else None
        hidden = await session.scalar(
            select(duel_side_hidden_condition(viewer_id))
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


async def account_already_flagged(
    account_id: int,
    session: AsyncSession,
    *,
    praxis_id: Optional[int] = None,
    comment_id: Optional[int] = None,
) -> bool:
    """True if any character on ``account_id`` already flagged this target (#328 anti-gang).

    Joins ``Flag.flagged_by → Character.account_id`` so no ``flagged_by_account_id``
    column / migration is needed. Takes either target because ``Flag`` carries
    both and the rule is the same one — ``services/comment.py`` reaches this for
    the comment half rather than restating the join.
    """
    target = (
        Flag.praxis_id == praxis_id
        if praxis_id is not None
        else Flag.comment_id == comment_id
    )
    result = await session.execute(
        select(Flag.id)
        .join(Character, Character.id == Flag.flagged_by)
        .where(target, Character.account_id == account_id)
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
    if await account_already_flagged(viewer.account_id, session, praxis_id=praxis.id):
        return False
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)
    return stats.level >= era.flag_level_required


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
    if await account_already_flagged(
        flagged_by.account_id, session, praxis_id=praxis.id
    ):
        raise HTTPException(
            status_code=409, detail="Your account has already flagged this praxis."
        )

    if not await can_flag_praxis(flagged_by, praxis, session, era):
        raise_coded(
            403,
            ErrorCode.flag_level_too_low,
            f"Must be level {era.flag_level_required} or above to flag a praxis.",
            {"level": era.flag_level_required, DETAIL_CONTEXT_PARAM: "praxis"},
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
            detail="Invites are only for collab praxis. Duels use the challenge endpoint.",
        )
    if praxis.status == PraxisStatus.submitted:
        raise_coded(
            400,
            ErrorCode.invite_praxis_submitted,
            "Cannot invite to a submitted praxis.",
            {DETAIL_CONTEXT_PARAM: "invite"},
        )

    member_ids = {m.character_id for m in praxis.members}
    if inviter_id not in member_ids:
        raise HTTPException(status_code=403, detail="Only members can send invites.")

    if invitee_id == inviter_id:
        raise_coded(400, ErrorCode.invite_self, "Cannot invite yourself.")
    if invitee_id in member_ids:
        raise_coded(
            409, ErrorCode.invite_already_member, "Player is already a member."
        )

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
        raise_coded(
            409,
            ErrorCode.invite_already_pending,
            "A pending invite already exists. Resolve it before sending another.",
        )

    invitee = await session.get(Character, invitee_id)
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invitee not found.")

    if await is_active_member_of_task(invitee, praxis.task, session, era):
        raise_coded(
            409,
            ErrorCode.invite_target_has_active_praxis,
            "This player already has an active praxis for this task and cannot be invited.",
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
            raise_coded(
                403,
                ErrorCode.task_level_too_low,
                f"This task requires level {praxis.task.level_required}.",
                {"level": praxis.task.level_required},
            )
    if not era.collab_invite_bypasses_faction and not faction_permits(
        invitee, praxis.task, era
    ):
        raise_coded(
            403,
            ErrorCode.invite_faction_not_permitted,
            "This player's faction may not act on this task.",
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
        raise_coded(
            400,
            ErrorCode.invite_praxis_submitted,
            "Cannot join a submitted praxis.",
            {DETAIL_CONTEXT_PARAM: "join"},
        )

    # Check bank capacity — unless this era's collab door lifts it too (#1511).
    already_member = any(m.character_id == character_id for m in praxis.members)
    if not era.collab_invite_bypasses_task_bank and not already_member:
        in_progress_count = await count_in_progress_praxes(character_id, session)
        if in_progress_count >= era.max_task_signups:
            raise_coded(
                409,
                ErrorCode.task_bank_full,
                f"Task bank is full ({era.max_task_signups} in-progress praxis).",
                {"limit": era.max_task_signups},
            )

    # Add member
    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)

    # #2216: any vote this account already holds on the praxis is voided here.
    # An outstanding invite blocks *new* votes (``services.vote``), but one cast
    # before the invitation arrived would otherwise survive into co-ownership —
    # the exact state that gate exists to prevent. The accept itself is never
    # refused for it: the invitee could not have known the rule when they voted.
    # Called before the flush so ``praxis.members`` is still the set the vote was
    # scoring, which is the set the re-tally has to move.
    invitee = await session.get(Character, character_id)
    if invitee is not None:
        await void_account_vote_on_join(praxis, invitee, session, era)

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

    Any member, not the inviter alone (#1415): a collab is co-owned — ADR-0013
    gives ``created_by_id`` no powers and any member may already invite
    (:func:`invite_to_praxis`) and kick (:func:`kick_member`) — so "only the
    person who typed the name may untype it" would be the one asymmetric rule in
    the set, and it would make the roster's rescind control appear on some
    pending rows and not others with nothing on screen to explain why.

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

    # Membership is checked when a room socket opens, so a kicked member with a
    # composer already open would keep co-writing until they closed the tab. A
    # gate needs both doors (ADR-0073).
    close_member_sockets(praxis_id, member_id)

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
    # Same second door as a kick: leaving closes the room socket too (ADR-0073).
    close_member_sockets(praxis_id, character_id)
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


async def set_member_done(
    praxis_id: int,
    character_id: int,
    is_done: bool,
    session: AsyncSession,
) -> Praxis:
    """**Done** — "my part is finished" (ADR-0079). Per member, and reversible.

    Membership is the only gate (ADR-0013). There is deliberately **no** guard
    against marking Done on a solo or duel praxis: the flag gates nothing and
    starts nothing, so on a one-member praxis it is a no-op that no player can
    reach — the composer only draws the control for a crew — and a refusal would
    cost a new error code and a catalog entry to protect against nothing.
    ``ponytail:`` if a solo surface ever grows a Done control by accident, the
    upgrade is a coded 422 here rather than a second rule somewhere else.
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, "mark done on")
    await collab_consensus.mark_done(praxis, character_id, is_done, session)
    return await get_praxis(praxis_id, session)


async def submit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """**Propose**, then **Approve** — the two signals that publish (ADR-0079).

    On a collab: the first call opens the ``era.collab_auto_submit_days`` window
    and records the proposer as approved; later calls are approvals against that
    live proposal. Every member approved → Live now; silence for the whole window
    → Live anyway, via the lazy-on-access timeout. Solo and duel always have one
    member, so they publish immediately and never enter the window.

    See ``services.collab_consensus.on_submit`` for why one entry point carries
    both signals.
    """
    praxis = await get_praxis(praxis_id, session)

    member_ids = {m.character_id for m in praxis.members}
    if character_id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this praxis.")

    went_live = await collab_consensus.on_submit(praxis, character_id, session, era)
    if went_live:
        # Settle any duel BEFORE the stats recalc — the outcome feeds the duel
        # multiplier. Kept here rather than in collab_consensus so the whole
        # duel side effect of a submit reads in one place.
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
    and *un*marking moves the members' scores — which must not wait for the
    author's next unrelated vote to correct itself. The
    recalc is unconditional rather than gated on "did the scored-ness change":
    it is the same handful of queries the vote path already runs per vote, and
    an admin action is rare.

    A **duel side** also recalcs the *opponent* (#1442). A praxis ruled unscored
    cannot win its duel, which hands the other side the guaranteed-win modifier —
    and the opponent is not a member of this praxis, so nothing else would move
    their score until their own next edit. Same shape as the forfeit recalc in
    :func:`unsubmit_praxis`, for the same reason: the ruling changes what a second
    player is worth.

    It is also the one place a praxis enters or leaves ``hidden``, so it is where
    :func:`_apply_media_publication` keeps the disk in step (#1593).
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
    await _apply_media_publication(praxis, session)
    era_row = await get_era_row_for_praxis(praxis, session)
    await recalculate_members_stats(praxis, session, era, era_row=era_row)

    opponent_character_id = await _duel_opponent_character_id(praxis_id, session)
    if opponent_character_id is not None:
        await recalculate_character_stats(
            opponent_character_id, session, era, era_row=era_row
        )
        await session.flush()
    return await get_praxis(praxis_id, session)


async def _apply_media_publication(praxis: Praxis, session: AsyncSession) -> None:
    """Match this praxis's files on disk to its moderation status (#1593).

    ``/media`` is mounted unauthenticated, so "off the site entirely" — which is
    what ``models.praxis`` says ``hidden`` means — has to reach the filesystem or
    it is only true of the HTML. A hidden praxis's uploads move to a directory
    outside the mount; every other status moves them back.

    ``hidden`` **only**, deliberately. ``failed`` shares the unscored set
    (``UNSCORED_MODERATION_STATUSES``) but that set answers a scoring question:
    a failed praxis keeps its banner and its place in the feed, so withdrawing
    its media would break a praxis that is still meant to be displayed. The
    predicate here is the status itself, not that set.

    Stated as a total invariant rather than as two transitions: the else branch
    runs on every non-hidden moderation, and restoring what is not in quarantine
    costs a `stat` per file. That makes a re-hide, a half-completed withdrawal
    and a praxis whose files never existed all converge on the right disk
    instead of drifting.
    """
    stored_paths = list(
        (
            await session.execute(
                select(MediaItem.file_path).where(MediaItem.praxis_id == praxis.id)
            )
        )
        .scalars()
        .all()
    )
    if not stored_paths:
        return
    if praxis.moderation_status == ModerationStatus.hidden:
        withdraw_media_from_mount(stored_paths)
    else:
        restore_media_to_mount(stored_paths)


async def _duel_opponent_character_id(
    praxis_id: int, session: AsyncSession
) -> Optional[int]:
    """The other side's character in ``praxis_id``'s live duel, or None.

    None covers every "no second player to move" case: not a duel side, a duel
    already frozen at era close (``get_duel_for_praxis`` excludes ``resolved``, and
    ADR-0052 says a frozen outcome never recomputes), or a challenge with no
    opponent praxis yet.
    """
    duel = await get_duel_for_praxis(praxis_id, session)
    if duel is None:
        return None
    if duel.challenger_praxis_id == praxis_id:
        return duel.opponent_character_id
    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    return challenger_praxis.created_by_id if challenger_praxis else None
