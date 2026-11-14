"""Capability flags on GET /auth/me; unit tests: test_character_capabilities.py."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.roles import AccountRole, Role


async def _set_character_level(
    db_session: AsyncSession,
    character_id: int,
    era_id: int,
    level: int,
) -> None:
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await db_session.commit()


async def _grant_admin(db_session: AsyncSession, account_id: int) -> None:
    role = Role(name="admin", description="Administrator")
    db_session.add(role)
    await db_session.flush()
    db_session.add(
        AccountRole(account_id=account_id, role_id=role.id, granted_by=account_id)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_auth_me_capabilities_no_character(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
) -> None:
    """Authenticated account with no character: all four flags False."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_propose_task"] is False
    assert data["can_propose_metatask"] is False
    assert data["can_see_retired_tasks"] is False
    assert data["can_see_pending_tasks"] is False


@pytest.mark.asyncio
async def test_auth_me_capabilities_admin_short_circuit(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
) -> None:
    """Admin at level 1: every flag True regardless of level."""
    await _set_character_level(db_session, character.id, era.id, 1)
    await _grant_admin(db_session, account.id)

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_admin"] is True
    assert data["can_propose_task"] is True
    assert data["can_propose_metatask"] is True
    assert data["can_see_retired_tasks"] is True
    assert data["can_see_pending_tasks"] is True
