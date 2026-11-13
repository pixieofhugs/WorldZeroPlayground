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
from models.character_stats import CharacterStats
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
from services.era_gates import may_create_collab_praxis
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
    # Re-exported for existing callers; defined in signup_eligibility.
    SIGNUP_REASON_MULTI_MEMBERSHIP,  # noqa: F401 - re-export, see comment above
    SignupDenialReason,
    allowed_praxis_modes,
    count_in_progress_praxes,
    evaluate_signup,
    gather_signup_facts,
    is_active_member_of_task,
    meets_task_level,
)
from services.vote import void_account_vote_on_join


def _require_member(praxis: Praxis, character_id: int, action: str) -> None:
    """403 unless ``character_id`` is a member of ``praxis`` (ADR-0013 co-ownership).

    The one "not a member" wording (#2875). Private: outside callers use the
    ``*_for_member`` loaders.
    """
    if character_id not in {m.character_id for m in praxis.members}:
        raise HTTPException(status_code=403, detail=f"Only a member can {action} this praxis.")


async def get_praxis(praxis_id: int, session: AsyncSession) -> Praxis:
    """Get a praxis by id with detail-view relationships eager-loaded. **A read.**

    Moves no state, unlike :func:`get_praxis_settling_consensus` (#2874). Use
    this unless the answer depends on a lapsed pending-publish window, and for
    every ``return await get_praxis(...)`` tail.

    Loads ``invites`` and ``media_items`` for ``build_praxis_out``. Deletion
    doesn't need them (FKs cascade, ``passive_deletes``); beware that loaded
    ``media_items`` (no delete-orphan) makes ``session.delete`` write NULL into
    a NOT NULL column. See ``MediaItem.praxis_id``.
    """
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(Praxis.id == praxis_id)
    )
    praxis = result.scalar_one_or_none()
    if praxis is None:
        # Coded (#2875): clients branch on it.
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    return praxis


async def get_praxis_settling_consensus(
    praxis_id: int, session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> Praxis:
    """:func:`get_praxis`, then ADR-0012's lazy-on-access seal. **This one writes.**

    No scheduler: a lapsed window is noticed only on access, here (and per row in
    ``list_praxes``). Use where the answer depends on real published-ness. Call
    **once** per request, at the head; the seal makes repeats no-ops.
    """
    praxis = await get_praxis(praxis_id, session)
    await collab_consensus.settle_if_window_lapsed(praxis, session, era)
    return praxis


async def get_praxis_for_member(
    praxis_id: int, character_id: int, action: str, session: AsyncSession
) -> Praxis:
    """:func:`get_praxis`, then ADR-0013's membership gate. **A read.**

    The mutation prologue as one call (#2875). ``action`` completes "Only a
    member can ``…`` this praxis." Use the settling variant when the answer
    depends on a lapsed window (#2874).
    """
    praxis = await get_praxis(praxis_id, session)
    _require_member(praxis, character_id, action)
    return praxis


async def get_praxis_settling_consensus_for_member(
    praxis_id: int,
    character_id: int,
    action: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """:func:`get_praxis_settling_consensus`, then the membership gate. **Writes.**

    Call once, at the head of the path.
    """
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)
    _require_member(praxis, character_id, action)
    return praxis


class PraxisSort(str, Enum):
    """Feed orderings for the ``status=submitted`` praxis feed (#658).

    ``newest``/``oldest`` use ``submitted_at`` (filing time), not ``created_at``.
    ``most_voted``/``least_voted`` (#1362) use a correlated ``COUNT`` over
    ``Vote`` (``voter_count`` is computed post-fetch), with a mandatory
    ``submitted_at DESC`` tiebreak so the growing feed window doesn't shuffle.
    """

    newest = "newest"
    oldest = "oldest"
    most_voted = "most_voted"
    least_voted = "least_voted"


class PraxisEraScope(str, Enum):
    """Which era's praxes a praxis list shows (#1362).

    No ``era_id`` column: ``this_era`` bounds by ``submitted_at >= Era.started_at``.
    Unsealed drafts pass both scopes. Read-side only; past-era praxes stay
    votable (#1345).
    """

    this_era = "this_era"
    all_eras = "all_eras"


class VotedFilter(str, Enum):
    """Account-scoped vote filter for the submitted feed (#644 §6).

    ``yes``: the viewer's account voted. ``no``: *needs my vote* — unvoted and
    not co-owned by the account (ADR-0013 anti-self-vote), so not complements.
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
    # The row whose reveal flag decides ?faction=albescent (#2422).
    viewer_account: Optional[Account] = None,
    # Admins count as revealed (#2400).
    viewer_is_admin: bool = False,
    # Admin finder (#3061). Never expose outside ``require_admin``.
    include_unlisted: bool = False,
    limit: int = 50,
    offset: int = 0,
    era: EraConfig = CURRENT_ERA,
) -> list[Praxis]:
    """List praxes with optional filters.

    ``in_progress`` is member-only (ADR-0024); ``viewer_id`` adds own drafts.

    ``character_id``: profile grid (#1112) — membership, default ``submitted``.
    ``member_id``: raw membership, no status default (sidebar). Both use
    :func:`praxis_membership_condition`, shared with the slot count.

    ``search``: ``ilike`` over title, body, task title and any member's
    handle/display name (#681); leading ``@`` dropped for names (#624).

    ``faction``: ORed slugs; empty = no filter (#1362). ``sort`` applies only to
    the submitted feed. ``voted`` needs ``viewer_account_id`` (#644 §6).

    ``include_unlisted`` (#3061, ``GET /admin/praxes`` only) lifts the viewer
    gate and the hidden exclusion, nothing else.
    """
    query = select(Praxis)
    if not include_unlisted:
        query = query.where(praxis_visibility_condition(viewer_id))

    # Joined once for both faction and search.
    query = query.join(Task, Praxis.task_id == Task.id)

    # Praxis inherits the task's faction. Same helper as task browse (#1975, #2422).
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
            # Any member (#681). `IN (subquery)`, not a join, to avoid duplicate rows.
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
        # Any character on the viewer's account counts.
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
            # Exclude co-owned praxes: never votable (ADR-0013).
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

    # Hidden is excluded unconditionally; the ungated filter may only narrow, so
    # ?moderation_status=hidden yields an empty page (not a 422, which would leak
    # existence). ``include_unlisted`` is admin-only (#3061).
    if not include_unlisted:
        query = query.where(Praxis.moderation_status != ModerationStatus.hidden)
    if moderation_status is not None:
        try:
            query = query.where(
                Praxis.moderation_status == ModerationStatus(moderation_status)
            )
        except ValueError:
            # Unparseable: drop the caller's filter only.
            pass

    if task_id is not None:
        query = query.where(Praxis.task_id == task_id)

    if character_id is not None:
        # Profile grid (#1112): membership for every status (ADR-0013); defaults
        # to submitted. An explicit status wins (task detail finds own draft).
        query = query.where(praxis_membership_condition(character_id))
        if status is None:
            status = PraxisStatus.submitted

    if member_id is not None:
        query = query.where(praxis_membership_condition(member_id))

    if status is not None:
        query = query.where(Praxis.status == status)

    if status == PraxisStatus.submitted:
        # Invariant (``_apply_seal``): submitted ⟹ submitted_at set; corrupt rows
        # are hidden. Only here: drafts have NULL by definition. Also keeps the
        # sort free of NULLS-FIRST traps.
        query = query.where(Praxis.submitted_at.isnot(None))

    if era_scope == PraxisEraScope.this_era:
        era_row = await get_current_era_row_safe(session)
        # Unseeded era: fall through unscoped rather than return nothing.
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
            # See PraxisSort.
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
        # id tiebreak keeps pages disjoint on created_at ties (#3061).
        order = (Praxis.created_at.desc(), Praxis.id.desc())
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

    Every branch is coded (#1401); returns rather than raises, hence ``coded_error``.
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
        # The status word doubles as the catalog context.
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
) -> tuple[Task, CharacterStats]:
    """Raise HTTPException unless this character may create ``praxis_type`` for ``task_id``.

    Returns the task and the stats row the gates judged, so the caller needn't
    re-read (#2873).
    """
    task = await session.get(Task, task_id)
    # Deleted tasks (#3305) look nonexistent.
    if task is None or task.status == TaskStatus.deleted:
        raise HTTPException(status_code=404, detail="Task not found.")

    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    # One read of sign-up facts, shared by both gates and the level-jump stamp
    # (#2873); read here, after the caller's advisory lock.
    facts = await gather_signup_facts(character, [task_id], session, era)

    # One predicate, shared with the can_sign_up flag.
    eligibility = await evaluate_signup(character, task, session, era, facts=facts)
    if not eligibility.allowed:
        raise _signup_denial_to_http(eligibility.reason, task, era)

    # Mode-specific gates stay here (single-sourced via allowed_praxis_modes).
    if praxis_type == PraxisType.duel:
        raise HTTPException(
            status_code=400,
            detail="Duels are issued via the challenge endpoint, not direct praxis creation (ADR-0011).",
        )

    allowed = allowed_praxis_modes(character, facts.stats.level, era)
    if praxis_type not in allowed:
        # Only collab has its own prose.
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

    return task, facts.stats


#: Advisory-lock namespace (the lock space is global across the DB).
#: ponytail: ``(int4, int4)`` form assumes character ids < 2^31; past that use
#: the int8 form with the namespace in the high half.
_SIGNUP_LOCK_NAMESPACE = 0x5A19


async def _lock_signups_for_character(character_id: int, session: AsyncSession) -> None:
    """Serialise one character's task signups for the rest of this transaction.

    The preconditions are read-then-write and the "one active membership per
    task" rule spans tables, so no unique index can enforce it. Seen in prod: one
    tap made four praxes in 110ms. Advisory, not ``FOR UPDATE``: it serialises a
    multi-table decision without row contention; per character; released at
    transaction end.

    ponytail: no client in-flight guard (four ``handleSignup`` copies); the
    server must refuse anyway. Add it if the wasted round-trips matter.
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

    Gates are read-then-write; see :func:`_lock_signups_for_character`.
    """
    await _lock_signups_for_character(character_id, session)

    task, stats = await _check_create_preconditions(
        task_id, praxis_type, character_id, session, era
    )

    # #811: allowed but above level ⟹ the jump let it in; stamp it, never refunded.
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
    # Reload so build_praxis_out avoids lazy='raise'.
    return await get_praxis(praxis.id, session)


# No text write here: title/body are written only by the room
# (``praxis_room.py``, ADR-0073), which also triggers ADR-0012's hard reset via
# ``collab_consensus.on_room_edit`` (ADR-0079). Media edits and Withdraw use
# ``on_member_edit``.


async def unsubmit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Withdraw a proposal, or reopen a published praxis. Any member may act
    (ADR-0013). #590, ADR-0079.

    - ``submitted``: reopen for everyone. Votes kept but unscored; approvals
      clear. A settled duel side forfeits permanently (ADR-0011 §Forfeit).
    - ``pending``: Withdraw proposal — same as an edit. Unscored, no recalc.
    - ``in_progress``: 422.
    """
    # Settles: a lapsed window must read as submitted, not pending.
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character_id, "reopen", session, era
    )

    # Withdraw is a group cancellation, same as a keystroke (ADR-0079).
    if praxis.status == PraxisStatus.pending:
        await collab_consensus.on_member_edit(praxis, session, era)
        return await get_praxis(praxis_id, session)

    if praxis.status != PraxisStatus.submitted:
        raise HTTPException(status_code=422, detail="Praxis is already in editing mode.")

    # #307: first forfeit sticks; the winner is recalculated below.
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
    # The room reseeds from body_text on first connect (ADR-0073 rule 7).

    # Every member, in the era the praxis was sealed in (#1345).
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

    Preserves content, id and media. Must be editable; a duel side must
    dissolve first; ``collab`` needs the level. Duels aren't a target (ADR-0011).

    ``collab → solo`` is a deliberate **takeover**: the actor becomes sole owner;
    other members and invites are dropped.
    """
    if new_type not in (PraxisType.solo, PraxisType.collab):
        raise HTTPException(
            status_code=400, detail="Can only switch between solo and collab."
        )

    # Settles: a lapsed collab is published and must not be retyped.
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character_id, "change the mode of", session, era
    )
    if praxis.status not in (PraxisStatus.in_progress, PraxisStatus.pending):
        raise HTTPException(
            status_code=422, detail="Can only change mode while the praxis is in editing."
        )
    if praxis.type == new_type:
        return praxis

    if await get_duel_for_praxis(praxis_id, session) is not None:
        raise HTTPException(
            status_code=409, detail="End the duel before changing this praxis's mode."
        )

    if new_type == PraxisType.collab:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character_id, era_row.id)
        # Same gate as creation (#2868); no bypass.
        if not may_create_collab_praxis(stats.level, None, False, era):
            raise_coded(
                403,
                ErrorCode.collaboration_level_too_low,
                f"Collaborations require level {era.collaboration_level_required}.",
                {"level": era.collaboration_level_required},
            )
        praxis.type = PraxisType.collab
    else:
        # Shared with ADR-0060's involuntary conversion; the takeover is the
        # actor as owner.
        await collab_consensus.convert_to_solo(praxis, character_id, session, era)

    # Unscored here, so no recalc (ADR-0060 recalcs at its own site).
    await session.flush()
    return await get_praxis(praxis_id, session)


async def delete_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Delete a praxis. Creator only. Must be in_progress.

    A dissolved duel side is deletable (#1831); see
    :func:`services.praxis_duel.discard_dissolved_duels_for_praxis`.
    """
    # Settles: status guard below.
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)
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

    So batches append; gaps are harmless.
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

    Caller must load via ``get_praxis_settling_consensus_for_member`` first
    (batch-wide verdicts before any byte is written).

    Partial success: one result per upload, in request order. ``display_order``
    follows request position, appended. A successful batch cancels a pending
    publish once (ADR-0012); an all-rejected batch doesn't.
    """
    display_order = await _next_media_display_order(praxis.id, session)
    results: List[MediaUploadResultOut] = []
    saved_count = 0

    for upload in uploads:
        # Client-supplied name: failures are reported by what the player picked.
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
                    # Not str(): coded bodies (#1401) would render a dict repr.
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

    Same caller contract as :func:`add_media_batch`, plus ``media_item`` belongs
    to the praxis. Paths go through ``resolve_stored_media_path`` (never a bare
    join); ``None`` means nothing on disk, and the row removal still succeeds.
    """
    abs_path = resolve_stored_media_path(media_item.file_path)
    if abs_path is not None:
        try:
            os.remove(abs_path)
        except OSError:
            pass
        # rmdir refuses non-empty (pre-#1336 shared) directories.
        try:
            os.rmdir(os.path.dirname(abs_path))
        except OSError:
            pass

    await session.delete(media_item)
    await session.flush()
    # Cancels a pending publish (ADR-0012).
    await collab_consensus.on_member_edit(praxis, session, era)


async def can_view_praxis(
    viewer: Optional[Character], praxis: Praxis, session: AsyncSession
) -> bool:
    """Whether ``viewer`` may see ``praxis`` (ADR-0024).

    - ``hidden`` → admins only (#3257), this detail door only; lists still exclude it.
    - ``submitted`` → public, except an unsealed duel side (author-only, #999).
    - ``in_progress`` → members only (character-scoped).

    Uses the same :func:`duel_side_hidden_condition` as the feed.
    """
    if praxis.moderation_status == ModerationStatus.hidden:
        # Local import: dependencies imports services at module load.
        from dependencies import account_has_admin_role

        return viewer is not None and await account_has_admin_role(
            viewer.account_id, session
        )
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

    Joins via ``Character.account_id`` (no extra column). Also used for comments.
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


class FlagDenialReason(str, Enum):
    """Why a viewer may not flag a praxis (#328). The four rules, one each."""

    hidden = "hidden"
    own_praxis = "own_praxis"
    already_flagged = "already_flagged"
    below_level = "below_level"


async def _flag_denial(
    viewer: Character,
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig,
) -> Optional[FlagDenialReason]:
    """The one evaluation of #328's rules; ``None`` means the flag is allowed.

    Shared by :func:`can_flag_praxis` and :func:`flag_praxis` (#2875). Order
    matters: specific refusals before the generic level one.
    """
    # #3257: flagging hidden content would put it back on the public list.
    if praxis.moderation_status == ModerationStatus.hidden:
        return FlagDenialReason.hidden
    author_account_id = await _praxis_author_account_id(praxis, session)
    if author_account_id is not None and author_account_id == viewer.account_id:
        return FlagDenialReason.own_praxis
    if await account_already_flagged(viewer.account_id, session, praxis_id=praxis.id):
        return FlagDenialReason.already_flagged
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)
    if stats.level < era.flag_level_required:
        return FlagDenialReason.below_level
    return None


async def can_flag_praxis(
    viewer: Optional[Character],
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Return True if ``viewer`` may flag ``praxis``.

    Same rules as :func:`flag_praxis` via :func:`_flag_denial` (#328), plus
    anonymous → False.
    """
    if viewer is None:
        return False
    return await _flag_denial(viewer, praxis, session, era) is None


async def flag_praxis(
    praxis_id: int,
    flagged_by: Character,
    reason: FlagReason,
    session: AsyncSession,
    reason_detail: Optional[str] = None,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Flag a praxis for moderation review. Requires ``era.flag_level_required`` or above."""
    # Settles: the response shows the praxis (ADR-0012 seal on access).
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)

    denial = await _flag_denial(flagged_by, praxis, session, era)
    if denial is FlagDenialReason.hidden:
        raise_coded(404, ErrorCode.praxis_not_found, "Praxis not found.")
    if denial is FlagDenialReason.own_praxis:
        # Account-scoped anti-self-flag (#328).
        raise HTTPException(status_code=403, detail="Cannot flag your own praxis.")
    if denial is FlagDenialReason.already_flagged:
        # One flag per account per praxis (#328).
        raise HTTPException(
            status_code=409, detail="Your account has already flagged this praxis."
        )
    if denial is FlagDenialReason.below_level:
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


async def invite_to_praxis(
    praxis_id: int,
    invitee_id: int,
    inviter_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> PraxisInvite:
    """Create a collab invite. Praxis must be collab type. Inviter must be a member.

    The invitee isn't held to sign-up eligibility: cross-level/faction invites
    are a deliberate Easter egg (#1511). Which gates lift is era-owned
    (``collab_invite_bypasses_level``/``_faction``); the task bank is charged on
    accept. Never lifted: one active membership per task (data integrity).
    """
    # Settles: status guard below.
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)

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

    # After the type/status guards on purpose: keeps the refusal outsiders see.
    _require_member(praxis, inviter_id, "invite to")

    if invitee_id == inviter_id:
        raise_coded(400, ErrorCode.invite_self, "Cannot invite yourself.")
    if invitee_id in {member.character_id for member in praxis.members}:
        raise_coded(
            409, ErrorCode.invite_already_member, "Player is already a member."
        )

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

    if not era.collab_invite_bypasses_level:
        era_row = await get_current_era_row(session)
        invitee_stats = await get_or_create_stats(session, invitee.id, era_row.id)
        # ponytail: no level-jump (#811) at the invite door; to add, pass
        # available_level_reach here and consume_level_jump on accept.
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

    The task bank is charged here, not at invite time: the bank may have
    changed since (#1511).
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

    member = PraxisMember(
        praxis_id=praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(member)

    # #2216: void a pre-invite vote rather than refuse the accept. Before the
    # flush, so praxis.members is still the set the vote scored.
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

    Any member, not just the inviter (#1415, ADR-0013 co-ownership).
    Outsiders, including the invitee, get 403; the invitee declines instead.
    """
    # Plain read: no status guard, 204 response.
    praxis = await get_praxis_for_member(
        praxis_id, requester_id, "rescind an invite to", session
    )

    invite = next(
        (candidate for candidate in praxis.invites if candidate.id == invite_id), None
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found.")

    if invite.status != PraxisInviteStatus.pending:
        raise HTTPException(status_code=409, detail="Only a pending invite can be rescinded.")

    # Via the delete-orphan collection so the in-memory list stays consistent.
    praxis.invites.remove(invite)
    await session.flush()


async def kick_member(
    praxis_id: int,
    member_id: int,
    requester_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Remove a member. Any member may kick another (incl. the creator); not self (ADR-0013).

    Only while open: a kick resets the group to drafting and would silently
    unpublish. Leaving has no such restriction (ADR-0012).
    """
    # Settles: status guard below.
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, requester_id, "kick from", session, era
    )

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

    # Via the collection: the route reuses this praxis for its response.
    praxis.members.remove(kickee_member)

    # Open sockets would otherwise keep co-writing (ADR-0073).
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

    Unlike a kick, leaving doesn't reset others' submissions; it can make the collab
    Live.
    """
    # Settles: else on_member_leave could cancel a consensus silence already carried.
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)
    # Type check before membership on purpose (see invite_to_praxis).
    if praxis.type != PraxisType.collab:
        raise HTTPException(status_code=400, detail="Only collab memberships can be left.")
    _require_member(praxis, character_id, "leave")

    leaver = next(m for m in praxis.members if m.character_id == character_id)
    praxis.members.remove(leaver)
    # ADR-0073: close the room socket too.
    close_member_sockets(praxis_id, character_id)
    await session.flush()

    await collab_consensus.on_member_leave(praxis, session, era)

    # In the praxis's era (#1345).
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
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """**Done** — "my part is finished" (ADR-0079). Per member, and reversible.

    Membership is the only gate (ADR-0013); on solo/duel it's a harmless no-op.
    ``ponytail:`` if a solo surface ever shows Done, add a coded 422 here.
    """
    # Settles: the only load on the path, and the praxis is returned.
    praxis = await get_praxis_settling_consensus_for_member(
        praxis_id, character_id, "mark done on", session, era
    )
    await collab_consensus.mark_done(praxis, character_id, is_done, session)
    return await get_praxis(praxis_id, session)


async def submit_praxis(
    praxis_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """**Propose**, then **Approve** — the two signals that publish (ADR-0079).

    Collab: first call opens the ``collab_auto_submit_days`` window; later calls
    approve. All approved, or the window lapses → Live. Solo/duel publish at once.
    See ``collab_consensus.on_submit``.
    """
    # Plain read on purpose (#2874): settling first would seal twice (double
    # taunts, habit re-stamp, new submitted_at). The settling read below seals.
    praxis = await get_praxis_for_member(praxis_id, character_id, "submit", session)

    went_live = await collab_consensus.on_submit(praxis, character_id, session, era)
    if went_live:
        # Before the recalc: the outcome feeds the duel multiplier.
        await maybe_settle_duel(praxis_id, session)
        await recalculate_members_stats(praxis, session, era)
    return await get_praxis_settling_consensus(praxis_id, session, era)


async def moderate_praxis(
    praxis_id: int,
    new_status: str,
    admin_note: Optional[str],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    """Admin moderation: update moderation_status and admin_note.

    Every transition recalcs members (#1373; unconditional, admin actions are
    rare) and, for a duel side, the opponent (#1442). Also the one place a
    praxis enters/leaves ``hidden``, so it syncs the disk (#1593).
    """
    # Settles: this writes scores, so a lapsed collab must count as published.
    praxis = await get_praxis_settling_consensus(praxis_id, session, era)

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

    ``/media`` is unauthenticated, so ``hidden`` must reach the filesystem.
    ``hidden`` only: ``failed`` stays displayed. A total invariant (restore runs
    on every non-hidden status), so partial states converge.
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

    None for non-duels, frozen duels (ADR-0052), or no opponent praxis yet.
    """
    duel = await get_duel_for_praxis(praxis_id, session)
    if duel is None:
        return None
    if duel.challenger_praxis_id == praxis_id:
        return duel.opponent_character_id
    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    return challenger_praxis.created_by_id if challenger_praxis else None
