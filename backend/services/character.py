import dataclasses

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from schemas.character import CharacterCreate, CharacterUpdate
from services.era import get_current_era_row, get_or_create_stats
from services.scoring import compute_level, compute_vote_budget


@dataclasses.dataclass(frozen=True)
class CharacterCreationResult:
    character: Character
    stats: CharacterStats


async def get_character_by_id(character_id: int, session: AsyncSession) -> Character | None:
    result = await session.execute(
        select(Character).where(
            Character.id == character_id,
            Character.status == CharacterStatus.active,
        )
    )
    return result.scalar_one_or_none()


SECOND_CHARACTER_LEVEL_REQUIRED = 5
ALBESCENT_FACTION_SLUG = "albescent"
ALBESCENT_LEVEL_REQUIRED = 8


async def create_character(
    account_id: int,
    data: CharacterCreate,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CharacterCreationResult:
    era_row = await get_current_era_row(session)

    requested_faction_slug = (data.faction_slug or "").strip().lower() or None

    # Count existing active characters for this account
    result = await session.execute(
        select(func.count()).select_from(Character).where(
            Character.account_id == account_id,
            Character.status == CharacterStatus.active,
        )
    )
    existing_count = result.scalar_one()

    if existing_count > 0:
        # Need level >= SECOND_CHARACTER_LEVEL_REQUIRED on at least one
        # character to create another. Check via CharacterStats join.
        level_check = await session.execute(
            select(Character)
            .join(
                CharacterStats,
                (CharacterStats.character_id == Character.id)
                & (CharacterStats.era_id == era_row.id),
            )
            .where(
                Character.account_id == account_id,
                Character.status == CharacterStatus.active,
                CharacterStats.level >= SECOND_CHARACTER_LEVEL_REQUIRED,
            )
        )
        if level_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Must reach level {SECOND_CHARACTER_LEVEL_REQUIRED} "
                    "before creating additional characters."
                ),
            )

    # Albescent unlock gate: requires at least one level-8 character on the account.
    if requested_faction_slug == ALBESCENT_FACTION_SLUG:
        albescent_check = await session.execute(
            select(Character)
            .join(
                CharacterStats,
                (CharacterStats.character_id == Character.id)
                & (CharacterStats.era_id == era_row.id),
            )
            .where(
                Character.account_id == account_id,
                Character.status == CharacterStatus.active,
                CharacterStats.level >= ALBESCENT_LEVEL_REQUIRED,
            )
        )
        if albescent_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Albescent characters require a level-{ALBESCENT_LEVEL_REQUIRED} "
                    "character on the account."
                ),
            )
        starting_faction_slug = ALBESCENT_FACTION_SLUG
    elif requested_faction_slug in (None, "", "ua"):
        # Default onboarding: everyone starts in UA.
        starting_faction_slug = "ua"
    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "New characters must start in UA (or Albescent, if unlocked). "
                "Other factions are joined later via faction graduation."
            ),
        )

    character = Character(
        account_id=account_id,
        username=data.username,
        display_name=data.display_name,
        bio=data.bio or "",
        avatar_url=data.avatar_url or "",
        location=data.location or "",
        faction_slug=starting_faction_slug,
    )
    session.add(character)
    await session.flush()  # get character.id before creating stats

    stats = await get_or_create_stats(
        session,
        character_id=character.id,
        era_id=era_row.id,
        initial_votes=era.vote_budget_base,
    )

    await session.commit()
    await session.refresh(character)
    await session.refresh(stats)
    return CharacterCreationResult(character=character, stats=stats)


async def update_character(
    character_id: int,
    data: CharacterUpdate,
    session: AsyncSession,
) -> Character:
    character = await get_character_by_id(character_id, session)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            value = ""
        setattr(character, field, value)

    await session.commit()
    await session.refresh(character)
    return character


async def soft_delete_character(character_id: int, session: AsyncSession) -> None:
    character = await get_character_by_id(character_id, session)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    character.status = CharacterStatus.banned
    await session.commit()


def check_faction_graduation(
    character: Character,
    stats: CharacterStats,
    era: EraConfig = CURRENT_ERA,
) -> str | None:
    """Returns 'aged_out' if the character just hit level 3 while still in 'ua', else None."""
    if character.faction_slug != "ua":
        return None
    current_level = compute_level(stats.score, era)
    if current_level >= 3:
        return "aged_out"
    return None
