"""Duel router — challenge flow for two-linked-praxes duels (ADR-0011)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character
from game_config import CURRENT_ERA
from models.character import Character
from schemas.duel import DuelChallengeIn, DuelOut, DuelRespondIn
from schemas.praxis import PraxisOut
from services.duel import (
    cancel_duel_challenge,
    get_duel,
    issue_duel_challenge,
    list_pending_duel_challenges_for_character,
    respond_to_duel_challenge,
)
from services.praxis import build_praxis_out

router = APIRouter()


@router.get("/pending", response_model=list[DuelOut])
async def list_pending_challenges_route(
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Return pending duel challenges where the current character is the opponent."""
    duels = await list_pending_duel_challenges_for_character(character.id, session)
    return [DuelOut.model_validate(duel) for duel in duels]


@router.post("/challenge", response_model=DuelOut, status_code=201)
async def issue_challenge_route(
    data: DuelChallengeIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Attach a duel to an existing praxis. Body: ``{challenger_praxis_id, opponent_character_id}``."""
    _praxis, duel = await issue_duel_challenge(
        challenger_character_id=character.id,
        challenger_praxis_id=data.challenger_praxis_id,
        opponent_character_id=data.opponent_character_id,
        session=session,
        era=CURRENT_ERA,
    )
    return DuelOut.model_validate(duel)


@router.get("/{duel_id}", response_model=DuelOut)
async def get_duel_route(
    duel_id: int,
    session: AsyncSession = Depends(get_db),
):
    duel = await get_duel(duel_id, session)
    return DuelOut.model_validate(duel)


@router.post("/{duel_id}/respond", response_model=DuelOut)
async def respond_to_challenge_route(
    duel_id: int,
    data: DuelRespondIn,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Accept or decline a duel challenge."""
    _praxis, duel = await respond_to_duel_challenge(
        duel_id=duel_id,
        character_id=character.id,
        accept=data.accept,
        session=session,
        era=CURRENT_ERA,
    )
    return DuelOut.model_validate(duel)


@router.post("/{duel_id}/cancel", response_model=DuelOut)
async def cancel_challenge_route(
    duel_id: int,
    character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    """Challenger cancels a pending duel challenge."""
    duel = await cancel_duel_challenge(
        duel_id=duel_id,
        character_id=character.id,
        session=session,
    )
    return DuelOut.model_validate(duel)
