"""Integration tests for /auth endpoints."""
from datetime import datetime, timedelta, timezone

import pytest
from authlib.jose import JsonWebToken
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account
from models.character import Character

_JWT = JsonWebToken(["HS256"])


def _mint(payload: dict, key: str | None = None) -> str:
    """Sign a token directly, bypassing ``create_jwt``.

    The rejection tests below need token shapes ``create_jwt`` will never
    produce. ``exp`` is a NumericDate, so datetimes are converted here rather
    than at each call site.
    """
    claims = dict(payload)
    if isinstance(claims.get("exp"), datetime):
        claims["exp"] = int(claims["exp"].timestamp())
    return _JWT.encode({"alg": "HS256"}, claims, key or settings.SECRET_KEY).decode()


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
    """GET /auth/me includes character stats fields (level, score)."""
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
    expired_token = _mint(expired_payload)

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
    bad_token = _mint(bad_payload)

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
    wrong_token = _mint(wrong_key_payload, key="wrong-secret-key")

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
async def test_auth_me_omits_votes_available(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """CharacterOut no longer carries the vote budget (#1387).

    The budget is still computed on read (ADR-0043) and still enforced on cast;
    it simply is not projected onto every character row. Its reader is
    ``VoteCastOut.viewer_stats`` (#1382), asserted in test_votes.py, and the
    admin surface keeps its own ``schemas.admin`` shape (test_admin.py).

    Seeds a non-zero score so a leftover serializer would emit a *truthy* value
    rather than a defaulted zero — the key must be absent either way.
    """
    from sqlalchemy import select

    from models.character_stats import CharacterStats

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
    assert "votes_available" not in char


# ---------------------------------------------------------------------------
# Bug 2: eligibility flags for additional characters / Albescent start
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_me_can_create_additional_character_true_when_level_4_plus(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Account with a level-4 character: can_create_additional_character=True,
    can_start_as_albescent=False."""
    from sqlalchemy import select

    from models.character_stats import CharacterStats

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 4
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_create_additional_character"] is True
    assert data["can_start_as_albescent"] is False


@pytest.mark.asyncio
async def test_me_can_create_additional_character_false_when_below_level_4(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
    """Account whose highest character is level-3: both flags false."""
    from sqlalchemy import select

    from models.character_stats import CharacterStats

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 3
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_create_additional_character"] is False
    assert data["can_start_as_albescent"] is False


@pytest.mark.asyncio
async def test_me_reports_albescent_from_the_stamped_column(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
    faction_ua,
):
    """#2399: the flag is the stamped column, never a live recomputation.

    The old ADR-0021 gate would have answered True on the first request below —
    level 8 with a submitted praxis in every faction was exactly what it asked
    for. It must not any more: nothing has stamped this account, so the door is
    shut however much work is lying around.
    """
    from game_config import CURRENT_ERA
    from models.character_stats import CharacterStats
    from models.faction import Faction, FactionStatus
    from models.praxis import Praxis, PraxisStatus, PraxisType
    from models.task import Task, TaskStatus
    from sqlalchemy import select

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = CURRENT_ERA.albescent_level_required
    await db_session.commit()

    # Exactly the ADR-0021 seeding: one submitted praxis per non-sentinel faction.
    sentinel_slugs = frozenset({"na", "albescent"})
    for faction_slug in CURRENT_ERA.factions:
        if faction_slug in sentinel_slugs:
            continue
        faction_result = await db_session.execute(
            select(Faction).where(Faction.slug == faction_slug)
        )
        if faction_result.scalar_one_or_none() is None:
            db_session.add(
                Faction(slug=faction_slug, status=FactionStatus.visible)
            )
            await db_session.flush()

        task = Task(
            title=f"Albescent gate task: {faction_slug}",
            description="test",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug=faction_slug,
        )
        db_session.add(task)
        await db_session.flush()
        db_session.add(
            Praxis(
                task_id=task.id,
                created_by_id=character.id,
                type=PraxisType.solo,
                title=f"Albescent gate praxis: {faction_slug}",
                body_text="proof",
                status=PraxisStatus.submitted,
            )
        )
    await db_session.commit()

    data = (await client.get("/auth/me", headers=auth_headers)).json()
    assert data["can_create_additional_character"] is True
    assert data["can_start_as_albescent"] is False
    # The ceiling rides along so the standing letter can name which lives may
    # still answer it without duplicating the number as a frontend literal.
    assert data["albescent_level_required"] == CURRENT_ERA.albescent_level_required

    account.albescent_unlocked = True
    await db_session.commit()

    data = (await client.get("/auth/me", headers=auth_headers)).json()
    assert data["can_start_as_albescent"] is True


@pytest.mark.asyncio
async def test_me_can_create_additional_character_false_with_no_characters(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    """Brand-new account with no characters: both flags false."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_create_additional_character"] is False
    assert data["can_start_as_albescent"] is False
