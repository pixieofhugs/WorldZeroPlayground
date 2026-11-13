"""Duel service — challenge flow for two-linked-praxes duels (ADR-0011).

Two solo praxes linked by a Duel row: pending → active → settled, or declined.
Praxis-id-keyed helpers live in the leaf ``services.praxis_duel`` (#2872).
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
from services.scoring import compute_duel_multiplier
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


# ADR-0041, #1237: shared by the challenge and accept guards.
SELF_DUEL_DETAIL = "You cannot duel your own character."


async def _characters_share_account(
    first_character_id: int,
    second_character_id: int,
    session: AsyncSession,
) -> bool:
    """Whether two characters belong to the same account (ADR-0041).

    A missing character returns False so callers raise their own 404.
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
    """Forfeit every settled duel this character is a side of (ADR-0011).

    Sticky: the first forfeit stands. Only winners are re-scored. Shared by
    soft-delete and ``admin_service.apply_ban`` so it cannot drift (#1577).
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


def _faction_slug_of(character: Optional[Character]) -> str:
    if character is None:
        return UNAFFILIATED_FACTION_SLUG
    return character.faction_slug or UNAFFILIATED_FACTION_SLUG


async def get_duel_detail(
    duel_id: int,
    viewer: Optional[Character],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> DuelDetailOut:
    """Both sides' display info and live vote points, never a body (#308).
    ``viewer`` keys the per-side nudge state."""
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

    # Per side (#1083): the nudge rate limit is keyed per praxis.
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
        *,
        opponent_character: Optional[Character] = None,
    ) -> DuelSideOut:
        own_slug = _faction_slug_of(character)
        foe_slug = _faction_slug_of(opponent_character)

        def _multiplier(is_winner: bool, is_tied: bool) -> float:
            return compute_duel_multiplier(own_slug, foe_slug, is_winner, is_tied, era)

        return DuelSideOut(
            praxis_id=praxis_id,
            character_id=character.id if character is not None else 0,
            display_name=character.display_name if character is not None else "",
            faction_slug=own_slug,
            avatar_url=character.avatar_url if character is not None else "",
            points_from_votes=(
                get_tally(tallies, praxis_id).points_from_votes if praxis_id is not None else 0
            ),
            is_submitted=praxis is not None and praxis.status == PraxisStatus.submitted,
            nudged_at=nudged_at,
            win_multiplier=_multiplier(True, False),
            loss_multiplier=_multiplier(False, False),
            tie_multiplier=_multiplier(False, True),
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
            opponent_character=opponent_character,
        ),
        opponent=_side(
            opponent_character,
            opponent_praxis,
            duel.opponent_praxis_id,
            opponent_nudged_at,
            opponent_character=challenger_character,
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
    """Create a pending Duel on the challenger's in_progress solo praxis (ADR-0011).
    """
    if await _characters_share_account(
        challenger_character_id, opponent_character_id, session
    ):
        raise_coded(400, ErrorCode.duel_self_challenge, SELF_DUEL_DETAIL)

    # Plain read (#2874): only solo passes, and only collabs have a window.
    challenger_praxis = await get_praxis(challenger_praxis_id, session)
    if challenger_praxis.created_by_id != challenger_character_id:
        raise_coded(403, ErrorCode.praxis_not_owner, "You do not own this praxis.")
    if challenger_praxis.status != PraxisStatus.in_progress:
        raise_coded(
            422,
            ErrorCode.duel_requires_in_progress_praxis,
            "A duel can only start from an in-progress praxis.",
        )
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

    # Pass `era`: the predicate has the Double Dipper carve-out (#1511).
    if await is_active_member_of_task(opponent, task, session, era):
        raise_coded(
            409,
            ErrorCode.duel_opponent_has_active_praxis,
            "The opponent already has an active praxis for this task.",
        )

    # No admin or faction bypass for duels (#2868).
    era_row = await get_current_era_row(session)
    challenger_stats = await get_or_create_stats(session, challenger_character_id, era_row.id)
    if not may_create_duel(challenger_stats.level, None, False, era):
        raise_coded(
            403,
            ErrorCode.duel_level_too_low,
            f"Duels require level {era.duel_level_required}.",
            {"level": era.duel_level_required},
        )

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
    """Accept (create opponent praxis, → active) or decline (→ declined).
    Returns (opponent_praxis_or_None, duel)."""
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

    # Self-duel guard (ADR-0041, #1237): accept-only, so legacy same-account
    # challenges can still be declined or cancelled.
    challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
    if challenger_praxis is not None and await _characters_share_account(
        challenger_praxis.created_by_id, character_id, session
    ):
        raise_coded(400, ErrorCode.duel_self_challenge, SELF_DUEL_DETAIL)

    task = await session.get(Task, duel.task_id)
    if task is None:
        raise_coded(404, ErrorCode.task_not_found, "Task no longer exists.")

    # May have signed up since the challenge; `era` as above (#1511).
    if await is_active_member_of_task(opponent, task, session, era):
        raise_coded(
            409,
            ErrorCode.task_already_active_member,
            "You already have an active praxis for this task.",
            {DETAIL_CONTEXT_PARAM: "duel"},
        )

    in_progress_count = await count_in_progress_praxes(character_id, session)
    if in_progress_count >= era.max_task_signups:
        raise_coded(
            400,
            ErrorCode.task_bank_full,
            f"Task bank is full ({era.max_task_signups} in-progress praxis).",
            {"limit": era.max_task_signups},
        )

    # ponytail: flat duel floor only, no task-level check: a duel is a reach
    # above your level (#292). Revisit ADR-0051 before adding one.
    era_row = await get_current_era_row(session)
    opponent_stats = await get_or_create_stats(session, character_id, era_row.id)
    if not may_create_duel(opponent_stats.level, None, False, era):
        raise_coded(
            403,
            ErrorCode.duel_level_too_low,
            f"Duels require level {era.duel_level_required}.",
            {"level": era.duel_level_required},
        )

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
    era: EraConfig = CURRENT_ERA,
) -> Duel:
    """Dissolve a pending *or* active duel — any participant may (ADR-0011 §Forfeit grill).

    Both sides stay plain solo praxes, no penalty.
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

    # A side may already be scored with the duel multiplier; revert both.
    era_row = await get_current_era_row(session)
    for participant_id in {challenger_character_id, duel.opponent_character_id}:
        if participant_id is not None:
            await recalculate_character_stats(
                participant_id, session, era, era_row=era_row
            )
    await session.flush()
    return duel
