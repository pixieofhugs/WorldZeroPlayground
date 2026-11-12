"""#2400: an admin SEES Albescent without earning it, and still cannot JOIN it.

``is_albescent_revealed`` short-circuits on ``is_admin``. Driven through every
route that consults it, since the risk is a reader inlining the column instead.
``/factions`` and ``/factions/status`` no longer consult it (#2409, ADR-0082);
their case stays to catch a filter creeping back.
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
    DEFAULT_FACTION_SLUG,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

OTHER_FACTION_SLUG = DEFAULT_FACTION_SLUG


@pytest_asyncio.fixture
async def faction_albescent(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """Albescent row ``visible`` as ``seed.py`` makes it; seeding it hidden would
    excuse the bug, since ``list_factions`` drops non-visible rows first.
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
    """Admin role, never joined, level 0: ``can_start_as_albescent`` is False."""
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


# --- Seeing ---


@pytest.mark.asyncio
async def test_the_faction_listings_no_longer_ask_who_is_asking(
    client: AsyncClient, admin: dict, plain: dict
):
    """Since #2409 these payloads must not differ by viewer at all (ADR-0082); hence
    equality, not membership. The WORD stays gated on ``/auth/me``.
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
    admin_resp = await client.get("/game-config", headers=admin["headers"])
    plain_resp = await client.get("/game-config", headers=plain["headers"])
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(admin_resp.json())
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(plain_resp.json())


@pytest.mark.asyncio
async def test_anonymous_game_config_is_unchanged(client: AsyncClient, admin: dict):
    resp = await client.get("/game-config")
    assert resp.status_code == 200, resp.text
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(resp.json())


@pytest.mark.asyncio
async def test_auth_me_reports_the_admin_as_revealed(
    client: AsyncClient, admin: dict, plain: dict
):
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
    """#2422: revealed means the word and the roster together."""
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
    guessed = await _ids(
        client, url.format(slug=ALBESCENT_FACTION_SLUG), plain["headers"]
    )
    folded = await _ids(
        client, url.format(slug=UNAFFILIATED_FACTION_SLUG), plain["headers"]
    )
    assert guessed == folded


# --- Not joining ---


@pytest.mark.asyncio
async def test_the_admin_is_still_not_eligible_to_join(
    client: AsyncClient, admin: dict
):
    me = (await client.get("/auth/me", headers=admin["headers"])).json()
    assert me["can_start_as_albescent"] is False


@pytest.mark.asyncio
async def test_choosing_albescent_is_still_refused_for_an_unqualified_admin(
    client: AsyncClient, admin: dict
):
    """The join gate must keep refusing the account the reveal says yes to, or the
    flag drifts like ``can_apply_metatask`` did.
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
    """A read only: nothing persists it, so losing the role loses the reveal."""
    for url in ("/factions", "/factions/status", "/game-config", "/auth/me"):
        assert (await client.get(url, headers=admin["headers"])).status_code == 200

    account = await db_session.get(Account, admin["account_id"])
    await db_session.refresh(account)
    assert account.albescent_revealed is False
