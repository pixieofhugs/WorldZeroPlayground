"""Query-count guard for /auth/me (#1381); every signed-in page load waits on it.

Listens on the ``Engine`` class (fires for the async engine too), SELECTs only.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.roles import AccountRole, Role
from tests.integration.factories import DEFAULT_FACTION_SLUG
from tests.integration.query_capture import capture_selects


@pytest.fixture
async def dressed_viewer(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
) -> Account:
    """Every /auth/me branch live, so the deepest path is counted."""
    account.active_character_id = character.id

    role = Role(name="admin")
    db_session.add(role)
    await db_session.flush()
    db_session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )

    stats = await db_session.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats.level = CURRENT_ERA.albescent_level_required
    stats.score = 1000

    db_session.add(
        InvitationLetter(
            character_id=character.id,
            era_id=era.id,
            faction_slug=DEFAULT_FACTION_SLUG,
        )
    )
    await db_session.commit()
    return account


@pytest.mark.asyncio
async def test_auth_me_query_count(
    client: AsyncClient,
    dressed_viewer: Account,
    auth_headers: dict,
):
    """Was 12 SELECTs before #1381. Raise the budget only with a reason."""
    with capture_selects() as statements:
        resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert len(statements) <= 8, "\n\n".join(statements)
