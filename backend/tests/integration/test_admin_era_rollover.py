"""The mod control that ends an era (ADR-0091, #827).

Pins that a mod's HTTP request reaches the live-era binding, writes the row, and
resets with the INCOMING era's flags. Binding mechanics: test_live_era_binding.py.
conftest's autouse ``restore_live_era`` stops a rollover leaking out of a test.
"""
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import game_config
from game_config import era_config_for_key
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from seed import HIDDEN_FACTION_SLUGS
from tests.integration.factories import make_admin

# --- GET /admin/eras ---


async def test_listing_eras_requires_admin(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/admin/eras", headers=auth_headers)
    assert resp.status_code == 403


async def test_rolling_requires_admin(client: AsyncClient, auth_headers: dict):
    """No undo, and ``Era.started_by`` records whoever got through."""
    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
    assert resp.status_code == 403


async def test_lists_every_registered_era_and_marks_the_live_one(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
):
    await make_admin(db_session, account)

    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    rows = resp.json()
    assert [row["config_key"] for row in rows] == ["era_1", "era_2"]
    assert [row["name"] for row in rows] == [
        era_config_for_key("era_1").name,
        era_config_for_key("era_2").name,
    ]
    live = [row["config_key"] for row in rows if row["is_live"]]
    assert live == [era.config_key]


async def test_the_selector_marks_live_from_the_row_not_the_process(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
):
    """``is_live`` must come from the row, as the ``PUT``'s refusal does: an
    unregistered ``config_key`` leaves the process on the fallback, and the two
    would disagree.
    """
    await make_admin(db_session, account)
    db_session.add(Era(name="whatever", config_key="era_2", started_by=account.id))
    await db_session.commit()
    assert game_config.CURRENT_ERA.config_key == "era_1", "the process has not moved"

    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    live = [row["config_key"] for row in resp.json() if row["is_live"]]
    assert live == ["era_2"]


async def test_the_selector_falls_back_to_the_process_with_no_era_row(
    client: AsyncClient, db_session: AsyncSession, account: Account, auth_headers: dict
):
    """A fresh database: the compile-time era is what the game plays by."""
    await make_admin(db_session, account)
    assert (await db_session.execute(select(Era))).scalar_one_or_none() is None

    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    live = [row["config_key"] for row in resp.json() if row["is_live"]]
    assert live == [game_config.CURRENT_ERA.config_key]


# --- PUT /admin/eras/live ---


async def test_rolling_into_an_unregistered_era_changes_nothing(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
):
    await make_admin(db_session, account)
    before = game_config.CURRENT_ERA.config_key

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_99"}, headers=auth_headers
    )

    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "ERA_CONFIG_UNKNOWN"
    assert game_config.CURRENT_ERA.config_key == before
    rows = (await db_session.execute(select(Era))).scalars().all()
    assert [row.id for row in rows] == [era.id]


async def test_rolling_into_the_era_that_is_already_live_is_refused(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    """Re-opening the live era is a full destructive reset for no change of ruleset;
    a disabled ``<select>`` option is not a control.
    """
    await make_admin(db_session, account)
    live_key = game_config.CURRENT_ERA.config_key
    assert era.config_key == live_key, "the fixture row is the live era"

    resp = await client.put(
        "/admin/eras/live", json={"config_key": live_key}, headers=auth_headers
    )

    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "ERA_ALREADY_LIVE"
    rows = (await db_session.execute(select(Era))).scalars().all()
    assert [row.id for row in rows] == [era.id]
    assert game_config.CURRENT_ERA.config_key == live_key


async def test_the_refusal_reads_the_row_not_the_process(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    """Which era is live is a DB fact (ADR-0091), so the refusal reads the row, not a
    drifted process binding.
    """
    await make_admin(db_session, account)
    # Row says era_2; process is still on era_1.
    db_session.add(
        Era(name="whatever", config_key="era_2", started_by=account.id)
    )
    await db_session.commit()
    assert game_config.CURRENT_ERA.config_key == "era_1"

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )

    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "ERA_ALREADY_LIVE"


async def test_two_overlapping_rollovers_open_exactly_one_era(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """Two near-simultaneous confirms must not both reset: the decision is re-made
    after the first lands. Via the service because the suite runs in one
    transaction, so a real second connection would not see the fixture rows.
    """
    from services.admin_service import roll_into_era

    await make_admin(db_session, account)

    first = await roll_into_era("era_2", account, db_session)
    assert first.config_key == "era_2"

    with pytest.raises(HTTPException) as caught:
        await roll_into_era("era_2", account, db_session)
    assert caught.value.status_code == 409
    assert caught.value.detail["code"] == "ERA_ALREADY_LIVE"

    rows = (await db_session.execute(select(Era).order_by(Era.id))).scalars().all()
    assert [row.config_key for row in rows] == [era.config_key, "era_2"]


async def test_the_rollover_re_mirrors_the_faction_roster(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
    some_faction: Faction,
):
    """``Faction`` mirrors the live era (ADR-0087) and must follow a rollover, or
    joins offer dropped slugs and added ones lack an FK row.
    """
    await make_admin(db_session, account)
    era_1 = era_config_for_key("era_1")
    era_2 = era_config_for_key("era_2")
    dropped = set(era_1.factions) - set(era_2.factions)
    assert dropped, "this test needs an incoming era that drops at least one slug"

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
    assert resp.status_code == 200

    rows = {
        row.slug: row.status
        for row in (await db_session.execute(select(Faction))).scalars()
    }
    for slug in dropped:
        # Retired, never deleted: `character.faction_slug` FKs point at closed-era rows.
        assert rows[slug] is FactionStatus.retired, slug
    for slug in era_2.factions:
        assert slug in rows, slug
        # System rows stay hidden; real factions go visible.
        assert rows[slug] in (FactionStatus.visible, FactionStatus.hidden), slug
    for slug in set(era_2.factions) - HIDDEN_FACTION_SLUGS:
        assert rows[slug] is FactionStatus.visible, slug


async def test_rolling_into_era_2_moves_the_live_ruleset(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    """After the request the process plays by Era 2, including import-time
    ``CURRENT_ERA`` default args (``max_task_signups`` stands in for them).
    """
    await make_admin(db_session, account)
    era_2 = era_config_for_key("era_2")
    assert game_config.CURRENT_ERA.config_key == "era_1"

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["config_key"] == "era_2"
    assert body["name"] == era_2.name
    assert body["characters_reset"] >= 1

    assert game_config.CURRENT_ERA.config_key == "era_2"
    assert game_config.CURRENT_ERA.name == era_2.name
    assert game_config.CURRENT_ERA.max_task_signups == era_2.max_task_signups
    assert set(game_config.CURRENT_ERA.factions) == set(era_2.factions)

    assert era_config_for_key("era_1").config_key == "era_1"
    assert era_config_for_key("era_2") is era_2


async def test_the_rollover_appends_a_row_stamped_with_the_operator(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    await make_admin(db_session, account)

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )

    assert resp.status_code == 200
    rows = (await db_session.execute(select(Era).order_by(Era.id))).scalars().all()
    assert len(rows) == 2
    assert rows[0].id == era.id, "the closing era's row stays as history"
    new_row = rows[1]
    assert new_row.id == resp.json()["era_id"]
    assert new_row.config_key == "era_2"
    assert new_row.name == era_config_for_key("era_2").name
    assert new_row.started_by == account.id


async def test_the_reset_applies_the_incoming_era_s_flags(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    """Resets are the OPENING era's decision (ADR-0042)."""
    await make_admin(db_session, account)
    era_2 = era_config_for_key("era_2")
    stats = (
        await db_session.execute(
            select(CharacterStats).where(CharacterStats.character_id == character.id)
        )
    ).scalar_one()
    stats.score = 500
    stats.level = 4
    await db_session.commit()

    resp = await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
    assert resp.status_code == 200

    new_stats = (
        await db_session.execute(
            select(CharacterStats)
            .where(CharacterStats.character_id == character.id)
            .order_by(CharacterStats.era_id.desc())
            .limit(1)
        )
    ).scalar_one()
    assert new_stats.era_id == resp.json()["era_id"]
    assert new_stats.score == (0 if era_2.reset_score else 500)
    assert new_stats.level == (0 if era_2.reset_level else 4)

    await db_session.refresh(character)
    if era_2.reset_faction:
        assert character.faction_slug == era_2.reset_faction_slug


async def test_the_selector_reports_the_new_era_as_live_afterwards(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    character: Character,
):
    await make_admin(db_session, account)

    await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    live = [row["config_key"] for row in resp.json() if row["is_live"]]
    assert live == ["era_2"]


# --- Resolver edge cases ---


@pytest.mark.parametrize(
    "config_key, expected",
    [("era_2", "era_2"), ("era_99", "era_1")],
)
async def test_rebind_reads_the_latest_row_and_falls_back_on_an_unknown_key(
    db_session: AsyncSession, account: Account, era: Era, config_key: str, expected: str
):
    """Row written directly: an unregistered key is the state the route refuses to
    create (a config file deleted under its row).
    """
    from services.era import rebind_live_era

    db_session.add(Era(name="whatever", config_key=config_key, started_by=account.id))
    await db_session.flush()

    bound = await rebind_live_era(db_session)

    assert bound.config_key == expected
    assert game_config.CURRENT_ERA.config_key == expected


async def test_rebind_on_a_database_with_no_era_row_does_not_raise(
    db_session: AsyncSession,
):
    """Fresh install: start-up may find no row and must survive it."""
    from services.era import rebind_live_era

    assert (await db_session.execute(select(Era))).scalar_one_or_none() is None

    bound = await rebind_live_era(db_session)

    assert bound.config_key == game_config.COMPILE_TIME_ERA_CONFIG_KEY
