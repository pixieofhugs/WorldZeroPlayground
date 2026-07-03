"""Assemble the /auth/me CurrentUser payload.

Shared by GET /auth/me and POST /me/active-character so the "switch life then
return the refreshed user" path doesn't duplicate the composition.
"""
from dataclasses import asdict

from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import account_has_admin_role
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from schemas.auth import CurrentUser
from services.character import (
    build_character_out,
    can_create_additional_character,
    can_start_as_albescent,
    resolve_active_character,
)
from services.character_capabilities import compute_capabilities
from services.era import load_current_era_stats


async def build_current_user(
    account: Account,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CurrentUser:
    character = await resolve_active_character(account, session)

    char_out = None
    character_level: int | None = None
    if character:
        stats = await load_current_era_stats(character.id, session)
        char_out = build_character_out(character, stats)
        character_level = stats.level if stats else 0

    is_admin = await account_has_admin_role(account.id, session)

    # Eligibility flags depend on the era being seeded. Fall back to False in
    # fresh test environments where no era row exists yet.
    try:
        can_create_more = await can_create_additional_character(account.id, session, era)
        can_albescent = await can_start_as_albescent(account.id, session, era)
    except Exception:
        can_create_more = False
        can_albescent = False

    capabilities = compute_capabilities(character_level, is_admin)

    return CurrentUser(
        account_id=account.id,
        character=char_out,
        is_admin=is_admin,
        can_create_additional_character=can_create_more,
        can_start_as_albescent=can_albescent,
        albescent_revealed=account.albescent_revealed,
        second_character_level_required=era.second_character_level_required,
        era_name=era.name,
        **asdict(capabilities),
    )
