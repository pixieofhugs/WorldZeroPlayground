"""#2400 — an admin SEES Albescent without earning it, and still cannot JOIN it.

The seam is ``services.albescent_reveal.is_albescent_revealed``: one predicate,
short-circuited by ``is_admin``. These tests drive it through every route that
consults it, because the risk of this change is not the predicate — it is a
reader that inlines the column instead and drifts:

* ``GET /game-config``       → ``services.progression.visible_level_profiles``
* ``GET /auth/me``           → ``services.current_user.build_current_user``
* ``GET /characters``, ``/leaderboard``, ``/praxes``, ``/tasks`` with
  ``?faction=albescent`` → the #2422 roster/list fold

And the half that must NOT move: ``POST /factions/choose`` still refuses an
unqualified admin, and ``can_start_as_albescent`` still answers False. Seeing is
not doing. The last test pins the scope note in the issue — the sticky column is
never written for an admin, so the reveal goes when the role does.

``GET /factions`` and ``GET /factions/status`` are no longer on that list.
#2409 stopped both from consulting the predicate at all — the row ships to
everyone and the client redacts its strings (ADR-0082) — so the case that used
to prove the bypass there now proves the opposite: the two payloads are
viewer-independent. It is kept rather than deleted because a filter creeping
back into either handler is exactly the drift this file exists to catch.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from models.account import Account
from models.era import Era
from models.faction import Faction, FactionStatus
from services.auth import create_jwt
from services.progression import HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
from tests.integration.factories import (
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

#: A faction that is neither half of the unaffiliated bucket.
OTHER_FACTION_SLUG = "ua"


@pytest_asyncio.fixture
async def faction_albescent(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """The Albescent ``Faction`` row — ``visible``, exactly as ``seed.py`` makes it.

    Secrecy is per-viewer, not a faction status: seeding it hidden would excuse
    the bug, since ``list_factions`` drops non-visible rows before anything else
    runs — and since #2409 that status filter is the only one it applies.
    """
    existing = await db_session.scalar(
        select(Faction).where(Faction.slug == ALBESCENT_FACTION_SLUG)
    )
    if existing is not None:
        return existing
    row = Faction(slug=ALBESCENT_FACTION_SLUG, status=FactionStatus.visible)
    db_session.add(row)
    await db_session.commit()
    return await db_session.scalar(
        select(Faction).where(Faction.slug == ALBESCENT_FACTION_SLUG)
    )


@pytest_asyncio.fixture
async def admin(db_session: AsyncSession, era: Era, faction_albescent: Faction) -> dict:
    """An admin who has never joined Albescent: role granted, column still False.

    Level 0 and no coverage, so ``can_start_as_albescent`` is emphatically
    False — which is the point. Everything this account can see, it sees on the
    strength of the role alone.
    """
    character = await make_character(
        db_session,
        era,
        username="reveal_admin",
        faction_slug=OTHER_FACTION_SLUG,
        level=0,
    )
    account = await db_session.get(Account, character.account_id)
    await make_admin(db_session, account, commit=False)
    await db_session.commit()
    return {
        "account_id": account.id,
        "character_id": character.id,
        "headers": {"Authorization": f"Bearer {create_jwt(account.id)}"},
    }


@pytest_asyncio.fixture
async def plain(db_session: AsyncSession, era: Era, faction_albescent: Faction) -> dict:
    """The control: same shape, no role, no reveal."""
    character = await make_character(
        db_session,
        era,
        username="reveal_plain",
        faction_slug=OTHER_FACTION_SLUG,
        level=0,
    )
    await db_session.commit()
    return {
        "account_id": character.account_id,
        "headers": {"Authorization": f"Bearer {create_jwt(character.account_id)}"},
    }


@pytest_asyncio.fixture
async def world(db_session: AsyncSession, era: Era, faction_albescent: Faction) -> dict:
    """One row of each faction on every axis the #2422 fold filters."""
    rows: dict[str, dict[str, int]] = {"tasks": {}, "praxes": {}, "characters": {}}
    for slug in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG, OTHER_FACTION_SLUG):
        character = await make_character(
            db_session, era, username=f"admreveal_{slug}", faction_slug=slug
        )
        task = await make_task(
            db_session, character, title=f"{slug} task", faction_slug=slug
        )
        praxis = await make_solo_praxis(
            db_session, task, character, title=f"{slug} praxis"
        )
        rows["characters"][slug] = character.id
        rows["tasks"][slug] = task.id
        rows["praxes"][slug] = praxis.id
    await db_session.commit()
    return rows


async def _ids(client: AsyncClient, url: str, headers: dict) -> set[int]:
    resp = await client.get(url, headers=headers)
    assert resp.status_code == 200, resp.text
    return {row["id"] for row in resp.json()}


def _unlock_keys(payload: dict) -> set[str]:
    return {
        unlock["key"]
        for profile in payload["level_profiles"]
        for unlock in profile["unlocks"]
    }


# ---------------------------------------------------------------------------
# Seeing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_faction_listings_no_longer_ask_who_is_asking(
    client: AsyncClient, admin: dict, plain: dict
):
    """#2409 took both faction listings out of this predicate's readership.

    They were the first two rows of this file's route table, and the
    assertion here has INVERTED for the plain account: it now reads the same
    eighth row the admin does. That is not the admin bypass weakening — it is
    the bypass having nothing left to bypass on these two routes. Secrecy moved
    from the wire to the render (ADR-0082), and what the plain account still
    does not get is the WORD: ``/auth/me`` answers ``albescent_revealed: false``
    for it and ``true`` for the admin, which
    ``test_auth_me_reports_the_admin_as_revealed`` below already pins.

    Equality rather than two membership checks, because equality is the whole
    claim: these payloads must not differ by viewer at all any more. A filter
    creeping back for some third reason would fail this even if it happened to
    keep Albescent in both.
    """
    admin_resp = await client.get("/factions", headers=admin["headers"])
    plain_resp = await client.get("/factions", headers=plain["headers"])
    admin_slugs = {f["slug"] for f in admin_resp.json()}
    plain_slugs = {f["slug"] for f in plain_resp.json()}
    assert ALBESCENT_FACTION_SLUG in admin_slugs
    assert admin_slugs == plain_slugs

    admin_page = await client.get("/factions/status", headers=admin["headers"])
    plain_page = await client.get("/factions/status", headers=plain["headers"])
    assert admin_page.status_code == 200, admin_page.text
    assert plain_page.status_code == 200, plain_page.text
    admin_rows = {f["slug"] for f in admin_page.json()["all_factions"]}
    plain_rows = {f["slug"] for f in plain_page.json()["all_factions"]}
    assert ALBESCENT_FACTION_SLUG in admin_rows
    assert admin_rows == plain_rows


@pytest.mark.asyncio
async def test_level_ladder_announces_the_rung_to_an_admin(
    client: AsyncClient, admin: dict, plain: dict
):
    """``/game-config`` names the unlock — the one rung that says the order exists."""
    admin_resp = await client.get("/game-config", headers=admin["headers"])
    plain_resp = await client.get("/game-config", headers=plain["headers"])
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(admin_resp.json())
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(plain_resp.json())


@pytest.mark.asyncio
async def test_anonymous_game_config_is_unchanged(client: AsyncClient, admin: dict):
    """No account, no reveal — the public answer must not have moved."""
    resp = await client.get("/game-config")
    assert resp.status_code == 200, resp.text
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(resp.json())


@pytest.mark.asyncio
async def test_auth_me_reports_the_admin_as_revealed(
    client: AsyncClient, admin: dict, plain: dict
):
    """The field the whole frontend dresses off — the page gate and the name mask."""
    admin_me = (await client.get("/auth/me", headers=admin["headers"])).json()
    plain_me = (await client.get("/auth/me", headers=plain["headers"])).json()
    assert admin_me["is_admin"] is True
    assert admin_me["albescent_revealed"] is True
    assert plain_me["albescent_revealed"] is False


@pytest.mark.parametrize(
    "key,url",
    [
        ("characters", "/characters?faction={slug}"),
        ("characters", "/leaderboard?faction={slug}"),
        ("praxes", "/praxes?faction={slug}"),
        ("tasks", "/tasks?faction={slug}"),
    ],
)
@pytest.mark.asyncio
async def test_roster_filters_un_fold_for_an_admin(
    client: AsyncClient, admin: dict, plain: dict, world: dict, key: str, url: str
):
    """#2422's ruling: one rule for revealed — the word and the roster together.

    An admin who can open ``/factions/albescent`` but gets that page's roster
    folded with every unaffiliated row in the game is looking at exactly the bug
    #2422 fixed.
    """
    admin_ids = await _ids(
        client, url.format(slug=ALBESCENT_FACTION_SLUG), admin["headers"]
    )
    assert world[key][ALBESCENT_FACTION_SLUG] in admin_ids
    assert world[key][UNAFFILIATED_FACTION_SLUG] not in admin_ids


@pytest.mark.parametrize(
    "key,url",
    [
        ("characters", "/characters?faction={slug}"),
        ("characters", "/leaderboard?faction={slug}"),
        ("praxes", "/praxes?faction={slug}"),
        ("tasks", "/tasks?faction={slug}"),
    ],
)
@pytest.mark.asyncio
async def test_a_non_admin_still_gets_the_anti_oracle_answer(
    client: AsyncClient, plain: dict, world: dict, key: str, url: str
):
    """The prober's answer is untouched: ``albescent`` still answers ``na``."""
    guessed = await _ids(
        client, url.format(slug=ALBESCENT_FACTION_SLUG), plain["headers"]
    )
    folded = await _ids(
        client, url.format(slug=UNAFFILIATED_FACTION_SLUG), plain["headers"]
    )
    assert guessed == folded


# ---------------------------------------------------------------------------
# Not joining
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_admin_is_still_not_eligible_to_join(
    client: AsyncClient, admin: dict
):
    """``can_start_as_albescent`` never consults the role. Seeing is not doing."""
    me = (await client.get("/auth/me", headers=admin["headers"])).json()
    assert me["can_start_as_albescent"] is False


@pytest.mark.asyncio
async def test_choosing_albescent_is_still_refused_for_an_unqualified_admin(
    client: AsyncClient, admin: dict
):
    """The capability-flag drift guard, at the wire.

    ``can_apply_metatask`` is this repo's recorded failure of the same shape: a
    flag saying yes where enforcement says no. It stays safe here only while the
    join gate keeps answering 403 to the account the reveal now says yes to.
    """
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": ALBESCENT_FACTION_SLUG},
        headers=admin["headers"],
    )
    assert resp.status_code == 403, resp.text
    assert (
        resp.json()["detail"]["code"]
        == ErrorCode.faction_albescent_not_eligible.value
    )


@pytest.mark.asyncio
async def test_the_sticky_column_is_never_written_for_an_admin(
    client: AsyncClient, db_session: AsyncSession, admin: dict
):
    """The bypass is a READ.

    An admin who later loses the role must lose the reveal with it, which is
    only true while nothing persists it. Walk every reveal-gated surface, then
    look at the column.
    """
    for url in ("/factions", "/factions/status", "/game-config", "/auth/me"):
        assert (await client.get(url, headers=admin["headers"])).status_code == 200

    account = await db_session.get(Account, admin["account_id"])
    await db_session.refresh(account)
    assert account.albescent_revealed is False
