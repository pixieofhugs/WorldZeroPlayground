"""Integration tests for on-read badges on GET /characters/{id} (ADR-0033, #459).

The seed pair keys off one account owning multiple characters, ordered by
created_at (earliest = sock_puppeteer, later = sock_puppet). Badges are
populated only by the single-character read — the list endpoint leaves the
field empty.
"""
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction


async def _add_second_character(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    created_at: datetime,
) -> Character:
    """Insert a second life for ``account`` directly (bypasses the level gate)."""
    second = Character(
        account_id=account.id,
        username="secondlife",
        display_name="Second Life",
        faction_slug="na",
        created_at=created_at,
    )
    db_session.add(second)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=second.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(second)
    return second


@pytest.mark.asyncio
async def test_solo_character_has_no_badges(
    client: AsyncClient, character: Character
):
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    assert resp.json()["badges"] == []


@pytest.mark.asyncio
async def test_two_lives_earn_sock_puppeteer_and_sock_puppet(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    second = await _add_second_character(
        db_session,
        account,
        era,
        created_at=character.created_at + timedelta(seconds=1),
    )

    first_resp = await client.get(f"/characters/{character.id}")
    assert first_resp.status_code == 200
    assert first_resp.json()["badges"] == [
        {"key": "sock_puppeteer", "name": "Sock Puppeteer"}
    ]

    second_resp = await client.get(f"/characters/{second.id}")
    assert second_resp.status_code == 200
    assert second_resp.json()["badges"] == [
        {"key": "sock_puppet", "name": "Sock Puppet"}
    ]


@pytest.mark.asyncio
async def test_other_accounts_do_not_cross_pollinate(
    client: AsyncClient, character: Character, character2: Character
):
    """Two solo characters on different accounts earn nothing from each other."""
    for character_id in (character.id, character2.id):
        resp = await client.get(f"/characters/{character_id}")
        assert resp.status_code == 200
        assert resp.json()["badges"] == []


@pytest.mark.asyncio
async def test_list_endpoint_does_not_evaluate_badges(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    """Badges appear empty in the list serializer even when they'd be earned."""
    await _add_second_character(
        db_session,
        account,
        era,
        created_at=character.created_at + timedelta(seconds=1),
    )
    resp = await client.get("/characters")
    assert resp.status_code == 200
    rows = resp.json()
    assert rows, "expected at least the fixture characters"
    assert all(row["badges"] == [] for row in rows)


@pytest.mark.asyncio
async def test_profile_response_never_exposes_account_or_email(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    faction_ua: Faction,
):
    await _add_second_character(
        db_session,
        account,
        era,
        created_at=character.created_at + timedelta(seconds=1),
    )
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "account_id" not in data
    assert "email" not in data
    for badge in data["badges"]:
        assert set(badge.keys()) == {"key", "name"}
