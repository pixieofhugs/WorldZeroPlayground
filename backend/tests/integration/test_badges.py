"""Integration tests for on-read badges (ADR-0033, #459; batched list path #655).

The seed pair keys off one account owning multiple characters, ordered by
created_at (earliest = sock_puppeteer, later = sock_puppet). Both the
single-character read and the list serializer populate badges; the list path
resolves the whole page in one GROUP BY account_id query, so its query count
does not scale with the number of characters returned.
"""
from contextlib import contextmanager
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction


@contextmanager
def _count_selects(db_connection):
    """Collect every SELECT issued on the test connection while the block runs."""
    selects: list[str] = []
    sync_connection = db_connection.sync_connection

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            selects.append(statement)

    event.listen(sync_connection, "before_cursor_execute", before_cursor_execute)
    try:
        yield selects
    finally:
        event.remove(sync_connection, "before_cursor_execute", before_cursor_execute)


async def _add_character_on_new_account(
    db_session: AsyncSession,
    era: Era,
    index: int,
) -> Character:
    """One solo character on its own fresh account — pads out a list page."""
    account = Account(email=f"filler{index}@example.com")
    db_session.add(account)
    await db_session.flush()
    character = Character(
        account_id=account.id,
        username=f"filler{index}",
        display_name=f"Filler {index}",
        faction_slug="na",
    )
    db_session.add(character)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(character)
    return character


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
    some_faction: Faction,
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
async def test_list_endpoint_populates_badges(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """The list serializer resolves badges too (#655 amends ADR-0033)."""
    second = await _add_second_character(
        db_session,
        account,
        era,
        created_at=character.created_at + timedelta(seconds=1),
    )
    resp = await client.get("/characters")
    assert resp.status_code == 200
    badges_by_id = {row["id"]: row["badges"] for row in resp.json()}
    assert badges_by_id[character.id] == [
        {"key": "sock_puppeteer", "name": "Sock Puppeteer"}
    ]
    assert badges_by_id[second.id] == [{"key": "sock_puppet", "name": "Sock Puppet"}]


@pytest.mark.asyncio
async def test_leaderboard_populates_badges(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """/leaderboard shares the batched serializer, so it carries badges too."""
    await _add_second_character(
        db_session,
        account,
        era,
        created_at=character.created_at + timedelta(seconds=1),
    )
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200
    badges_by_id = {row["id"]: row["badges"] for row in resp.json()}
    assert badges_by_id[character.id] == [
        {"key": "sock_puppeteer", "name": "Sock Puppeteer"}
    ]


@pytest.mark.asyncio
async def test_solo_character_has_no_badges_on_list_path(
    client: AsyncClient, character: Character, character2: Character
):
    """Two solo characters on different accounts earn nothing on the list path."""
    resp = await client.get("/characters")
    assert resp.status_code == 200
    assert all(row["badges"] == [] for row in resp.json())


@pytest.mark.asyncio
async def test_list_badge_query_count_does_not_scale_with_page_size(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """The badge join is batched: 2 characters and 10 cost the same queries (#655).

    This is the whole reason ADR-0033's "no badges on list paths" rule could be
    amended — so it is the assertion that has to hold, not the badge payload.
    """
    await _add_character_on_new_account(db_session, era, index=1)

    with _count_selects(db_connection) as small_page:
        small_resp = await client.get("/characters")
    assert small_resp.status_code == 200
    assert len(small_resp.json()) == 2
    small_count = len(small_page)

    for index in range(2, 10):
        await _add_character_on_new_account(db_session, era, index=index)

    with _count_selects(db_connection) as large_page:
        large_resp = await client.get("/characters")
    assert large_resp.status_code == 200
    assert len(large_resp.json()) == 10
    assert len(large_page) == small_count


@pytest.mark.asyncio
async def test_profile_response_never_exposes_account_or_email(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    some_faction: Faction,
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
