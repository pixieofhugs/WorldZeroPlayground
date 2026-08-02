import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

logger = logging.getLogger(__name__)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from dependencies import get_current_character, get_current_character_optional
from models.account import Account
from models.character import Character, CharacterStatus
from models.praxis import Praxis, PraxisStatus
from models.vote import Vote
from schemas.character import CharacterCreate, CharacterOut, CharacterUpdate
from schemas.praxis import PraxisOut
from services.auth import get_current_account
from services.badge import list_badges_for_character
from services.character import (
    CharacterCreationResult,
    build_character_out,
    build_character_outs,
    create_character,
    list_characters_for_viewer,
    soft_delete_character,
    update_character,
)
from services.era import load_current_era_stats
from services.media import process_and_save_avatar
from services.praxis import (
    praxis_membership_condition,
    praxis_visibility_condition,
)
from services.praxis_out import build_praxis_out
from services.vote_tally import crowned_praxis_ids

router = APIRouter()


@router.get("", response_model=list[CharacterOut])
async def list_characters(
    search: Optional[str] = None,
    faction: Optional[str] = None,
    exclude_active_task_id: Optional[int] = None,
    exclude_own_account: bool = False,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    """List all active characters. Optionally filter by name or faction.

    ``exclude_active_task_id`` hides players already active on that task (invite
    search pre-filter, #320).

    ``exclude_own_account`` hides every life on the caller's own account — the
    account-level identity rule of ADR-0041, which the duel-opponent picker needs
    and used to re-derive client-side off a second request (#1385). Opt-in, so
    the default path ignores the viewer entirely.

    **From an anonymous caller the flag is a silent no-op**, not a 401 or a 422:
    there is no viewer to exclude, the combination is meaningless rather than
    malformed, and rejecting would make a deliberately public route
    conditionally authenticated. That is never a security hole — the exclusion is
    picker convenience, and ``services.duel`` independently enforces the rule at
    both challenge and accept (``_characters_share_account``).
    """
    rows = await list_characters_for_viewer(
        session,
        search=search,
        faction_slug=faction,
        exclude_active_task_id=exclude_active_task_id,
        exclude_account_id=(
            viewer.account_id if exclude_own_account and viewer is not None else None
        ),
        limit=limit,
        offset=offset,
    )
    # Badges ride along, batched (#655) — the invite search shares this path and
    # gets them too, which is harmless: /characters/{id} is already public.
    return await build_character_outs(rows, session)


@router.get("/{character_id}", response_model=CharacterOut)
async def get_character(
    character_id: int,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Character).where(
            Character.id == character_id,
            Character.status == CharacterStatus.active,
        )
    )
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    stats = await load_current_era_stats(character_id, session)
    # Badges are evaluated on read, single-character path only (ADR-0033).
    badges = await list_badges_for_character(character, session)
    return build_character_out(character, stats, badges=badges)


@router.post("", response_model=CharacterOut, status_code=201)
async def create_character_route(
    data: CharacterCreate,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
):
    result: CharacterCreationResult = await create_character(account.id, data, session)
    return build_character_out(result.character, result.stats)


@router.put("/{character_id}", response_model=CharacterOut)
async def update_character_route(
    character_id: int,
    data: CharacterUpdate,
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot edit another character.")
    character = await update_character(character_id, data, session)
    stats = await load_current_era_stats(character_id, session)
    return build_character_out(character, stats)


@router.delete("/{character_id}", status_code=204)
async def delete_character_route(
    character_id: int,
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot delete another character.")
    await soft_delete_character(character_id, session)


@router.get("/{character_id}/praxes", response_model=list[PraxisOut])
async def get_character_praxes(
    character_id: int,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    viewer: Optional[Character] = Depends(get_current_character_optional),
):
    """A character's praxis record — the same contract as the profile grid (#1112).

    Membership, not authorship: a finished collab is part of the record of every
    member (ADR-0013 co-ownership), not only its creator's. Finished work only:
    ``in_progress`` is excluded for every viewer, the character themselves
    included — the record is public, and in-flight work is read from the sidebar
    (``GET /praxes?member_id=..&status=in_progress``) instead.

    Kept byte-for-byte in step with ``list_praxes(character_id=...)``, which is
    what the profile page actually fetches; both AND the shared
    :func:`praxis_membership_condition` onto the unchanged viewer gate
    :func:`praxis_visibility_condition`, so the two spellings cannot drift.

    One deliberate difference since #1362: this route is **all eras**, while
    ``GET /praxes`` now defaults to
    :class:`services.praxis.PraxisEraScope.this_era` (opt out with
    ``?era_scope=all_eras``). A whole-career record has no era rail to set, so
    it keeps the unbounded list.
    """
    result = await session.execute(
        select(Praxis)
        .options(selectinload(Praxis.invites), selectinload(Praxis.media_items))
        .where(
            praxis_membership_condition(character_id),
            Praxis.status == PraxisStatus.submitted,
            praxis_visibility_condition(viewer.id if viewer else None),
        )
        .order_by(Praxis.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    praxis_list = result.scalars().all()
    # Task Crown (ADR-0028): one windowed query for the whole grid — not per card.
    crowned = await crowned_praxis_ids(
        {praxis.task_id for praxis in praxis_list}, session
    )
    return [
        await build_praxis_out(praxis, session, crowned_ids=crowned)
        for praxis in praxis_list
    ]


@router.post("/{character_id}/avatar", response_model=CharacterOut)
async def upload_avatar(
    character_id: int,
    file: UploadFile = File(...),
    current_character: Character = Depends(get_current_character),
    session: AsyncSession = Depends(get_db),
):
    if current_character.id != character_id:
        raise HTTPException(status_code=403, detail="Cannot update another character's avatar.")
    character = current_character
    # Read the outgoing path before overwriting it: the service unlinks it once
    # the replacement is written, so a per-upload directory (#1565) does not
    # orphan a file per upload.
    previous_avatar_url = character.avatar_url
    character.avatar_url = await process_and_save_avatar(
        file, character_id, previous_avatar_url=previous_avatar_url
    )
    await session.flush()
    await session.refresh(character)
    stats = await load_current_era_stats(character_id, session)
    return build_character_out(character, stats)


@router.get("/{character_id}/stats/votes-received")
async def get_votes_received_count(
    character_id: int,
    session: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Votes received on the praxes this character **authored**.

    Deliberately still ``created_by_id`` after #1112 moved the praxis *record*
    above to membership, for two reasons:

    - It is not the grid's count. Nothing renders it beside the profile grid;
      it feeds the Field Desk home "Votes" stat, so the two cannot disagree.
    - Scoring is author-scoped (ADR-0053): a collab's votes bank to its one
      author. Counting memberships would both credit co-members with votes they
      did not earn and count a single vote once per member.
    """
    result = await session.execute(
        select(func.count())
        .select_from(Vote)
        .join(Praxis, Vote.praxis_id == Praxis.id)
        .where(Praxis.created_by_id == character_id)
    )
    count = result.scalar_one()
    return {"character_id": character_id, "votes_received": count}
