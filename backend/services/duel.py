"""Duel service — challenge flow for two-linked-praxes duels (ADR-0011).

A duel is two separate solo praxes linked by a Duel row. The Duel row owns
the lifecycle: pending → active (on accept) → settled (on both submit), or
pending → declined (on decline/cancel).

Voting opens when the Duel is settled (both praxes submitted). Votes target
each praxis directly; no per-member routing is needed.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
from schemas.duel import DuelDetailOut, DuelOut, DuelSideOut
from services.character_stats import recalculate_character_stats
from services.vote_tally import get_tally, tally_votes
from services.era import get_current_era_row, get_or_create_stats
from services.praxis import (
    _count_in_progress_praxes,
    get_praxis,
    is_active_member_of_task,
)


def _build_duel_out(duel: Duel) -> DuelOut:
    return DuelOut(
        id=duel.id,
        task_id=duel.task_id,
        challenger_praxis_id=duel.challenger_praxis_id,
        opponent_character_id=duel.opponent_character_id,
        opponent_praxis_id=duel.opponent_praxis_id,
        status=duel.status,
        accepted_at=duel.accepted_at,
        declined_at=duel.declined_at,
        created_at=duel.created_at,
    )


async def get_duel(duel_id: int, session: AsyncSession) -> Duel:
    duel = await session.get(Duel, duel_id)
    if duel is None:
        raise HTTPException(status_code=404, detail="Duel not found.")
    return duel


async def get_duel_for_praxis(praxis_id: int, session: AsyncSession) -> Optional[Duel]:
    """Return the active Duel row for a praxis side, or None if not a duel."""
    result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id == praxis_id)
            | (Duel.opponent_praxis_id == praxis_id),
            Duel.status.in_([DuelStatus.pending, DuelStatus.active, DuelStatus.settled]),
        )
    )
    return result.scalar_one_or_none()


async def get_duel_detail(
    duel_id: int,
    viewer: Optional[Character],
    session: AsyncSession,
) -> DuelDetailOut:
    """Read-oriented duel view for the praxis read page (#308).

    Returns both sides' display info + live vote points in one round trip, plus
    ``viewer_is_participant`` (account-level, mirroring #309) which drives the
    opponent-side anti-vote UI. Never returns a praxis body — a forfeited or
    unsubmitted side still renders name/avatar but ``is_submitted`` is False.
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

    def _side(character: Optional[Character], praxis: Optional[Praxis], praxis_id: Optional[int]) -> DuelSideOut:
        return DuelSideOut(
            praxis_id=praxis_id,
            character_id=character.id if character is not None else 0,
            display_name=character.display_name if character is not None else "",
            faction_slug=(character.faction_slug or "na") if character is not None else "na",
            avatar_url=character.avatar_url if character is not None else "",
            points_from_votes=(
                get_tally(tallies, praxis_id).points_from_votes if praxis_id is not None else 0
            ),
            is_submitted=praxis is not None and praxis.status == PraxisStatus.submitted,
        )

    participant_account_ids = {
        character.account_id
        for character in (challenger_character, opponent_character)
        if character is not None
    }
    viewer_is_participant = (
        viewer is not None and viewer.account_id in participant_account_ids
    )

    return DuelDetailOut(
        id=duel.id,
        task_id=duel.task_id,
        status=duel.status,
        forfeited_by_character_id=duel.forfeited_by_character_id,
        challenger=_side(challenger_character, challenger_praxis, duel.challenger_praxis_id),
        opponent=_side(opponent_character, opponent_praxis, duel.opponent_praxis_id),
        viewer_is_participant=viewer_is_participant,
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
    and opponent cannot be the same.
    """
    if challenger_character_id == opponent_character_id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself.")

    challenger_praxis = await get_praxis(challenger_praxis_id, session)
    if challenger_praxis.created_by_id != challenger_character_id:
        raise HTTPException(status_code=403, detail="You do not own this praxis.")
    if challenger_praxis.status != PraxisStatus.in_progress:
        raise HTTPException(
            status_code=422,
            detail="A duel can only start from an in-progress praxis.",
        )
    if await get_duel_for_praxis(challenger_praxis_id, session) is not None:
        raise HTTPException(
            status_code=409,
            detail="This praxis is already part of a duel.",
        )

    task = await session.get(Task, challenger_praxis.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task no longer exists.")

    opponent = await session.get(Character, opponent_character_id)
    if opponent is None:
        raise HTTPException(status_code=404, detail="Opponent character not found.")

    # Opponent eligibility: must not already have an active praxis for this task.
    if await is_active_member_of_task(opponent, task, session):
        raise HTTPException(
            status_code=409,
            detail="The opponent already has an active praxis for this task.",
        )

    # Challenger must meet duel level requirement.
    era_row = await get_current_era_row(session)
    challenger_stats = await get_or_create_stats(session, challenger_character_id, era_row.id)
    if challenger_stats.level < era.duel_level_required:
        raise HTTPException(
            status_code=403,
            detail=f"Duels require level {era.duel_level_required}.",
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
        raise HTTPException(status_code=403, detail="This challenge is not for you.")

    if duel.status != DuelStatus.pending:
        raise HTTPException(status_code=400, detail="Challenge has already been resolved.")

    now = datetime.now(timezone.utc)

    if not accept:
        duel.status = DuelStatus.declined
        duel.declined_at = now
        await session.flush()
        return None, duel

    opponent = await session.get(Character, character_id)
    if opponent is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    task = await session.get(Task, duel.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task no longer exists.")

    # Opponent must still be eligible (they could have signed up for the task
    # in the window between challenge and accept).
    if await is_active_member_of_task(opponent, task, session):
        raise HTTPException(
            status_code=409,
            detail="You already have an active praxis for this task.",
        )

    # Opponent bank cap check.
    in_progress_count = await _count_in_progress_praxes(character_id, session)
    if in_progress_count >= era.max_task_signups:
        raise HTTPException(
            status_code=400,
            detail=f"Task bank is full ({era.max_task_signups} in-progress praxes).",
        )

    # Opponent level check.
    era_row = await get_current_era_row(session)
    opponent_stats = await get_or_create_stats(session, character_id, era_row.id)
    if opponent_stats.level < era.duel_level_required:
        raise HTTPException(
            status_code=403,
            detail=f"Duels require level {era.duel_level_required}.",
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

    loaded_praxis = await get_praxis(opponent_praxis.id, session)
    return loaded_praxis, duel


async def cancel_duel_challenge(
    duel_id: int,
    character_id: int,
    session: AsyncSession,
) -> Duel:
    """Challenger cancels a pending duel challenge.

    Transitions Duel → declined. Challenger's praxis remains as a plain solo
    praxis (convert-to-solo).
    """
    duel = await get_duel(duel_id, session)

    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    if challenger_praxis is None or challenger_praxis.created_by_id != character_id:
        raise HTTPException(status_code=403, detail="Only the challenger can cancel.")

    if duel.status != DuelStatus.pending:
        raise HTTPException(status_code=400, detail="Challenge has already been resolved.")

    duel.status = DuelStatus.declined
    duel.declined_at = datetime.now(timezone.utc)
    await session.flush()
    return duel


async def maybe_settle_duel(praxis_id: int, session: AsyncSession) -> None:
    """If this praxis is a duel side and both sides are now submitted, settle the duel.

    Called from submit_praxis after a solo praxis transitions to submitted.
    A no-op if the praxis is not part of an active duel.
    """
    duel = await get_duel_for_praxis(praxis_id, session)
    if duel is None or duel.status != DuelStatus.active:
        return

    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    opponent_praxis = (
        await session.get(Praxis, duel.opponent_praxis_id)
        if duel.opponent_praxis_id
        else None
    )

    if (
        challenger_praxis
        and challenger_praxis.status == PraxisStatus.submitted
        and opponent_praxis
        and opponent_praxis.status == PraxisStatus.submitted
    ):
        duel.status = DuelStatus.settled
        await session.flush()


async def list_pending_duel_challenges_for_character(
    character_id: int,
    session: AsyncSession,
) -> list[Duel]:
    """Return pending duel challenges where character_id is the opponent."""
    result = await session.execute(
        select(Duel).where(
            Duel.opponent_character_id == character_id,
            Duel.status == DuelStatus.pending,
        )
    )
    return list(result.scalars().all())
