"""Assemble the /auth/me CurrentUser payload.

Every signed-in page load gates on this, so minimise queries (#1381): resolve
the era once. ``asyncio.gather`` would not help on one AsyncSession connection.
"""
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import account_has_admin_role, account_is_owner
from game_config import CURRENT_ERA, EraConfig
from models.account import Account, OAuthProvider
from schemas.auth import CurrentUser
from services.albescent_reveal import is_albescent_glimpsed, is_albescent_revealed
from services.character import (
    AccountEligibility,
    build_character_out,
    list_era_invitations_for_character,
    load_account_eligibility,
    resolve_active_character,
)
from services.character_capabilities import compute_capabilities
from services.era import get_current_era_row_safe, load_era_stats


async def build_current_user(
    account: Account,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CurrentUser:
    # None when unseeded: zero-stats / no-unlocks fallbacks.
    era_row = await get_current_era_row_safe(session)
    character = await resolve_active_character(account, session)

    char_out = None
    character_level: int | None = None
    level_jump_used_at_level: int | None = None
    if character:
        stats = None
        # #243: for the frontend InvitationWatcher.
        invitations: list[str] = []
        if era_row is not None:
            stats = await load_era_stats(character.id, era_row.id, session)
            invitations = await list_era_invitations_for_character(
                character.id, era_row.id, session
            )
        char_out = build_character_out(character, stats, invitations=invitations)
        character_level = stats.level if stats else 0
        level_jump_used_at_level = stats.level_jump_used_at_level if stats else None

    is_admin = await account_has_admin_role(account.id, session)

    # LIMIT 1: an account holds exactly one identity (ADR-0075).
    provider = await session.scalar(
        select(OAuthProvider.provider)
        .where(OAuthProvider.account_id == account.id)
        .order_by(OAuthProvider.id)
        .limit(1)
    )

    eligibility = (
        await load_account_eligibility(account.id, era_row.id, session, era)
        if era_row is not None
        else AccountEligibility()
    )

    capabilities = compute_capabilities(
        character_level,
        is_admin,
        era,
        faction_slug=character.faction_slug if character else None,
        level_jump_used_at_level=level_jump_used_at_level,
        peak_level=character.peak_level if character else None,
    )

    return CurrentUser(
        account_id=account.id,
        email=account.email,
        # Seeded accounts may have no OAuth row; see `AccountSection`.
        provider=provider or "",
        character=char_out,
        is_admin=is_admin,
        is_owner=is_admin and await account_is_owner(account.id, session),
        can_create_additional_character=eligibility.can_create_additional_character,
        can_start_as_albescent=eligibility.can_start_as_albescent,
        # Through the seam (#2400): admins see, but cannot join, Albescent.
        albescent_revealed=is_albescent_revealed(account, is_admin=is_admin),
        # The seam resolves reveal-implies-glimpse (#2770).
        albescent_glimpsed=is_albescent_glimpsed(account, is_admin=is_admin),
        second_character_level_required=era.second_character_level_required,
        albescent_level_required=era.albescent_level_required,
        vote_level_required=era.vote_level_required,
        era_name=era.name,
        **asdict(capabilities),
    )
