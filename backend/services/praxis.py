from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.flag import Flag
from models.praxis import ModerationStatus, Praxis
from models.task import CharacterTask, CharacterTaskStatus, Task
from schemas.praxis import MediaItemOut, PraxisCreate, PraxisOut
from services.character_stats import recalculate_character_stats
from services.era import get_current_era_row, get_or_create_stats
from services.faction_service import check_and_deliver_invitations
from services.scoring import (
    COLLABORATION_MODE_SOLO,
    compute_faction_multiplier,
    compute_praxis_score,
)


async def create_praxis(
    character: Character,
    task: Task,
    data: PraxisCreate,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Praxis:
    character_task_result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == task.id,
            CharacterTask.status != CharacterTaskStatus.abandoned,
        )
    )
    character_task = character_task_result.scalar_one_or_none()
    if character_task is None:
        raise HTTPException(status_code=403, detail="Must be signed up for this task to submit proof.")

    praxis = Praxis(
        task_id=task.id,
        character_id=character.id,
        title=data.title,
        body_text=data.body_text or "",
    )
    session.add(praxis)
    character_task.status = CharacterTaskStatus.submitted
    await session.commit()
    await session.refresh(praxis)
    await recalculate_character_stats(character.id, session, era)
    await check_and_deliver_invitations(character, task, session)
    await session.commit()
    return praxis


async def withdraw_praxis(
    praxis: Praxis,
    character: Character,
    session: AsyncSession,
) -> Praxis:
    """Withdraw a submitted praxis back to editing state.

    Sets is_withdrawn=True, reverts CharacterTask status to in_progress,
    and recalculates stats so points/votes no longer count.
    """
    if praxis.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot withdraw another character's praxis.")
    if praxis.is_withdrawn:
        raise HTTPException(status_code=422, detail="Praxis is already withdrawn.")

    praxis.is_withdrawn = True

    character_task_result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == praxis.task_id,
            CharacterTask.status == CharacterTaskStatus.submitted,
        )
    )
    character_task = character_task_result.scalar_one_or_none()
    if character_task is not None:
        character_task.status = CharacterTaskStatus.in_progress

    await session.commit()
    await recalculate_character_stats(character.id, session)
    await session.commit()
    await session.refresh(praxis)
    return praxis


async def resubmit_praxis(
    praxis: Praxis,
    character: Character,
    session: AsyncSession,
) -> Praxis:
    """Resubmit a previously withdrawn praxis.

    Clears is_withdrawn, sets CharacterTask status back to submitted,
    and recalculates stats so points/votes count again.
    """
    if praxis.character_id != character.id:
        raise HTTPException(status_code=403, detail="Cannot resubmit another character's praxis.")
    if not praxis.is_withdrawn:
        raise HTTPException(status_code=422, detail="Praxis is not withdrawn.")

    praxis.is_withdrawn = False

    character_task_result = await session.execute(
        select(CharacterTask).where(
            CharacterTask.character_id == character.id,
            CharacterTask.task_id == praxis.task_id,
            CharacterTask.status == CharacterTaskStatus.in_progress,
        )
    )
    character_task = character_task_result.scalar_one_or_none()
    if character_task is not None:
        character_task.status = CharacterTaskStatus.submitted

    await session.commit()
    await recalculate_character_stats(character.id, session)
    await session.commit()
    await session.refresh(praxis)
    return praxis


async def edit_praxis(
    praxis: Praxis,
    data: PraxisCreate,
    session: AsyncSession,
) -> Praxis:
    for field, value in data.model_dump(exclude_unset=True, exclude={"task_id"}).items():
        if value is None:
            value = ""
        setattr(praxis, field, value)
    await session.commit()
    await session.refresh(praxis)
    return praxis


async def flag_praxis(
    praxis: Praxis,
    flagged_by: Character,
    reason: str,
    session: AsyncSession,
) -> Praxis:
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, flagged_by.id, era_row.id)

    if stats.level < 4:
        raise HTTPException(
            status_code=403,
            detail="Must be level 4 or above to flag praxis.",
        )
    if flagged_by.id == praxis.character_id:
        raise HTTPException(status_code=403, detail="Cannot flag your own praxis.")

    praxis.moderation_status = ModerationStatus.flagged
    praxis.flagged_at = datetime.now(timezone.utc)

    flag = Flag(
        praxis_id=praxis.id,
        flagged_by=flagged_by.id,
        reason=reason or "",
    )
    session.add(flag)
    await session.commit()
    await session.refresh(praxis)
    return praxis


async def compute_praxis_score_from_db(
    praxis: Praxis,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> float:
    task = praxis.task
    if task is None:
        return 0.0
    character_faction_slug = praxis.character.faction_slug if praxis.character else "na"
    task_faction_slug = task.primary_faction_slug or "na"
    faction_multiplier = compute_faction_multiplier(
        character_faction_slug,
        task_faction_slug,
        era,
        collaboration_mode=COLLABORATION_MODE_SOLO,
    )
    total_stars = int(sum(vote.stars for vote in praxis.votes))
    return compute_praxis_score(task.point_value, faction_multiplier, total_stars)


async def build_praxis_out(
    praxis: Praxis, session: AsyncSession
) -> PraxisOut:
    """Build a complete PraxisOut with all joined fields (task, character, media, score).

    All relationships are eager-loaded (lazy="selectin") so this function reads from the
    already-populated attributes rather than issuing additional per-praxis queries.
    """
    score = await compute_praxis_score_from_db(praxis, session)
    media = [MediaItemOut.model_validate(item) for item in praxis.media_items]

    character_display_name = praxis.character.display_name if praxis.character else ""
    task_title = praxis.task.title if praxis.task else ""
    task_point_value = praxis.task.point_value if praxis.task else 0
    task_faction_slug = praxis.task.primary_faction_slug if praxis.task else None

    return PraxisOut(
        id=praxis.id,
        task_id=praxis.task_id,
        character_id=praxis.character_id,
        character_display_name=character_display_name,
        task_title=task_title,
        task_point_value=task_point_value,
        task_faction_slug=task_faction_slug,
        title=praxis.title,
        body_text=praxis.body_text,
        moderation_status=praxis.moderation_status.value,
        is_withdrawn=praxis.is_withdrawn,
        admin_note=praxis.admin_note,
        created_at=praxis.created_at,
        updated_at=praxis.updated_at,
        media=media,
        score=score,
    )
