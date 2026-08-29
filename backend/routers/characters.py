import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import (
    get_current_account_optional,
    get_current_character,
    get_current_character_optional,
    get_viewer_is_admin,
)
from models.account import Account
from models.character import Character, CharacterStatus
from schemas.character import CharacterCreate, CharacterOut, CharacterUpdate
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
    account: Optional[Account] = Depends(get_current_account_optional),
    viewer_is_admin: bool = Depends(get_viewer_is_admin),
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
        # Optional auth, and only the reveal flag is read from it: a revealed
        # caller may ask for the Albescent roster directly (#2422). Anonymous
        # callers are unaffected — `account` is None and the fold stands. An
        # admin counts as revealed for that question and no other (#2400).
        viewer_account=account,
        viewer_is_admin=viewer_is_admin,
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
