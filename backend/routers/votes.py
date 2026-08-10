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

# Read-only vote surfaces. The write surface (POST /praxes/{id}/vote) lives in
# ``routers/praxes.py`` -- it enforces the hidden-praxis 404 guard. A duplicate
# POST route here was shadowed by include order in ``main.py`` and lacked that
# guard; it was deleted in #637. Do not re-add a vote write route to this module.
#
# ``GET /praxes/{id}/votes`` was deleted in #1382: it re-ran ``tally_votes`` for
# numbers ``PraxisOut`` already carries (``points_from_votes``, ``voter_count``),
# so the praxis detail page loaded the praxis row three times and tallied twice.
# Read the tally off the praxis payload; a fresh cast returns its own.
router = APIRouter()


@router.get("/praxes/{praxis_id}/voters", response_model=list[VoterDetail])
async def list_voters(
    praxis_id: int,
    session: AsyncSession = Depends(get_db),
    viewer: Character | None = Depends(get_current_character_optional),
):
    """The voter roster for a praxis the caller may actually see.

    The existence check alone used to be the whole guard, so this answered for a
    moderation-hidden praxis and for another character's ``in_progress`` draft or
    a pre-seal duel side — all of which the detail route 404s. Votes *can* land on
    a non-submitted praxis (``cast_vote_on_praxis`` refuses only ``hidden``), so
    the roster was not empty in those cases. The 200/404 split also made it a
    praxis-existence oracle for ids the detail door hides.

    Gated on :func:`can_view_praxis` — the same predicate the detail route runs,
    so the two cannot drift — and 404, not 403, so it says nothing the detail
    route would not.
    """
    # One raise, deliberately: "no such praxis" and "not yours to see" must be
    # the same answer, or the difference between them is the oracle.
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
