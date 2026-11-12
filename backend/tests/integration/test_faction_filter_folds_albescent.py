"""#1975 — every faceted surface folds Albescent under Unaffiliated.

Seam: ``faction_slugs.faction_filter_slugs``, driven through every route with
the faction facet (``SURFACES``). Unaffiliated matches ``na`` or ``albescent``.

#2422: a revealed caller may ask for ``albescent`` alone; ``na`` still folds for
everyone, and an unrevealed caller's two answers must stay identical.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from models.account import Account
from models.era import Era
from models.faction import Faction, FactionStatus
from services.auth import create_jwt
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    make_character,
    make_solo_praxis,
    make_task,
)

#: Neither half of the unaffiliated bucket; ``some_faction`` seeds its row.
OTHER_FACTION_SLUG = DEFAULT_FACTION_SLUG


@pytest_asyncio.fixture
async def faction_albescent(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """``visible``, as ``seed.py`` makes it. Hidden would excuse the bug:
    ``list_tasks`` drops hidden factions before the filter."""
    result = await db_session.execute(
        select(Faction).where(Faction.slug == ALBESCENT_FACTION_SLUG)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    row = Faction(slug=ALBESCENT_FACTION_SLUG, status=FactionStatus.visible)
    db_session.add(row)
    await db_session.commit()
    result = await db_session.execute(
        select(Faction).where(Faction.slug == ALBESCENT_FACTION_SLUG)
    )
    return result.scalar_one()


@pytest_asyncio.fixture
async def world(db_session: AsyncSession, era: Era, faction_albescent: Faction) -> dict:
    """One task, praxis and character per slug."""
    rows: dict[str, dict[str, int]] = {"tasks": {}, "praxes": {}, "characters": {}}
    for slug in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG, OTHER_FACTION_SLUG):
        character = await make_character(
            db_session, era, username=f"filter_{slug}", faction_slug=slug
        )
        task = await make_task(
            db_session, character, title=f"{slug} task", faction_slug=slug
        )
        praxis = await make_solo_praxis(db_session, task, character, title=f"{slug} praxis")
        rows["characters"][slug] = character.id
        rows["tasks"][slug] = task.id
        rows["praxes"][slug] = praxis.id
    await db_session.commit()
    return rows


async def _ids(client: AsyncClient, url: str, headers: dict | None = None) -> set[int]:
    resp = await client.get(url, headers=headers or {})
    assert resp.status_code == 200, resp.text
    return {row["id"] for row in resp.json()}


@pytest_asyncio.fixture
async def revealed_headers(db_session: AsyncSession) -> dict:
    """Sets the sticky flag directly instead of running the join flow."""
    acc = Account(email="revealed@example.com", albescent_revealed=True)
    db_session.add(acc)
    await db_session.commit()
    return {"Authorization": f"Bearer {create_jwt(acc.id)}"}


#: Every route the faction facet feeds; a new faceted route belongs here.
SURFACES = [
    ("tasks", "/tasks?faction={slug}"),
    ("praxes", "/praxes?faction={slug}"),
    ("characters", "/characters?faction={slug}"),
    ("characters", "/leaderboard?faction={slug}"),
]


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_unaffiliated_returns_albescent_too(
    client: AsyncClient, world: dict, key: str, url: str
):
    found = await _ids(client, url.format(slug=UNAFFILIATED_FACTION_SLUG))
    assert world[key][UNAFFILIATED_FACTION_SLUG] in found
    assert world[key][ALBESCENT_FACTION_SLUG] in found
    assert world[key][OTHER_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_another_faction_returns_neither(
    client: AsyncClient, world: dict, key: str, url: str
):
    found = await _ids(client, url.format(slug=OTHER_FACTION_SLUG))
    assert world[key][OTHER_FACTION_SLUG] in found
    assert world[key][UNAFFILIATED_FACTION_SLUG] not in found
    assert world[key][ALBESCENT_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_albescent_is_not_separable(
    client: AsyncClient, world: dict, key: str, url: str
):
    """Refusing the slug would be a louder tell: unknown slugs return 200 empty."""
    guessed = await _ids(client, url.format(slug=ALBESCENT_FACTION_SLUG))
    assert guessed == await _ids(client, url.format(slug=UNAFFILIATED_FACTION_SLUG))


@pytest.mark.asyncio
async def test_union_of_two_factions_still_folds(client: AsyncClient, world: dict):
    """#1364."""
    found = await _ids(
        client,
        f"/tasks?faction={OTHER_FACTION_SLUG}&faction={UNAFFILIATED_FACTION_SLUG}",
    )
    assert found >= set(world["tasks"].values())


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_no_row_is_labelled_albescent(
    client: AsyncClient, world: dict, key: str, url: str
):
    """The display name never appears (ADR-0038); the raw slug already did."""
    resp = await client.get(url.format(slug=UNAFFILIATED_FACTION_SLUG))
    assert resp.status_code == 200
    assert "Albescent" not in resp.text


# #2422: viewer-aware, asymmetric on purpose.


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_revealed_viewer_gets_only_albescent(
    client: AsyncClient, world: dict, revealed_headers: dict, key: str, url: str
):
    """The faction page's roster question for a member (#2422)."""
    found = await _ids(
        client, url.format(slug=ALBESCENT_FACTION_SLUG), revealed_headers
    )
    assert world[key][ALBESCENT_FACTION_SLUG] in found
    assert world[key][UNAFFILIATED_FACTION_SLUG] not in found
    assert world[key][OTHER_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_revealed_viewer_still_finds_albescent_under_unaffiliated(
    client: AsyncClient, world: dict, revealed_headers: dict, key: str, url: str
):
    """No Albescent facet option, so a literal ``na`` would strand them (#1975)."""
    found = await _ids(
        client, url.format(slug=UNAFFILIATED_FACTION_SLUG), revealed_headers
    )
    assert world[key][UNAFFILIATED_FACTION_SLUG] in found
    assert world[key][ALBESCENT_FACTION_SLUG] in found
    assert world[key][OTHER_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_unrevealed_viewer_cannot_separate_albescent(
    client: AsyncClient, world: dict, auth_headers: dict, key: str, url: str
):
    """Anti-oracle for a logged-in prober: a token must not buy the answer."""
    guessed = await _ids(client, url.format(slug=ALBESCENT_FACTION_SLUG), auth_headers)
    folded = await _ids(
        client, url.format(slug=UNAFFILIATED_FACTION_SLUG), auth_headers
    )
    assert guessed == folded
    assert world[key][ALBESCENT_FACTION_SLUG] in guessed
    assert world[key][UNAFFILIATED_FACTION_SLUG] in guessed


@pytest.mark.asyncio
async def test_leaderboard_still_answers_anonymous_callers(
    client: AsyncClient, world: dict
):
    """Auth is optional (reveal check only)."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200, resp.text
