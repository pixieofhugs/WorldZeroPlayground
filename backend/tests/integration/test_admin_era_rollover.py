"""The mod control that ends an era — ADR-0091, issue #827.

Seam under test: the two ``/admin/eras`` routes and the thing they exist to
move, which is the process's live ruleset. The unit tests in
``tests/unit/test_live_era_binding.py`` pin the binding mechanism; these pin that
an authenticated mod's HTTP request actually reaches it, writes the row, and
performs the reset with the **incoming** era's flags.

``tests/conftest.py``'s autouse ``restore_live_era`` puts the live era back after
each of these, so a rollover here cannot leak into the rest of the session.
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

# ---------------------------------------------------------------------------
# GET /admin/eras — the selector's option list
# ---------------------------------------------------------------------------


async def test_listing_eras_requires_admin(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/admin/eras", headers=auth_headers)
    assert resp.status_code == 403


async def test_rolling_requires_admin(client: AsyncClient, auth_headers: dict):
    """The gate matters more here than anywhere else on the console: there is no
    undo, and ``Era.started_by`` records whoever got through."""
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
    """Every registered era in era order, with the ``Era`` row's one marked."""
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
    """The selector and the ``PUT``'s refusal must answer from the same source.

    They can disagree — a row naming a ``config_key`` no era file registers
    leaves the process on the compile-time fallback, and ``rebind_live_era``
    logs exactly that. Reading ``is_live`` off the binding in that state would
    have the selector offer an era the ``PUT`` then refuses with
    ``ERA_ALREADY_LIVE``: a list whose disabled row disagrees with the server.

    This is the same drift ``test_the_refusal_reads_the_row_not_the_process``
    constructs, seen from the other end. ``restore_live_era``
    (``tests/conftest.py``) puts the binding back afterwards.
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
    """A fresh database. Nothing has run, so the compile-time era is genuinely
    what the game would play by, and it is the one thing the row cannot say."""
    await make_admin(db_session, account)
    assert (await db_session.execute(select(Era))).scalar_one_or_none() is None

    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    live = [row["config_key"] for row in resp.json() if row["is_live"]]
    assert live == [game_config.CURRENT_ERA.config_key]


# ---------------------------------------------------------------------------
# PUT /admin/eras/live — the rollover
# ---------------------------------------------------------------------------


async def test_rolling_into_an_unregistered_era_changes_nothing(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
):
    """A typo must not become an ``Era`` row whose rules nothing can resolve."""
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
    """Re-opening the live era is a full destructive reset that lands where the
    game already was: every score, level, budget and faction wiped, every duel
    frozen, the board retired, for no change of ruleset.

    Before this refusal the only thing preventing it was a ``disabled`` option
    in the admin page's ``<select>``, which is not a control (#3013 review).
    """
    await make_admin(db_session, account)
    live_key = game_config.CURRENT_ERA.config_key
    assert era.config_key == live_key, "the fixture row is the live era"

    resp = await client.put(
        "/admin/eras/live", json={"config_key": live_key}, headers=auth_headers
    )

    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "ERA_ALREADY_LIVE"
    # Nothing happened: no second row, and the live era has not moved.
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
    """Which era is live is a database fact (ADR-0091), so the refusal has to be
    one too. A process whose binding has drifted from the latest row — the state
    ``rebind_live_era`` logs and falls back on — must not be able to open a
    second row for the era that row already names.
    """
    await make_admin(db_session, account)
    # The row says era_2; the process is still on era_1. `restore_live_era`
    # (tests/conftest.py) puts the binding back after this test either way.
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
    """The lock, at the seam it guards.

    Two mods confirming within a second of each other is the shape: without the
    advisory lock both read the same live row, both pass the refusal above, and
    the game takes two destructive resets. Driven through the service rather
    than the route because the two calls must share this test's connection —
    the suite runs every test inside one transaction, so a genuinely concurrent
    second connection could not see the fixture rows at all. What is being
    pinned is that the *decision* is re-made after the first rollover lands, not
    that Postgres blocks (which is Postgres's job, and is what the lock buys
    once the two are on separate connections).
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
    """``Faction`` is a two-way display mirror of the live era (ADR-0087), and
    it used to wait for the next deploy — so between a mod's rollover and the
    next push the join tiles offered factions the new era does not carry, and an
    era that *adds* a slug had no row for the FK a join would write.

    Read off the two configs rather than restated: which slugs Era 2 drops is
    the era files' business, not this test's.
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
        # Retired, never deleted: `character.faction_slug` is an FK and a closed
        # era's characters are the history it points at.
        assert rows[slug] is FactionStatus.retired, slug
    for slug in era_2.factions:
        assert slug in rows, slug
        # A system row stays hidden; the roster's real factions go visible.
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
    """THE feature. After the request the process plays by Era 2's rules —
    including at the 157 sites that hold ``CURRENT_ERA`` as a default argument
    bound at import time, which is what ``max_task_signups`` stands in for here.
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

    # ...and the era files themselves are untouched by the flip.
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
    """Append-only, and ``started_by`` is the audit trail ``require_admin`` fills."""
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
    """The resets are the *opening* era's decision, not the closing one's
    (ADR-0042). Read off the config rather than restated here.
    """
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
    """What the admin page re-fetches once the confirm returns."""
    await make_admin(db_session, account)

    await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
    resp = await client.get("/admin/eras", headers=auth_headers)

    assert resp.status_code == 200
    live = [row["config_key"] for row in resp.json() if row["is_live"]]
    assert live == ["era_2"]


# ---------------------------------------------------------------------------
# The resolver's own edge cases
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "config_key, expected",
    [("era_2", "era_2"), ("era_99", "era_1")],
)
async def test_rebind_reads_the_latest_row_and_falls_back_on_an_unknown_key(
    db_session: AsyncSession, account: Account, era: Era, config_key: str, expected: str
):
    """The row is written directly, past the route's validation, because the
    unregistered-key branch is exactly the state the route refuses to create —
    a config file deleted under a row that already names it."""
    from services.era import rebind_live_era

    db_session.add(Era(name="whatever", config_key=config_key, started_by=account.id))
    await db_session.flush()

    bound = await rebind_live_era(db_session)

    assert bound.config_key == expected
    assert game_config.CURRENT_ERA.config_key == expected


async def test_rebind_on_a_database_with_no_era_row_does_not_raise(
    db_session: AsyncSession,
):
    """A fresh install. ``bootstrap_admin`` writes the first row only on an
    un-bootstrapped database, so start-up can legitimately find nothing — and
    start-up must survive it rather than taking the app down."""
    from services.era import rebind_live_era

    assert (await db_session.execute(select(Era))).scalar_one_or_none() is None

    bound = await rebind_live_era(db_session)

    assert bound.config_key == game_config.COMPILE_TIME_ERA_CONFIG_KEY
