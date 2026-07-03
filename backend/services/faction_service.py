"""Faction lifecycle: defection and invitation letters."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.faction import Faction
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.task import Task
from schemas.faction import FactionUpdate
from services.character import ALBESCENT_FACTION_SLUG, can_start_as_albescent
from services.era import clear_defection_history_for_era, get_current_era_row, get_or_create_stats

UA_FACTION_SLUG: str = "ua"
UNAFFILIATED_FACTION_SLUG: str = "na"


# ---------------------------------------------------------------------------
# Defection
# ---------------------------------------------------------------------------


async def can_join_faction(
    character_id: int,
    target_slug: str,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Check whether a character is allowed to join the target faction.

    Returns False if the character has previously defected from this faction
    in the current era and the faction does not allow rejoining.
    """
    faction_config = era.factions.get(target_slug)
    if faction_config is None:
        return False
    if faction_config.can_always_rejoin:
        return True
    result = await session.execute(
        select(FactionDefectionHistory).where(
            FactionDefectionHistory.character_id == character_id,
            FactionDefectionHistory.faction_slug == target_slug,
            FactionDefectionHistory.era_id == era_id,
        )
    )
    return result.scalar_one_or_none() is None


async def defect_to_faction(
    character: Character,
    target_slug: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Character:
    """Move a character to a new faction, recording the defection.

    Works for both initial faction choice (from aged_out) and later defections.
    Raises 422 if the target is the current faction, 404 if the target doesn't
    exist or isn't selectable, and 403 if the player previously left this faction
    and it doesn't allow rejoining, or if the target is Albescent and the account
    has not met the ADR-0021 eligibility bar (level + full faction coverage).
    """
    if character.faction_slug == target_slug:
        raise HTTPException(
            status_code=422,
            detail="Already a member of this faction.",
        )

    faction_config = era.factions.get(target_slug)
    if faction_config is None:
        raise HTTPException(status_code=404, detail="Faction not found.")
    if not faction_config.is_selectable and not faction_config.can_always_rejoin:
        raise HTTPException(
            status_code=422,
            detail="This faction cannot be chosen directly.",
        )

    era_row = await get_current_era_row(session)

    if not await can_join_faction(
        character.id, target_slug, era_row.id, session, era
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot rejoin a faction you have left.",
        )

    # ADR-0021: Albescent is joined in the field via defection, but only once the
    # *account* (not this character) has met the eligibility bar. Albescent's
    # can_always_rejoin=True slips the selectability guard above, so enforce here.
    if target_slug == ALBESCENT_FACTION_SLUG and not await can_start_as_albescent(
        character.account_id, session, era
    ):
        raise HTTPException(
            status_code=403,
            detail="The order has not extended its hand to you.",
        )

    # Record defection from current faction (if it's a real faction, not na)
    old_slug = character.faction_slug
    if old_slug and old_slug != UNAFFILIATED_FACTION_SLUG:
        defection = FactionDefectionHistory(
            character_id=character.id,
            faction_slug=old_slug,
            era_id=era_row.id,
        )
        session.add(defection)

    character.faction_slug = target_slug

    # ADR-0027 / #390: joining Albescent permanently reveals the secret society to
    # this account. Sticky/monotonic — set once, never unset. Do NOT derive from
    # live membership; it must survive age-out, death, and active-character switch.
    if target_slug == ALBESCENT_FACTION_SLUG:
        account = await session.get(Account, character.account_id)
        if account is not None:
            account.albescent_revealed = True

    await session.flush()
    await session.refresh(character)
    return character


async def get_defection_history(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> list[FactionDefectionHistory]:
    """Return all defection records for a character in the given era."""
    result = await session.execute(
        select(FactionDefectionHistory).where(
            FactionDefectionHistory.character_id == character_id,
            FactionDefectionHistory.era_id == era_id,
        )
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Invitation Letters
# ---------------------------------------------------------------------------


async def get_invitation_status(
    character_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> dict[str, str]:
    """Return a dict mapping faction slug to relationship status.

    Possible values: "member", "invited", "not_invited", "defected", "can_return".
    """
    character = await session.get(Character, character_id)
    if character is None:
        return {}

    current_faction = character.faction_slug

    defections = await get_defection_history(character_id, era_id, session)
    defected_slugs = {defection.faction_slug for defection in defections}

    invitation_result = await session.execute(
        select(InvitationLetter).where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_id,
        )
    )
    invited_slugs = {
        letter.faction_slug for letter in invitation_result.scalars().all()
    }

    status_map: dict[str, str] = {}
    for slug, faction_config in era.factions.items():
        if slug == current_faction:
            status_map[slug] = "member"
        elif slug in defected_slugs and faction_config.can_always_rejoin:
            status_map[slug] = "can_return"
        elif slug in defected_slugs:
            status_map[slug] = "defected"
        elif slug in invited_slugs:
            status_map[slug] = "invited"
        else:
            status_map[slug] = "not_invited"

    return status_map


# ---------------------------------------------------------------------------
# Admin mutations
# ---------------------------------------------------------------------------


async def update_faction(
    faction: Faction,
    data: FactionUpdate,
    session: AsyncSession,
) -> Faction:
    faction.name = data.name
    faction.description = data.description
    await session.flush()
    await session.refresh(faction)
    return faction
