"""Integration tests for /factions endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus


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
    """Each faction in the list has the expected fields.

    ADR-0038: the backend emits slug + status only; name/description prose lives
    in the frontend factions.json catalog and is never returned here.
    """
    resp = await client.get("/factions")
    assert resp.status_code == 200
    for faction in resp.json():
        assert "slug" in faction
        assert "status" in faction
        assert "name" not in faction
        assert "description" not in faction


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


# ---------------------------------------------------------------------------
# Choose faction (defection)
# ---------------------------------------------------------------------------


async def _seed_invitation(
    session: AsyncSession,
    character_id: int,
    faction_slug: str,
    era_id: int,
) -> None:
    """Seed the invitation letter that gates defecting into faction_slug (#454)."""
    from models.invitation_letter import InvitationLetter

    session.add(InvitationLetter(
        character_id=character_id,
        faction_slug=faction_slug,
        era_id=era_id,
    ))
    await session.commit()


@pytest.mark.asyncio
async def test_choose_faction_with_invitation_succeeds(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """A character holding wow's current-era invitation can defect into wow."""
    from models.faction import Faction as FactionModel
    from sqlalchemy import select

    # Seed the wow faction in the DB (required for FK constraint)
    existing = await db_session.execute(select(FactionModel).where(FactionModel.slug == "wow"))
    if existing.scalar_one_or_none() is None:
        db_session.add(FactionModel(
            slug="wow",
            status=FactionStatus.visible,
        ))
        await db_session.commit()

    await _seed_invitation(db_session, character.id, "wow", era.id)

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["slug"] == "wow"


@pytest.mark.asyncio
async def test_choose_faction_without_invitation_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """Defecting into a faction without holding its invitation letter is 403 (#454)."""
    await _seed_faction(db_session, "wow")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == "ua"


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

    sentinel_slugs = frozenset({"na", "albescent"})
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

    Albescent's can_always_rejoin=True clears the defection guard, so the
    eligibility guard must still refuse the join.
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
    """An eligible account (level 8 + full faction coverage) may defect to Albescent.

    No invitation letter is seeded: `can_always_rejoin` supersedes the #454
    invitation gate — the ADR-0021 eligibility bar is Albescent's only gate.
    """
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
# Albescent secret-society reveal gate (ADR-0027, #390)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_factions_hides_albescent_when_unrevealed(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    faction_ua: Faction,
    db_session: AsyncSession,
):
    """Albescent is a secret society: an account with no albescent history never
    sees it in GET /factions, even though the row is a visible faction."""
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions", headers=auth_headers)
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" not in slugs
    # Non-secret visible factions still show.
    assert "ua" in slugs


@pytest.mark.asyncio
async def test_list_factions_hides_albescent_when_anonymous(
    client: AsyncClient,
    faction_ua: Faction,
    db_session: AsyncSession,
):
    """Anonymous callers stay anonymous and never see the secret society."""
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions")
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" not in slugs


@pytest.mark.asyncio
async def test_albescent_join_reveals_and_lists(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """A successful Albescent defect flips albescent_revealed and unlocks the
    faction in GET /factions for that account."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    # Pre-join: hidden.
    before = await client.get("/factions", headers=auth_headers)
    assert "albescent" not in [f["slug"] for f in before.json()]

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    # The sticky flag is now set on the account.
    await db_session.refresh(account)
    assert account.albescent_revealed is True

    # And the faction now surfaces for this account.
    after = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in after.json()]


@pytest.mark.asyncio
async def test_albescent_reveal_is_sticky_not_derived_from_membership(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Reveal survives leaving Albescent — it is not derived from live membership.

    After joining (which reveals), the character defects back to a real faction;
    the flag stays True and the faction stays listed."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    join = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert join.status_code == 200

    # Leave Albescent for a real faction (albescent can_always_rejoin, and the
    # target is one covered by the eligibility seeding). Leaving still means
    # joining wow, so the character needs wow's invitation letter (#454).
    await _seed_invitation(db_session, character.id, "wow", era.id)
    leave = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert leave.status_code == 200

    await db_session.refresh(character)
    assert character.faction_slug != "albescent"

    # Flag persists even with no live Albescent membership.
    await db_session.refresh(account)
    assert account.albescent_revealed is True

    listed = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in listed.json()]


# ADR-0038: the admin faction-copy edit path (PUT /factions/{slug},
# update_faction, FactionUpdate) has been retired — faction name/description
# prose is config-canonical and lives in frontend/src/locales/en/factions.json,
# so there is nothing to edit through the API. No update tests remain.
