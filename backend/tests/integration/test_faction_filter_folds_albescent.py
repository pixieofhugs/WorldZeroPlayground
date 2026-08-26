"""#1975 — every faceted surface folds Albescent under Unaffiliated.

The seam under test is the one place a caller-supplied faction *selection*
becomes a query predicate: ``faction_slugs.faction_filter_slugs``. These drive
it through the four routes that share the faction facet, so a surface that
bypasses the helper and matches on slug equality again fails here rather than
in production:

* ``GET /tasks?faction=``   → ``services.task.list_tasks``
* ``GET /praxes?faction=``  → ``services.praxis.list_praxes``
* ``GET /characters?faction=`` and ``GET /leaderboard?faction=``
  → ``services.character.list_characters_for_viewer`` (one function, two routes)

The rule: selecting **Unaffiliated** matches ``na`` **or** ``albescent``;
Albescent is never separable and never an option of its own. Before this an
Albescent row matched *no* filter at all — unreachable rather than hidden.

#2422 added the one exception, and it is about *who is asking*: a caller the
society has been revealed to may name ``albescent`` and get the order alone,
because the faction detail page asks that question in good faith on behalf of a
member. ``na`` still folds for everyone. The tests below the divider pin both
halves, and — the load-bearing one — that an unrevealed caller's two answers are
still byte-for-byte the same.

Slugs come from ``faction_slugs``, never from literals, so a change of sentinel
does not need finding here.
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
from tests.integration.factories import make_character, make_solo_praxis, make_task

#: A faction that is neither half of the unaffiliated bucket. ``some_faction``
#: already seeds its row.
OTHER_FACTION_SLUG = "ua"


@pytest_asyncio.fixture
async def faction_albescent(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """The Albescent ``Faction`` row — ``visible``, exactly as ``seed.py`` makes it.

    ``seed.HIDDEN_FACTION_SLUGS`` is ``{aged_out, na}``: Albescent is a *visible*
    row whose secrecy is enforced per-viewer by ``GET /factions`` and by the
    client-side name mask (#1891 / #1926), not by the faction's status. Seeding
    it hidden here would quietly excuse the bug — ``list_tasks`` drops hidden
    factions' tasks outright, so nothing would reach the filter to be folded.
    """
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
    """One row of each faction on every axis the facet filters.

    Tasks carry a faction of their own (``primary_faction_slug``) and praxes
    inherit their task's; characters carry the member faction. Three slugs times
    three axes, so each surface has something to include and something to
    exclude.
    """
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
    """Auth headers for an account the society has already been revealed to.

    ``albescent_revealed`` is sticky and set on join
    (``services.faction_service``); setting it directly is the same state a
    member carries, without dragging the whole join flow into a filter test.
    """
    acc = Account(email="revealed@example.com", albescent_revealed=True)
    db_session.add(acc)
    await db_session.commit()
    return {"Authorization": f"Bearer {create_jwt(acc.id)}"}


#: ``(surface key, URL template)`` for every route the faction facet feeds.
#: ``{slug}`` is the selected faction. Adding a faceted route means adding a row
#: here, which is the point: the parametrisation is the census.
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
    """Selecting Unaffiliated returns both ``na`` and ``albescent`` rows."""
    found = await _ids(client, url.format(slug=UNAFFILIATED_FACTION_SLUG))
    assert world[key][UNAFFILIATED_FACTION_SLUG] in found
    assert world[key][ALBESCENT_FACTION_SLUG] in found
    assert world[key][OTHER_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_another_faction_returns_neither(
    client: AsyncClient, world: dict, key: str, url: str
):
    """Selecting any other faction returns neither half of the bucket."""
    found = await _ids(client, url.format(slug=OTHER_FACTION_SLUG))
    assert world[key][OTHER_FACTION_SLUG] in found
    assert world[key][UNAFFILIATED_FACTION_SLUG] not in found
    assert world[key][ALBESCENT_FACTION_SLUG] not in found


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_albescent_is_not_separable(
    client: AsyncClient, world: dict, key: str, url: str
):
    """A guessed ``?faction=albescent`` answers what Unaffiliated answers.

    No query may isolate the Albescent slice. The alternative — refusing the
    slug — is the louder tell, since every *other* unrecognised slug returns 200
    with nothing.
    """
    guessed = await _ids(client, url.format(slug=ALBESCENT_FACTION_SLUG))
    assert guessed == await _ids(client, url.format(slug=UNAFFILIATED_FACTION_SLUG))


@pytest.mark.asyncio
async def test_union_of_two_factions_still_folds(client: AsyncClient, world: dict):
    """Repeated ``?faction=`` is a union (#1364), and the fold rides along."""
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
    """The fold names the society to nobody.

    The backend emits *slugs* and the catalog owns the wording (ADR-0031 /
    ADR-0038), so what must never appear is the display name — the string the
    client-side mask exists to withhold (#1891 / #1926). The raw
    ``albescent`` slug does ride these payloads, as it already does on the
    unfiltered listing every one of these rows is in: the fold makes existing
    rows *reachable*, it does not put anything new on the wire.
    """
    resp = await client.get(url.format(slug=UNAFFILIATED_FACTION_SLUG))
    assert resp.status_code == 200
    assert "Albescent" not in resp.text


# ---------------------------------------------------------------------------
# #2422 — the fold is viewer-aware, and asymmetric on purpose
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("key,url", SURFACES)
@pytest.mark.asyncio
async def test_revealed_viewer_gets_only_albescent(
    client: AsyncClient, world: dict, revealed_headers: dict, key: str, url: str
):
    """A revealed caller asking for Albescent gets the order, not the bucket.

    This is the roster question the faction page asks in good faith on behalf of
    a member (#2422). Before this it got the anti-oracle answer — every
    unaffiliated row in the game, rendered as members of the order.
    """
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
    """``?faction=na`` keeps folding for everyone — the asymmetry is the ruling.

    Unaffiliated is the bucket Albescent hides in; being revealed lets you ask
    for Albescent directly, it does not evict them from the bucket. The facet has
    no Albescent option (and #2409 does not add one), so a literal ``na`` would
    leave Albescent rows matching no facet at all — #1975's bug, back again.
    """
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
    """The anti-oracle property, pinned directly for a logged-in prober.

    ``test_albescent_is_not_separable`` above pins it for anonymous callers.
    Holding a token must not buy the answer: for an account that has not been
    revealed the two responses are identical, exactly as they were before the
    fold learned who was asking.
    """
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
    """The route gained optional auth for the reveal check, never required auth."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 200, resp.text
