"""Dev-only fixture state for ``POST /auth/dev-login`` (#3234).

Writes the rows the real paths write; the stamps re-check the earn rules. The
route owns the production guard.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.invitation_letter import InvitationLetter
from services.character import (
    _ALBESCENT_SENTINEL_SLUGS,
    stamp_albescent_glimpse,
    stamp_albescent_unlock,
)


def albescent_floor(state: str | None, level: int, era: EraConfig = CURRENT_ERA) -> int:
    """The level the account needs for ``state``, raised to at least ``level``."""
    if state == "unlocked":
        return max(level, era.albescent_level_required)
    if state == "glimpsed":
        return max(level, era.albescent_glimpse_level)
    return level


async def apply_dev_fixture(
    character: Character,
    era_id: int,
    level: int,
    session: AsyncSession,
    *,
    invited: list[str],
    albescent: str | None,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Idempotently deliver letters and stamp the Albescent state.
    ``level`` is post-``albescent_floor``."""
    slugs = set(invited)
    if albescent == "unlocked":
        slugs |= {s for s in era.factions if s not in _ALBESCENT_SENTINEL_SLUGS}
    slugs.discard(character.faction_slug)
    held = set(
        await session.scalars(
            select(InvitationLetter.faction_slug).where(
                InvitationLetter.character_id == character.id,
                InvitationLetter.era_id == era_id,
            )
        )
    )
    for slug in slugs - held:
        session.add(
            InvitationLetter(
                character_id=character.id, faction_slug=slug, era_id=era_id
            )
        )
    await session.flush()

    if albescent is not None:
        await stamp_albescent_glimpse(character, level, session, era)
    if albescent == "unlocked":
        await stamp_albescent_unlock(character, era_id, session, era)
