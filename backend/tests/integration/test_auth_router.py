"""Integration tests for capability flags on GET /auth/me.

Companion unit tests live in tests/unit/test_character_capabilities.py; this
file only covers the serialization round-trip through the router.
"""
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
    assert data["can_see_metatasks"] is False
    assert data["can_see_retired_tasks"] is False
    assert data["can_see_pending_tasks"] is False


@pytest.mark.asyncio
async def test_auth_me_capabilities_level_1(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
) -> None:
    """Level-1 character: below every threshold — all four flags False."""
    await _set_character_level(db_session, character.id, era.id, 1)

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_propose_task"] is False
    assert data["can_propose_metatask"] is False
    assert data["can_see_metatasks"] is False
    assert data["can_see_retired_tasks"] is False
    assert data["can_see_pending_tasks"] is False


@pytest.mark.asyncio
async def test_auth_me_capabilities_level_2(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
) -> None:
    """Level-2 character: meets see_retired only."""
    await _set_character_level(db_session, character.id, era.id, 2)

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_propose_task"] is False
    assert data["can_propose_metatask"] is False
    assert data["can_see_metatasks"] is False
    assert data["can_see_retired_tasks"] is True
    assert data["can_see_pending_tasks"] is False


@pytest.mark.asyncio
async def test_auth_me_capabilities_level_3(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
) -> None:
    """Level-3 character: meets propose_task + see_retired + see_pending."""
    await _set_character_level(db_session, character.id, era.id, 3)

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_propose_task"] is True
    assert data["can_propose_metatask"] is False
    assert data["can_see_metatasks"] is False
    assert data["can_see_retired_tasks"] is True
    assert data["can_see_pending_tasks"] is True


@pytest.mark.asyncio
async def test_auth_me_capabilities_level_6(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era: Era,
) -> None:
    """Level-6 character: meets every flag including metatask proposal."""
    await _set_character_level(db_session, character.id, era.id, 6)

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_propose_task"] is True
    assert data["can_propose_metatask"] is True
    assert data["can_see_metatasks"] is True
    assert data["can_see_retired_tasks"] is True
    assert data["can_see_pending_tasks"] is True


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
    assert data["can_see_metatasks"] is True
    assert data["can_see_retired_tasks"] is True
    assert data["can_see_pending_tasks"] is True
