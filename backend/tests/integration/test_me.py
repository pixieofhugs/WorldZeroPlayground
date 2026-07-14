"""Integration tests for /me/* account-scoped endpoints (ADR-0019, #270)."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.invitation_letter import InvitationLetter


async def _add_character(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    *,
    username: str,
    status: CharacterStatus = CharacterStatus.active,
    faction_slug: str = "na",
) -> Character:
    ch = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug=faction_slug,
        status=status,
    )
    db_session.add(ch)
    await db_session.flush()
    db_session.add(CharacterStats(character_id=ch.id, era_id=era.id, votes_spent_this_era=0))
    await db_session.commit()
    await db_session.refresh(ch)
    return ch


# --- /me/characters ---------------------------------------------------------


@pytest.mark.asyncio
async def test_my_characters_excludes_banned_includes_paused(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    paused = await _add_character(db_session, account, era, username="pausedlife", status=CharacterStatus.paused)
    await _add_character(db_session, account, era, username="bannedlife", status=CharacterStatus.banned)

    resp = await client.get("/me/characters", headers=auth_headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id in ids
    assert paused.id in ids
    assert len(ids) == 2  # banned excluded


@pytest.mark.asyncio
async def test_my_characters_carried_life_first(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    second = await _add_character(db_session, account, era, username="secondlife")
    account.active_character_id = second.id
    await db_session.commit()

    resp = await client.get("/me/characters", headers=auth_headers)
    assert resp.json()[0]["id"] == second.id


@pytest.mark.asyncio
async def test_my_characters_empty_account(
    client: AsyncClient, account: Account, era: Era, auth_headers: dict
):
    resp = await client.get("/me/characters", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# --- /me/active-character ---------------------------------------------------


@pytest.mark.asyncio
async def test_switch_active_character_happy(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    second = await _add_character(db_session, account, era, username="secondlife")
    resp = await client.post(
        "/me/active-character", json={"character_id": second.id}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["character"]["id"] == second.id

    # /auth/me now resolves to the carried life.
    me = await client.get("/auth/me", headers=auth_headers)
    assert me.json()["character"]["id"] == second.id


@pytest.mark.asyncio
async def test_switch_active_character_not_owned(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    resp = await client.post(
        "/me/active-character", json={"character_id": character2.id}, headers=auth_headers
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_switch_active_character_non_active_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    paused = await _add_character(db_session, account, era, username="pausedlife", status=CharacterStatus.paused)
    resp = await client.post(
        "/me/active-character", json={"character_id": paused.id}, headers=auth_headers
    )
    assert resp.status_code == 409


# --- /me/invited-factions ---------------------------------------------------


@pytest.mark.asyncio
async def test_invited_factions_empty_by_default(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.get("/me/invited-factions", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_invited_factions_account_pooled(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    db_session.add(InvitationLetter(character_id=character.id, faction_slug="ua", era_id=era.id))
    db_session.add(InvitationLetter(character_id=character.id, faction_slug="albescent", era_id=era.id))
    # albescent FK row
    from models.faction import FactionStatus
    db_session.add(Faction(slug="albescent", name="Albescent", description="x", status=FactionStatus.visible))
    await db_session.commit()

    resp = await client.get("/me/invited-factions", headers=auth_headers)
    assert resp.status_code == 200
    # albescent is excluded (never invite-joinable at the picker)
    assert resp.json() == ["ua"]


# --- /auth/me new fields ----------------------------------------------------


@pytest.mark.asyncio
async def test_auth_me_surfaces_gate_copy_fields(
    client: AsyncClient, character: Character, era: Era, auth_headers: dict
):
    from game_config import CURRENT_ERA

    resp = await client.get("/auth/me", headers=auth_headers)
    data = resp.json()
    assert data["second_character_level_required"] == CURRENT_ERA.second_character_level_required
    assert data["era_name"] == CURRENT_ERA.name


# --- /auth/me invitations field (#243) --------------------------------------


@pytest.mark.asyncio
async def test_auth_me_invitations_empty_by_default(
    client: AsyncClient, character: Character, era: Era, auth_headers: dict
):
    """No invitation letters -> empty list on the carried life."""
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["character"]["invitations"] == []


@pytest.mark.asyncio
async def test_auth_me_invitations_single(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """One held current-era invitation surfaces on the carried life."""
    db_session.add(
        InvitationLetter(character_id=character.id, faction_slug="ua", era_id=era.id)
    )
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["character"]["invitations"] == ["ua"]


@pytest.mark.asyncio
async def test_auth_me_invitations_two_sorted_excludes_sentinels(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    faction_ephemerists: Faction,
    auth_headers: dict,
):
    """Two invitations return sorted; na/albescent sentinels are excluded, and
    a sibling life's invite does NOT leak onto the carried life (per-character,
    not account-pooled)."""
    from models.faction import FactionStatus

    # Pin the carried life to `character` so a later-created sibling doesn't
    # become the resolved active character.
    account.active_character_id = character.id

    db_session.add(
        InvitationLetter(character_id=character.id, faction_slug="ua", era_id=era.id)
    )
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug="ephemerists", era_id=era.id
        )
    )
    # A sentinel invite is never surfaced.
    db_session.add(
        Faction(slug="albescent", name="Albescent", description="x", status=FactionStatus.visible)
    )
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug="albescent", era_id=era.id
        )
    )
    # A sibling life's invite must not appear on the carried life.
    sibling = await _add_character(db_session, account, era, username="sibling")
    db_session.add(
        InvitationLetter(character_id=sibling.id, faction_slug="ua", era_id=era.id)
    )
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["character"]["invitations"] == ["ephemerists", "ua"]
