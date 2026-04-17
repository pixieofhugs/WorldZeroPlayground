from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character_stats import CharacterStats
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory

ERA_RESET_DEFAULT_FACTION: str = "na"


async def clear_defection_history_for_era(
    era_id: int,
    session: AsyncSession,
) -> None:
    """Delete all defection records for a given era. Called during era reset."""
    await session.execute(
        delete(FactionDefectionHistory).where(
            FactionDefectionHistory.era_id == era_id,
        )
    )


async def get_current_era_row(session: AsyncSession) -> Era:
    """Return the Era DB row for CURRENT_ERA.

    Raises 500 if the era has not been seeded yet. Run the initial seed or
    migration before creating characters.
    """
    result = await session.execute(
        select(Era)
        .where(Era.config_key == CURRENT_ERA.config_key)
        .order_by(Era.id.desc())
        .limit(1)
    )
    era_row = result.scalar_one_or_none()
    if era_row is None:
        raise HTTPException(
            status_code=500,
            detail="No active era configured. Run the initial seed before creating characters.",
        )
    return era_row


async def get_or_create_stats(
    session: AsyncSession,
    character_id: int,
    era_id: int,
) -> CharacterStats:
    """Fetch or create the CharacterStats row for a given (character, era) pair.

    Vote budget is computed on read from score + votes_spent_this_era
    (see services.scoring.compute_votes_available), so new rows start with
    votes_spent_this_era = 0 — no explicit seeding of the budget is required.
    """
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    stats = result.scalar_one_or_none()
    if stats is None:
        stats = CharacterStats(
            character_id=character_id,
            era_id=era_id,
            votes_spent_this_era=0,
        )
        session.add(stats)
        await session.flush()
    return stats


async def apply_era_reset(
    characters: list,
    new_era_row: Era,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Create new CharacterStats rows for each character under the new era.

    Preserves historical stats rows for prior eras.
    """
    for character in characters:
        # Find previous stats to carry all_time_score forward
        prev_result = await session.execute(
            select(CharacterStats)
            .where(CharacterStats.character_id == character.id)
            .order_by(CharacterStats.era_id.desc())
            .limit(1)
        )
        prev_stats = prev_result.scalar_one_or_none()
        prev_all_time = prev_stats.all_time_score if prev_stats else 0

        # Vote budget is computed on read. On era reset with reset_vote_budget=True
        # we zero votes_spent_this_era so the on-read budget reflects the full
        # formula against the (possibly reset) score. Otherwise we carry over
        # the previous era's spend count.
        new_stats = CharacterStats(
            character_id=character.id,
            era_id=new_era_row.id,
            score=0 if era.reset_score else (prev_stats.score if prev_stats else 0),
            all_time_score=0 if era.reset_all_time_score else prev_all_time,
            level=0 if era.reset_level else (prev_stats.level if prev_stats else 0),
            votes_spent_this_era=0 if era.reset_vote_budget else (
                prev_stats.votes_spent_this_era if prev_stats else 0
            ),
        )
        session.add(new_stats)

        if era.reset_faction:
            character.faction_slug = ERA_RESET_DEFAULT_FACTION

    # Clear defection history so players can join any faction fresh
    if era.reset_faction:
        await clear_defection_history_for_era(new_era_row.id, session)

    await session.commit()
