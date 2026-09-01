"""Duel service — challenge flow for two-linked-praxes duels (ADR-0011).

A duel is two separate solo praxes linked by a Duel row. The Duel row owns
the lifecycle: pending → active (on accept) → settled (on both submit), or
pending → declined (on decline/cancel).

Voting opens when the Duel is settled (both praxes submitted). Votes target
each praxis directly; no per-member routing is needed.

This module owns the duel-id-keyed flow: challenge, respond, cancel, read.
The praxis-id-keyed surface (which duel is this praxis a side of, settle on
submit, discard on delete) lives in ``services.praxis_duel`` — a leaf, so
``services.praxis`` can reach it without the cycle this module's own
``get_praxis`` import creates (#2872).
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import DETAIL_CONTEXT_PARAM, ErrorCode, raise_coded
from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task
from schemas.duel import DuelDetailOut, DuelSideOut
from services.character_stats import recalculate_character_stats
from services.nudge import latest_nudge_at
from services.vote_tally import get_tally, tally_votes
from services.era import get_current_era_row, get_or_create_stats
from services.era_gates import may_create_duel
from services.praxis import get_praxis
from services.praxis_duel import get_duel_for_praxis
from services.signup_eligibility import (
    count_in_progress_praxes,
    is_active_member_of_task,
)


# One account may never hold both sides of a duel (ADR-0041, #1237). Shared by
# the challenge and the acceptance guard so the two read alike and cannot drift.
SELF_DUEL_DETAIL = "You cannot duel your own character."


async def _characters_share_account(
    first_character_id: int,
    second_character_id: int,
    session: AsyncSession,
) -> bool:
    """Whether two characters belong to the same ACCOUNT (ADR-0041).

    Anti-abuse is an account-level rule: one account owns many characters, so a
    duel between two of a player's own lives is self-dealing even though the two
    character ids differ. Same rule family — and the same shape — as
    ``services.vote._voter_account_owns_praxis`` / ``_voter_in_praxis_duel``,
    which both resolve through ``Character.account_id``.

    A missing character is *not* treated as a shared account: the callers each
    raise their own 404 for that case, and returning True here would answer with
    the wrong error.
    """
    if first_character_id == second_character_id:
        return True
    first = await session.get(Character, first_character_id)
    second = await session.get(Character, second_character_id)
    if first is None or second is None:
        return False
    return first.account_id == second.account_id


async def forfeit_settled_duels_for_character(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Forfeit every *settled* duel this character is a side of (ADR-0011 §Forfeit).

    The opponent wins by default. **Sticky**: a duel that already carries a
    ``forfeited_by_character_id`` is left exactly as it is — the first forfeit is
    the record, and the duel stays ``settled``.

    The winners are re-scored so their duel *win* modifier lands. The forfeiting
    character is deliberately **not** re-scored: their own score is never read on
    the losing side of a forfeit, and the two callers below are both ending or
    suspending that character's participation anyway.

    Called by both paths that reach ``status = banned``, which is the whole point
    of it living here rather than inside either one:

    * ``services.character.soft_delete_character`` — the player ends their own life.
    * ``services.admin_service.apply_ban`` — a moderator bans someone.

    ADR-0011 names only ``soft_delete_character`` in its trigger list, but the rule
    it states is "the ban / soft-delete of a side's character", and for a year the
    ban route implemented neither (#1577). The recalculation below is subtle enough
    that a second copy of it would drift, so there is one.
    """
    own_praxis_ids = select(Praxis.id).where(Praxis.created_by_id == character_id)
    duels = (await session.execute(
        select(Duel).where(
            Duel.status == DuelStatus.settled,
            Duel.forfeited_by_character_id.is_(None),
            or_(
                Duel.opponent_character_id == character_id,
                Duel.challenger_praxis_id.in_(own_praxis_ids),
            ),
        )
    )).scalars().all()

    winner_ids: set[int] = set()
    for duel in duels:
        duel.forfeited_by_character_id = character_id
        challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
        challenger_character_id = (
            challenger_praxis.created_by_id if challenger_praxis else None
        )
        winner_id = (
            duel.opponent_character_id
            if challenger_character_id == character_id
            else challenger_character_id
        )
        if winner_id is not None:
            winner_ids.add(winner_id)
    await session.flush()

    if winner_ids:
        era_row = await get_current_era_row(session)
        for winner_id in winner_ids:
            await recalculate_character_stats(winner_id, session, era, era_row=era_row)
        await session.flush()


async def get_duel(duel_id: int, session: AsyncSession) -> Duel:
    duel = await session.get(Duel, duel_id)
    if duel is None:
        raise HTTPException(status_code=404, detail="Duel not found.")
    return duel


async def get_duel_detail(
    duel_id: int,
    viewer: Optional[Character],
    session: AsyncSession,
) -> DuelDetailOut:
    """Read-oriented duel view for the praxis read page (#308).

    Returns both sides' display info + live vote points in one round trip.
    Never returns a praxis body — a forfeited or unsubmitted side still renders
    name/avatar but ``is_submitted`` is False.

    ``viewer`` is still taken: it keys the per-side nudge state below. It no
    longer yields a ``viewer_is_participant`` flag (#1387) — anti-self-voting is
    enforced server-side at the account level (ADR-0041) and no client read it.
    """
    duel = await get_duel(duel_id, session)

    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    opponent_praxis = (
        await session.get(Praxis, duel.opponent_praxis_id)
        if duel.opponent_praxis_id is not None
        else None
    )
    challenger_character = (
        await session.get(Character, challenger_praxis.created_by_id)
        if challenger_praxis is not None
        else None
    )
    opponent_character = await session.get(Character, duel.opponent_character_id)

    praxis_ids = [
        pid
        for pid in (duel.challenger_praxis_id, duel.opponent_praxis_id)
        if pid is not None
    ]
    tallies = await tally_votes(praxis_ids, session)

    # Viewer-relative nudge state (#1083), keyed per side because the rate limit
    # is (sender, recipient, praxis) and each side is its own praxis. Two point
    # lookups rather than a map: a duel has exactly two rows.
    async def _nudged_at(
        character: Optional[Character], praxis_id: Optional[int]
    ) -> Optional[datetime]:
        if viewer is None or character is None or praxis_id is None:
            return None
        return await latest_nudge_at(praxis_id, viewer.id, character.id, session)

    challenger_nudged_at = await _nudged_at(
        challenger_character, duel.challenger_praxis_id
    )
    opponent_nudged_at = await _nudged_at(opponent_character, duel.opponent_praxis_id)

    def _side(
        character: Optional[Character],
        praxis: Optional[Praxis],
        praxis_id: Optional[int],
        nudged_at: Optional[datetime] = None,
    ) -> DuelSideOut:
        return DuelSideOut(
            praxis_id=praxis_id,
            character_id=character.id if character is not None else 0,
            display_name=character.display_name if character is not None else "",
            faction_slug=(
                (character.faction_slug or UNAFFILIATED_FACTION_SLUG)
                if character is not None
                else UNAFFILIATED_FACTION_SLUG
            ),
            avatar_url=character.avatar_url if character is not None else "",
            points_from_votes=(
                get_tally(tallies, praxis_id).points_from_votes if praxis_id is not None else 0
            ),
            is_submitted=praxis is not None and praxis.status == PraxisStatus.submitted,
            nudged_at=nudged_at,
        )

    return DuelDetailOut(
        id=duel.id,
        task_id=duel.task_id,
        status=duel.status,
        forfeited_by_character_id=duel.forfeited_by_character_id,
        challenger=_side(
            challenger_character,
            challenger_praxis,
            duel.challenger_praxis_id,
            challenger_nudged_at,
        ),
        opponent=_side(
            opponent_character,
            opponent_praxis,
            duel.opponent_praxis_id,
            opponent_nudged_at,
        ),
        winner_character_id=duel.winner_character_id,
        challenger_final_points=duel.challenger_final_points,
        opponent_final_points=duel.opponent_final_points,
    )


async def issue_duel_challenge(
    challenger_character_id: int,
    challenger_praxis_id: int,
    opponent_character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> tuple[Praxis, Duel]:
    """Attach a duel challenge to the challenger's existing in_progress praxis.

    The challenger signs up solo first, then attaches an opponent (ADR-0011).
    This does NOT create a praxis — it loads the challenger's existing one and
    creates only the pending Duel row pointing at it. The opponent must not
    already have an active praxis for this task (Everymen exempt); challenger
    and opponent cannot belong to the same ACCOUNT (ADR-0041) — comparing
    character ids alone let an account duel its own alt (#1237).
    """
    if await _characters_share_account(
        challenger_character_id, opponent_character_id, session
    ):
        raise_coded(400, ErrorCode.duel_self_challenge, SELF_DUEL_DETAIL)

    # A plain read (#2874): the guards below refuse anything that is not a
    # ``solo`` praxis, and the consensus window only ever opens on a collab, so
    # settling here could not change a single outcome.
    challenger_praxis = await get_praxis(challenger_praxis_id, session)
    if challenger_praxis.created_by_id != challenger_character_id:
        raise_coded(403, ErrorCode.praxis_not_owner, "You do not own this praxis.")
    if challenger_praxis.status != PraxisStatus.in_progress:
        raise_coded(
            422,
            ErrorCode.duel_requires_in_progress_praxis,
            "A duel can only start from an in-progress praxis.",
        )
    # A duel side is a solo praxis (ADR-0011); duel and collab are mutually exclusive.
    if challenger_praxis.type != PraxisType.solo:
        raise_coded(
            422,
            ErrorCode.duel_requires_solo_praxis,
            "Only a solo praxis can issue a duel challenge.",
        )
    if await get_duel_for_praxis(challenger_praxis_id, session) is not None:
        raise_coded(
            409, ErrorCode.duel_already_exists, "This praxis is already part of a duel."
        )

    task = await session.get(Task, challenger_praxis.task_id)
    if task is None:
        raise_coded(404, ErrorCode.task_not_found, "Task no longer exists.")

    opponent = await session.get(Character, opponent_character_id)
    if opponent is None:
        raise_coded(
            404, ErrorCode.character_not_found, "Opponent character not found."
        )

    # Opponent eligibility: must not already have an active praxis for this task.
    # `era` is threaded through because the predicate carries the Double Dipper
    # carve-out (#1511); dropping it silently resolved against CURRENT_ERA no
    # matter what this function was passed.
    if await is_active_member_of_task(opponent, task, session, era):
        raise_coded(
            409,
            ErrorCode.duel_opponent_has_active_praxis,
            "The opponent already has an active praxis for this task.",
        )

    # Challenger must meet duel level requirement — one statement of it, in
    # ``services.era_gates`` (#2868), shared with the accept site below. No
    # admin or faction bypass exists for duels, so ``is_admin`` is False and
    # ``faction_slug`` is None (the predicate reads neither).
    era_row = await get_current_era_row(session)
    challenger_stats = await get_or_create_stats(session, challenger_character_id, era_row.id)
    if not may_create_duel(challenger_stats.level, None, False, era):
        raise_coded(
            403,
            ErrorCode.duel_level_too_low,
            f"Duels require level {era.duel_level_required}.",
            {"level": era.duel_level_required},
        )

    # Create only the pending Duel row, pointing at the existing praxis.
    duel = Duel(
        task_id=challenger_praxis.task_id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=opponent_character_id,
        status=DuelStatus.pending,
    )
    session.add(duel)
    await session.flush()

    return challenger_praxis, duel


async def respond_to_duel_challenge(
    duel_id: int,
    character_id: int,
    accept: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> tuple[Optional[Praxis], Duel]:
    """Accept or decline a duel challenge.

    Accept: creates the opponent's solo praxis and transitions Duel → active.
    Decline: transitions Duel → declined. Challenger's praxis remains as a
    plain solo praxis (convert-to-solo; no data loss).

    Returns (opponent_praxis_or_None, updated_duel).
    """
    duel = await get_duel(duel_id, session)

    if duel.opponent_character_id != character_id:
        raise_coded(
            403, ErrorCode.duel_challenge_not_yours, "This challenge is not for you."
        )

    if duel.status != DuelStatus.pending:
        raise_coded(
            400,
            ErrorCode.duel_challenge_already_resolved,
            "Challenge has already been resolved.",
        )

    now = datetime.now(timezone.utc)

    if not accept:
        duel.status = DuelStatus.declined
        duel.declined_at = now
        await session.flush()
        return None, duel

    opponent = await session.get(Character, character_id)
    if opponent is None:
        raise_coded(404, ErrorCode.character_not_found, "Character not found.")

    # Account-level self-duel guard (ADR-0041, #1237). The invitation check above
    # only proves the responder is the invited *character*; it says nothing about
    # whose account that character sits on. Without this, an account that had a
    # pending challenge against its own alt could accept it and then forfeit one
    # side for a deterministic win (ADR-0052 decides a forfeit ahead of points).
    #
    # Deliberately on the ACCEPT path only: declining stays open — as does
    # :func:`cancel_duel_challenge` — so a same-account challenge that predates
    # this guard can still be dissolved rather than being stuck pending forever.
    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    if challenger_praxis is not None and await _characters_share_account(
        challenger_praxis.created_by_id, character_id, session
    ):
        raise_coded(400, ErrorCode.duel_self_challenge, SELF_DUEL_DETAIL)

    task = await session.get(Task, duel.task_id)
    if task is None:
        raise_coded(404, ErrorCode.task_not_found, "Task no longer exists.")

    # Opponent must still be eligible (they could have signed up for the task
    # in the window between challenge and accept). `era` threaded for the same
    # reason as in `issue_duel_challenge` above (#1511).
    if await is_active_member_of_task(opponent, task, session, era):
        raise_coded(
            409,
            ErrorCode.task_already_active_member,
            "You already have an active praxis for this task.",
            {DETAIL_CONTEXT_PARAM: "duel"},
        )

    # Opponent bank cap check.
    in_progress_count = await count_in_progress_praxes(character_id, session)
    if in_progress_count >= era.max_task_signups:
        raise_coded(
            400,
            ErrorCode.task_bank_full,
            f"Task bank is full ({era.max_task_signups} in-progress praxis).",
            {"limit": era.max_task_signups},
        )

    # Opponent level check.
    # ponytail: deliberately just the flat era.duel_level_required floor — no
    # meets_task_level / task.level_required check here. A duel is meant to be
    # a reach above your own level, so acceptance is a carve-out from the
    # shared task-level gate that solo, collab, and duel-initiation share
    # (#292). Do not add a task-level check here without revisiting ADR-0051.
    era_row = await get_current_era_row(session)
    opponent_stats = await get_or_create_stats(session, character_id, era_row.id)
    if not may_create_duel(opponent_stats.level, None, False, era):
        raise_coded(
            403,
            ErrorCode.duel_level_too_low,
            f"Duels require level {era.duel_level_required}.",
            {"level": era.duel_level_required},
        )

    # Create the opponent's solo praxis.
    opponent_praxis = Praxis(
        task_id=duel.task_id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        body_text="",
        moderation_status=ModerationStatus.visible,
        created_by_id=character_id,
    )
    session.add(opponent_praxis)
    await session.flush()

    opponent_member = PraxisMember(
        praxis_id=opponent_praxis.id,
        character_id=character_id,
        has_submitted=False,
    )
    session.add(opponent_member)
    await session.flush()

    duel.opponent_praxis_id = opponent_praxis.id
    duel.status = DuelStatus.active
    duel.accepted_at = now
    await session.flush()

    # A plain read: this praxis was created three statements ago, so it has no
    # window to settle.
    loaded_praxis = await get_praxis(opponent_praxis.id, session)
    return loaded_praxis, duel


async def cancel_duel_challenge(
    duel_id: int,
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Duel:
    """Dissolve a pending *or* active duel — any participant may (ADR-0011 §Forfeit grill).

    Transitions Duel → declined; both sides remain plain ``type=solo`` praxes
    (convert-to-solo, no penalty). "If they don't want it to be a duel, it
    becomes a single task for both parties." An *active* duel may already have a
    submitted side scored with the duel multiplier, so both participants are
    recalculated to revert to plain-solo scoring.
    """
    duel = await get_duel(duel_id, session)

    if duel.status not in (DuelStatus.pending, DuelStatus.active):
        raise HTTPException(status_code=400, detail="Duel has already been resolved.")

    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    challenger_character_id = (
        challenger_praxis.created_by_id if challenger_praxis is not None else None
    )
    if character_id not in (challenger_character_id, duel.opponent_character_id):
        raise HTTPException(status_code=403, detail="Only a duel participant can end it.")

    duel.status = DuelStatus.declined
    duel.declined_at = datetime.now(timezone.utc)
    await session.flush()

    # An active duel may have a submitted side scored with the duel multiplier;
    # recalc both participants so they revert to plain-solo scoring.
    era_row = await get_current_era_row(session)
    for participant_id in {challenger_character_id, duel.opponent_character_id}:
        if participant_id is not None:
            await recalculate_character_stats(
                participant_id, session, era, era_row=era_row
            )
    await session.flush()
    return duel
