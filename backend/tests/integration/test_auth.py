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
    """Sign a token directly, for shapes ``create_jwt`` never produces."""
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




@pytest.mark.asyncio
async def test_auth_me_returns_character_stats(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    char = data["character"]
    assert char is not None
    assert "level" in char
    assert "score" in char
    assert char["level"] >= 0


@pytest.mark.asyncio
async def test_auth_me_not_admin_by_default(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is False


@pytest.mark.asyncio
async def test_auth_me_exposes_the_callers_own_email_and_no_other(
    client: AsyncClient,
    account: Account,
    account2: Account,
    auth_headers: dict,
):
    """``/auth/me`` returns the caller's own email (#2155; account card). Which
    schemas may carry an email is ratcheted in ``test_auth_me_account_fields.py``.
    """
    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == account.email
    assert account2.email not in resp.text


@pytest.mark.asyncio
async def test_auth_logout_clears_cookie(client: AsyncClient):
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "Max-Age=0" in set_cookie


@pytest.mark.asyncio
async def test_auth_logout_response_body(client: AsyncClient):
    resp = await client.post("/auth/logout")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_expired_token(client: AsyncClient, account: Account):
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
    bad_payload = {
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
    }
    bad_token = _mint(bad_payload)

    resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_token_wrong_signature(client: AsyncClient, account: Account):
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
    token = auth_headers["Authorization"].split(" ")[1]
    resp = await client.get("/auth/me", headers={"Authorization": token})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_with_character_username(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
):
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
    """CharacterOut no longer carries the vote budget (#1387); its reader is
    ``VoteCastOut.viewer_stats``. Non-zero score so a leftover would be truthy.
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


# --- Eligibility flags: additional characters / Albescent start ---


@pytest.mark.asyncio
async def test_me_can_create_additional_character_true_when_level_4_plus(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    era,
):
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
    some_faction,
):
    """#2399: the flag is the stamped column, never a live recomputation, even when
    the old ADR-0021 coverage is all present.
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
    # Ceiling rides along so the frontend need not duplicate the number.
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
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_create_additional_character"] is False
    assert data["can_start_as_albescent"] is False
