"""Dev-only fixture state for ``POST /auth/dev-login`` (#3234).

Letters and the Albescent stamps are normally earned by playing for hours. A
screenshot of "an invited viewer" or "an Albescent-unlocked account" cannot wait
for that, so this writes the same rows the real paths write: an
``InvitationLetter`` per faction, and the account flags through
``stamp_albescent_glimpse`` / ``stamp_albescent_unlock``, which re-check the
earn rules rather than flipping the columns blind. The caller (the route) owns
the production guard.
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
    """Deliver letters for ``invited`` and stamp the requested Albescent state.

    ``level`` is the character's level after ``albescent_floor`` was applied.
    Idempotent: a letter the character already holds is not added twice.
    """
    slugs = set(invited)
    if albescent == "unlocked":
        # The earn rule is "invited to or held every joinable faction".
        slugs |= {s for s in era.factions if s not in _ALBESCENT_SENTINEL_SLUGS}
    slugs.discard(character.faction_slug)  # nobody is invited to their own faction
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
