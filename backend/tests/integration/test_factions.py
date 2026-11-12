"""Integration tests for /factions endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_list_factions_returns_visible(
    client: AsyncClient,
    some_faction: Faction,
):
    resp = await client.get("/factions")
    assert resp.status_code == 200
    data = resp.json()
    slugs = [f["slug"] for f in data]
    assert DEFAULT_FACTION_SLUG in slugs
    assert "na" not in slugs


@pytest.mark.asyncio
async def test_list_factions_structure(
    client: AsyncClient,
    some_faction: Faction,
):
    """ADR-0038: slug + status only; prose lives in the frontend catalog."""
    resp = await client.get("/factions")
    assert resp.status_code == 200
    for faction in resp.json():
        assert "slug" in faction
        assert "status" in faction
        assert "name" not in faction
        assert "description" not in faction


@pytest.mark.asyncio
async def test_faction_status_authenticated(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    some_faction: Faction,
    era: Era,
):
    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "current_faction_slug" in data
    assert "all_factions" in data
    assert data["current_faction_slug"] == character.faction_slug


@pytest.mark.asyncio
async def test_faction_status_unauthenticated(client: AsyncClient):
    resp = await client.get("/factions/status")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_faction_status_carries_invitation_letters(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    some_faction: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """Invitation letters ride on /status (#1384); asserts the stored timestamp, not
    just presence."""
    from datetime import datetime

    from sqlalchemy import select

    from models.invitation_letter import InvitationLetter

    db_session.add(InvitationLetter(
        character_id=character.id,
        faction_slug=DEFAULT_FACTION_SLUG,
        era_id=era.id,
    ))
    await db_session.commit()

    stored = (await db_session.execute(
        select(InvitationLetter).where(InvitationLetter.character_id == character.id)
    )).scalars().one()

    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    letters = resp.json()["invitations"]
    assert [letter["faction_slug"] for letter in letters] == [DEFAULT_FACTION_SLUG]
    assert datetime.fromisoformat(letters[0]["delivered_at"]) == stored.delivered_at


@pytest.mark.asyncio
async def test_faction_status_invitations_empty_without_letters(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    some_faction: Faction,
    era: Era,
):
    """Present and empty, never absent."""
    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["invitations"] == []


@pytest.mark.asyncio
async def test_invitations_endpoint_is_gone(
    client: AsyncClient,
    auth_headers: dict,
):
    """Folded into /status (#1384)."""
    resp = await client.get("/factions/invitations", headers=auth_headers)
    assert resp.status_code == 404


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
    some_faction: Faction,
    era: Era,
    db_session: AsyncSession,
):
    from models.faction import Faction as FactionModel
    from sqlalchemy import select

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
    # choose answers the refreshed CurrentUser (#1383).
    assert resp.json()["character"]["faction_slug"] == "wow"


@pytest.mark.asyncio
async def test_choose_faction_without_invitation_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    some_faction: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """#454."""
    await _seed_faction(db_session, "wow")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == DEFAULT_FACTION_SLUG


async def _seed_faction(session: AsyncSession, slug: str) -> None:
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
    """Stamp the account unlock and keep the character below the bar (ADR-0080, #2399).

    The earn predicate is tested in ``test_albescent_unlock.py``. The level must
    be under ``albescent_level_required``: a life at the bar can never join.
    """
    from sqlalchemy import select

    from game_config import CURRENT_ERA
    from models.character_stats import CharacterStats

    account = await session.get(Account, character.account_id)
    account.albescent_unlocked = True

    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = CURRENT_ERA.albescent_level_required - 1
    await session.commit()


@pytest.mark.asyncio
async def test_choose_albescent_ineligible_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """can_always_rejoin clears the defection guard; eligibility must still refuse."""
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_choose_albescent_eligible_succeeds(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """No letter seeded: `can_always_rejoin` bypasses the #454 invitation gate."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["character"]["faction_slug"] == "albescent"
    # The ADR-0027 reveal arrives in the join's own response (#1383).
    assert body["albescent_revealed"] is True


@pytest.mark.asyncio
async def test_choose_nonexistent_faction(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
):
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "does_not_exist"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_factions_serves_albescent_to_an_unrevealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    some_faction: Faction,
    db_session: AsyncSession,
):
    """The row is served to everyone; redaction happens at render (#2409, ADR-0082).

    ``utils/factions.ts`` renders Albescent strings as ``[REDACTED]`` for an
    unrevealed viewer. ``FactionOut`` is `{slug, status}`, so no prose leaks.
    """
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions", headers=auth_headers)
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" in slugs
    assert DEFAULT_FACTION_SLUG in slugs
    # Guard: passes for the wrong reason if a fixture starts stamping the unlock.
    await db_session.refresh(account)
    assert account.albescent_revealed is False
    assert account.albescent_unlocked is False


@pytest.mark.asyncio
async def test_list_factions_serves_albescent_to_an_anonymous_caller(
    client: AsyncClient,
    some_faction: Faction,
    db_session: AsyncSession,
):
    """The listing does not depend on who is asking (#2409)."""
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions")
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" in slugs
    assert DEFAULT_FACTION_SLUG in slugs


@pytest.mark.asyncio
async def test_albescent_join_reveals_and_lists(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """The join writes ``albescent_revealed``.

    The column stays load-bearing: pre-#2399 joiners carry the reveal without
    the unlock stamp. Listing is open pre-join since qualifying reveals (#2518).
    """
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    before = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in before.json()]
    await db_session.refresh(account)
    assert account.albescent_revealed is False

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    await db_session.refresh(account)
    assert account.albescent_revealed is True

    after = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in after.json()]


@pytest.mark.asyncio
async def test_the_ladder_rung_is_display_only_never_the_gate(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """The ``join_albescent`` rung is display copy, never the gate (#1891).

    Eligibility reads ``account.albescent_unlocked`` (ADR-0080) + the ceiling,
    never ``level_profiles``. A revealed-but-unstamped account (old joiner) is
    shown the rung and still refused.
    """
    await _seed_faction(db_session, "albescent")
    account.albescent_revealed = True
    await db_session.commit()

    config = (await client.get("/game-config", headers=auth_headers)).json()
    keys = {
        unlock["key"]
        for profile in config["level_profiles"]
        for unlock in profile["unlocks"]
    }
    assert "join_albescent" in keys

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["albescent_revealed"] is True
    assert me["can_start_as_albescent"] is False

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert (
        resp.json()["detail"]["code"] == ErrorCode.faction_albescent_not_eligible.value
    )


@pytest.mark.asyncio
async def test_albescent_reveal_is_sticky_not_derived_from_membership(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Reveal survives leaving Albescent."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    join = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert join.status_code == 200

    # Leaving means joining wow: needs its row and letter (#454).
    await _seed_faction(db_session, "wow")
    await _seed_invitation(db_session, character.id, "wow", era.id)
    leave = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert leave.status_code == 200

    await db_session.refresh(character)
    assert character.faction_slug != "albescent"

    await db_session.refresh(account)
    assert account.albescent_revealed is True

    listed = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in listed.json()]
