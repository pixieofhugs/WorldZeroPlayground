from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import get_current_character_optional
from models.character import Character
from models.praxis import Praxis
from models.vote import Vote
from schemas.vote import VoterDetail
from services.praxis import can_view_praxis

# Read-only. Vote writes live in routers/praxes.py (404 guard); don't add one here
# (#637). The tally rides ``PraxisOut``; no ``GET .../votes`` (#1382).
router = APIRouter()


@router.get("/praxes/{praxis_id}/voters", response_model=list[VoterDetail])
async def list_voters(
    praxis_id: int,
    session: AsyncSession = Depends(get_db, scope="function"),
    viewer: Character | None = Depends(get_current_character_optional),
):
    """The voter roster for a praxis the caller may see (``can_view_praxis``)."""
    # One raise: "missing" and "not yours to see" must match, or it's an oracle.
    praxis = await session.get(Praxis, praxis_id)
    if praxis is None or not await can_view_praxis(viewer, praxis, session):
        raise HTTPException(status_code=404, detail="Praxis not found.")

    result = await session.execute(
        select(Vote, Character)
        .join(Character, Character.id == Vote.voter_character_id)
        .where(Vote.praxis_id == praxis_id)
        .order_by(Vote.created_at.desc())
    )
    return [
        VoterDetail(
            character_id=character.id,
            display_name=character.display_name,
            avatar_url=character.avatar_url,
            faction_slug=character.faction_slug,
            value=vote.value,
        )
        for vote, character in result.all()
    ]
