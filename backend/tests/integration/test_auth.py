"""Integration tests for /auth endpoints."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account
from models.character import Character


@pytest.mark.asyncio
async def test_auth_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_no_character(client: AsyncClient, account: Account, auth_headers: dict):
    """Authenticated account with no character returns account_id + character=None."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["account_id"] == account.id
    assert data["character"] is None


@pytest.mark.asyncio
async def test_auth_me_with_character(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["account_id"] == account.id
    assert data["character"]["id"] == character.id
    assert data["character"]["username"] == character.username


@pytest.mark.asyncio
async def test_auth_logout(client: AsyncClient):
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_invalid_token(client: AsyncClient):
    resp = await client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# New tests for T.7
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auth_me_returns_character_stats(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    """GET /auth/me includes character stats fields (level, score, votes_available)."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    char = data["character"]
    assert char is not None
    # CharacterOut exposes stats
    assert "level" in char
    assert "score" in char
    assert char["level"] >= 0


@pytest.mark.asyncio
async def test_auth_me_not_admin_by_default(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    """GET /auth/me returns is_admin=False for a non-admin account."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is False


@pytest.mark.asyncio
async def test_auth_me_does_not_expose_email(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    """GET /auth/me must never return email in the response body."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    body_text = resp.text
    assert account.email not in body_text
    assert "email" not in resp.json()


@pytest.mark.asyncio
async def test_auth_logout_clears_cookie(client: AsyncClient):
    """POST /auth/logout instructs the browser to clear the access_token cookie."""
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200
    # The response should set a delete-cookie header for access_token
    set_cookie = resp.headers.get("set-cookie", "")
    assert "access_token" in set_cookie


@pytest.mark.asyncio
async def test_auth_logout_response_body(client: AsyncClient):
    """POST /auth/logout returns a JSON message."""
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_expired_token(client: AsyncClient, account: Account):
    """An expired JWT token returns 401."""
    expired_payload = {
        "sub": str(account.id),
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_malformed_token_no_sub(client: AsyncClient):
    """A JWT with no 'sub' claim returns 401."""
    bad_payload = {
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
        # deliberately omit 'sub'
    }
    bad_token = jwt.encode(bad_payload, settings.SECRET_KEY, algorithm="HS256")

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_token_wrong_signature(client: AsyncClient, account: Account):
    """A JWT signed with the wrong key returns 401."""
    wrong_key_payload = {
        "sub": str(account.id),
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
    }
    wrong_token = jwt.encode(wrong_key_payload, "wrong-secret-key", algorithm="HS256")

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {wrong_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_bearer_prefix_required(client: AsyncClient, auth_headers: dict):
    """Token without 'Bearer ' prefix is not recognized as a bearer token."""
    # Extract the raw token from auth_headers
    token = auth_headers["Authorization"].split(" ")[1]
    # Send without "Bearer" prefix — this should fail
    resp = await client.get("/auth/me", headers={"Authorization": token})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_with_character_username(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    """GET /auth/me character field includes username and display_name."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    char = resp.json()["character"]
    assert char["username"] == character.username
    assert char["display_name"] == character.display_name


@pytest.mark.asyncio
async def test_auth_me_with_character_faction(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    """GET /auth/me character field includes faction_slug."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    char = resp.json()["character"]
    assert char["faction_slug"] == character.faction_slug


@pytest.mark.asyncio
async def test_auth_me_exposes_votes_available(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """GET /auth/me surfaces the on-read computed vote budget (R.5).

    votes_available = base + floor(multiplier * score) - votes_spent_this_era
    """
    from math import floor
    from sqlalchemy import select

    from game_config import CURRENT_ERA
    from models.character_stats import CharacterStats

    # Seed a known score on the character
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.score = 100
    stats.votes_spent_this_era = 0
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    char = resp.json()["character"]
    assert char is not None
    assert "votes_available" in char

    expected = (
        CURRENT_ERA.vote_budget_base
        + floor(CURRENT_ERA.vote_budget_multiplier * 100)
        - 0
    )
    assert char["votes_available"] == expected

    # Admin patches votes_available lower; re-fetch /auth/me and confirm update.
    # (Uses the admin service layer directly; emulates an admin patch.)
    from schemas.admin import CharacterStatsPatch
    from services.admin_service import set_character_stats
    from models.roles import AccountRole, Role

    # Grant admin to this account so we can call the admin endpoint
    role = Role(name="admin", description="Administrator")
    db_session.add(role)
    await db_session.flush()
    db_session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )
    await db_session.commit()

    # Patch votes_available to 42 via the admin service
    await set_character_stats(
        character.id,
        CharacterStatsPatch(votes_available=42),
        db_session,
    )

    # Re-fetch /auth/me
    resp2 = await client.get("/auth/me", headers=auth_headers)
    assert resp2.status_code == 200
    updated_char = resp2.json()["character"]
    # The computed value must reflect the admin patch
    assert updated_char["votes_available"] == 42
