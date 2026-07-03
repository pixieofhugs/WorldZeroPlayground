"""Integration tests for /factions endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.roles import AccountRole, Role


# ---------------------------------------------------------------------------
# List factions (public)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_factions_returns_visible(
    client: AsyncClient,
    faction_ua: Faction,
):
    """GET /factions returns only visible factions."""
    resp = await client.get("/factions")
    assert resp.status_code == 200
    data = resp.json()
    slugs = [f["slug"] for f in data]
    # "ua" is visible; seeded in faction_ua fixture
    assert "ua" in slugs
    # "na" is hidden; must not appear
    assert "na" not in slugs


@pytest.mark.asyncio
async def test_list_factions_structure(
    client: AsyncClient,
    faction_ua: Faction,
):
    """Each faction in the list has the expected fields."""
    resp = await client.get("/factions")
    assert resp.status_code == 200
    for faction in resp.json():
        assert "slug" in faction
        assert "name" in faction
        assert "description" in faction


# ---------------------------------------------------------------------------
# Faction status (authenticated — requires era seed)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_faction_status_authenticated(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
):
    """GET /factions/status returns current faction and status map."""
    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "current_faction_slug" in data
    assert "all_factions" in data
    assert data["current_faction_slug"] == character.faction_slug


@pytest.mark.asyncio
async def test_faction_status_unauthenticated(client: AsyncClient):
    """GET /factions/status without auth returns 401."""
    resp = await client.get("/factions/status")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Defection history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_defection_history_empty(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
):
    """A fresh character has no defection history."""
    resp = await client.get("/factions/defection-history", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Choose faction (defection)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_choose_faction_from_ua(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """Character can defect from UA to wow (a selectable faction in era config)."""
    from models.faction import Faction as FactionModel
    from sqlalchemy import select

    # Seed the wow faction in the DB (required for FK constraint)
    existing = await db_session.execute(select(FactionModel).where(FactionModel.slug == "wow"))
    if existing.scalar_one_or_none() is None:
        db_session.add(FactionModel(
            slug="wow",
            name="Warriors of Whimsy",
            description="Collective-minded",
            status=FactionStatus.visible,
        ))
        await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["slug"] == "wow"


# ---------------------------------------------------------------------------
# Albescent join gate (ADR-0021, #395)
# ---------------------------------------------------------------------------


async def _seed_faction(session: AsyncSession, slug: str) -> None:
    """Seed a Faction row (FK target) if it doesn't already exist."""
    from sqlalchemy import select

    existing = await session.execute(select(Faction).where(Faction.slug == slug))
    if existing.scalar_one_or_none() is None:
        session.add(Faction(
            slug=slug,
            name=slug,
            description=f"{slug} test faction",
            status=FactionStatus.visible,
        ))
        await session.flush()


async def _make_account_albescent_eligible(
    session: AsyncSession,
    character: Character,
    era: Era,
) -> None:
    """Meet the ADR-0021 bar: level 8 + a submitted praxis in every non-sentinel faction."""
    from sqlalchemy import select

    from game_config import CURRENT_ERA
    from models.character_stats import CharacterStats
    from models.praxis import Praxis, PraxisStatus, PraxisType
    from models.task import Task, TaskStatus

    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = CURRENT_ERA.albescent_level_required

    sentinel_slugs = frozenset({"na", "aged_out", "albescent"})
    for faction_slug in CURRENT_ERA.factions:
        if faction_slug in sentinel_slugs:
            continue
        await _seed_faction(session, faction_slug)
        task = Task(
            title=f"Albescent gate task: {faction_slug}",
            description="test",
            point_value=5,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug=faction_slug,
        )
        session.add(task)
        await session.flush()
        session.add(Praxis(
            task_id=task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title=f"Albescent gate praxis: {faction_slug}",
            body_text="proof",
            status=PraxisStatus.submitted,
        ))
    await session.commit()


@pytest.mark.asyncio
async def test_choose_albescent_ineligible_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """An account that hasn't met the ADR-0021 bar gets 403 defecting to Albescent.

    Albescent is is_selectable=False + can_always_rejoin=True, which slips the
    selectability guard — the eligibility guard must still refuse the join.
    """
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == "ua"


@pytest.mark.asyncio
async def test_choose_albescent_eligible_succeeds(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """An eligible account (level 8 + full faction coverage) may defect to Albescent."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["slug"] == "albescent"


@pytest.mark.asyncio
async def test_choose_nonexistent_faction(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
):
    """Choosing a faction not in the era config returns 404."""
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "does_not_exist"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update faction (admin-only)
# ---------------------------------------------------------------------------


async def _make_admin(account: Account, session: AsyncSession) -> None:
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    ar = AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    session.add(ar)
    await session.commit()


@pytest.mark.asyncio
async def test_update_faction_admin_success(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    faction_ua: Faction,
    db_session: AsyncSession,
):
    """Admin can update a faction's name and description."""
    await _make_admin(account, db_session)
    resp = await client.put(
        "/factions/ua",
        json={"name": "United Alliance", "description": "Updated description."},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "United Alliance"
    assert data["description"] == "Updated description."
    assert data["slug"] == "ua"


@pytest.mark.asyncio
async def test_update_faction_non_admin_forbidden(
    client: AsyncClient,
    auth_headers: dict,
    faction_ua: Faction,
):
    """Non-admin accounts get 403 when attempting to update a faction."""
    resp = await client.put(
        "/factions/ua",
        json={"name": "Hijacked", "description": "Nope."},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_faction_not_found(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """PUT /factions/{slug} returns 404 for an unknown slug."""
    await _make_admin(account, db_session)
    resp = await client.put(
        "/factions/does_not_exist",
        json={"name": "Ghost", "description": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 404
