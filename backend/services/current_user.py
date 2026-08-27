"""Assemble the /auth/me CurrentUser payload.

Shared by GET /auth/me and POST /me/active-character so the "switch life then
return the refreshed user" path doesn't duplicate the composition.

Every signed-in page load gates on this request, so the composition is written
to spend as few round trips as it can (#1381). It cannot spend them *in
parallel*: one request holds one ``AsyncSession``, which is a single connection
with a single cursor, so ``asyncio.gather`` over these reads would interleave on
the same connection rather than overlap. The win is therefore fewer queries —
the era row is resolved once here and threaded into every read that needs it,
and the two eligibility flags share one level query.
"""
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import account_has_admin_role
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
    # Resolved once for the stats, invitation and eligibility reads below. None in
    # a fresh environment where no era row has been seeded yet, which is what the
    # zero-stats / no-unlocks fallbacks answer to.
    era_row = await get_current_era_row_safe(session)
    character = await resolve_active_character(account, session)

    char_out = None
    character_level: int | None = None
    level_jump_used_at_level: int | None = None
    if character:
        stats = None
        # #243: surface the active life's own current-era invitation letters so the
        # frontend InvitationWatcher can detect newly-earned ones.
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

    # The one round trip #2155 adds, and it reads a single column rather than
    # the `oauth_providers` relationship — which is `lazy="raise"` anyway, so
    # there is no accidental load to inherit. `LIMIT 1` because an account holds
    # exactly one identity: there is no link-a-second-provider flow (ADR-0075),
    # and if one ever lands, "the provider you signed in with" is a session
    # fact this payload could not answer from the account row regardless.
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
    )

    return CurrentUser(
        account_id=account.id,
        email=account.email,
        # "" rather than None: a demo/seeded account can carry no OAuth row, and
        # the card's provider line is simply absent then — see `AccountSection`.
        provider=provider or "",
        character=char_out,
        is_admin=is_admin,
        can_create_additional_character=eligibility.can_create_additional_character,
        can_start_as_albescent=eligibility.can_start_as_albescent,
        # Through the seam, not off the column (#2400): an admin is *shown* the
        # order without having earned it, and this is the field the whole
        # frontend dresses off — the faction page gate, and the mask that
        # decides whether the word "Albescent" is ever printed. Nothing writes
        # the column, so the reveal goes when the role does.
        #
        # Seeing, not joining: `can_start_as_albescent` above is the join gate
        # and never consults `is_admin`, so the two flags on this payload stay
        # the two separate answers they are.
        albescent_revealed=is_albescent_revealed(account, is_admin=is_admin),
        # Through the same seam family, and the seam is where reveal-implies-
        # glimpse is resolved (#2770): the client receives two flags that are
        # already consistent, so no surface has to remember to check both.
        albescent_glimpsed=is_albescent_glimpsed(account, is_admin=is_admin),
        second_character_level_required=era.second_character_level_required,
        albescent_level_required=era.albescent_level_required,
        era_name=era.name,
        **asdict(capabilities),
    )
