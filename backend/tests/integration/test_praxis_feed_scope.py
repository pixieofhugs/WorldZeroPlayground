"""Integration tests for the praxis feed's era scope, multi-faction filter and
vote-count sorts (#1362).

Seam under test: the query :func:`services.praxis.list_praxes` builds — era
scope is a ``submitted_at`` bound against the current ``Era`` row, faction is an
``IN`` over the linked task's faction, and the vote sorts order by a correlated
``COUNT`` over ``Vote`` with a mandatory ``submitted_at DESC`` tiebreak. The
route is exercised too, for the repeated-``?faction=`` plumbing that only FastAPI
can prove.
"""
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from models.vote import Vote
from services.praxis import PraxisEraScope, PraxisSort, list_praxes
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: A second real faction of the live era — "not the one the fixtures use". The
#: multi-select union needs two slugs; which two is not the subject (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


async def _make_praxis(
    db_session: AsyncSession,
    character: Character,
    *,
    title: str,
    submitted_at: datetime | None,
    faction_slug: str = DEFAULT_FACTION_SLUG,
    status: PraxisStatus = PraxisStatus.submitted,
) -> Praxis:
    """A solo praxis on its own task, with its seal time pinned."""
    task = Task(
        title=f"Task for {title}",
        description="",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=faction_slug,
    )
    db_session.add(task)
    await db_session.flush()

    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=status,
        title=title,
        body_text="proof",
        submitted_at=submitted_at,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


@pytest_asyncio.fixture
async def other_faction(db_session: AsyncSession, some_faction: Faction) -> Faction:
    """Second faction row for the multi-select union (FK on Task).

    Seeded by ``some_faction`` since #2708 — adding it here again is a duplicate
    primary key, not a no-op.
    """
    result = await db_session.execute(
        select(Faction).where(Faction.slug == OTHER_FACTION_SLUG)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# 1. Era scope
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_era_scope_hides_praxes_sealed_before_the_era_started(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    """Default is *this era*: a praxis sealed before ``Era.started_at`` is gone,
    and ``all_eras`` brings it back."""
    before = await _make_praxis(
        db_session,
        character,
        title="Last era",
        submitted_at=era.started_at - timedelta(days=30),
    )
    after = await _make_praxis(
        db_session,
        character,
        title="This era",
        submitted_at=era.started_at + timedelta(minutes=1),
    )

    scoped = await list_praxes(db_session, status=PraxisStatus.submitted)
    assert [p.id for p in scoped] == [after.id]

    unscoped = await list_praxes(
        db_session,
        status=PraxisStatus.submitted,
        era_scope=PraxisEraScope.all_eras,
    )
    assert {p.id for p in unscoped} == {before.id, after.id}


@pytest.mark.asyncio
async def test_era_scope_keeps_unsealed_drafts(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    """An in-progress praxis has a NULL ``submitted_at`` by definition, so era
    scope must not delete the sidebar's drafts."""
    draft = await _make_praxis(
        db_session,
        character,
        title="Draft",
        submitted_at=None,
        status=PraxisStatus.in_progress,
    )

    got = await list_praxes(
        db_session,
        member_id=character.id,
        status=PraxisStatus.in_progress,
        viewer_id=character.id,
    )
    assert [p.id for p in got] == [draft.id]


@pytest.mark.asyncio
async def test_era_scope_falls_through_when_the_era_is_unseeded(
    db_session: AsyncSession,
    character: Character,
    era: Era,
):
    """No Era rows at all ⇒ unscoped, not empty.

    Since #2705 the live era is the latest ``Era`` row whatever its
    ``config_key``, so "unseeded" is the empty table — a fresh database — and
    nothing else. Clear the stats rows first; they FK the era.
    """
    old = await _make_praxis(
        db_session,
        character,
        title="Ancient",
        submitted_at=era.started_at - timedelta(days=365),
    )
    await db_session.execute(delete(CharacterStats))
    await db_session.execute(delete(Era))
    await db_session.commit()

    got = await list_praxes(db_session, status=PraxisStatus.submitted)
    assert [p.id for p in got] == [old.id]


# ---------------------------------------------------------------------------
# 2. Multi-select faction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_faction_filter_is_a_union_over_slugs(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    other_faction: Faction,
):
    sealed = era.started_at + timedelta(minutes=1)
    own_praxis = await _make_praxis(
        db_session,
        character,
        title="Own",
        submitted_at=sealed,
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    other_praxis = await _make_praxis(
        db_session,
        character,
        title="Other",
        submitted_at=sealed,
        faction_slug=OTHER_FACTION_SLUG,
    )

    both = await list_praxes(
        db_session,
        status=PraxisStatus.submitted,
        faction=[DEFAULT_FACTION_SLUG, OTHER_FACTION_SLUG],
    )
    assert {p.id for p in both} == {own_praxis.id, other_praxis.id}

    one = await list_praxes(
        db_session, status=PraxisStatus.submitted, faction=[OTHER_FACTION_SLUG]
    )
    assert [p.id for p in one] == [other_praxis.id]

    empty = await list_praxes(db_session, status=PraxisStatus.submitted, faction=[])
    assert {p.id for p in empty} == {own_praxis.id, other_praxis.id}


@pytest.mark.asyncio
async def test_route_accepts_repeated_faction_params(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    other_faction: Faction,
):
    """Two ``?faction=`` values at once — the plumbing only FastAPI can prove."""
    sealed = era.started_at + timedelta(minutes=1)
    own_praxis = await _make_praxis(
        db_session,
        character,
        title="Own route",
        submitted_at=sealed,
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    other_praxis = await _make_praxis(
        db_session,
        character,
        title="Other route",
        submitted_at=sealed,
        faction_slug=OTHER_FACTION_SLUG,
    )

    resp = await client.get(
        "/praxes",
        params=[
            ("status", "submitted"),
            ("faction", DEFAULT_FACTION_SLUG),
            ("faction", OTHER_FACTION_SLUG),
        ],
    )
    assert resp.status_code == 200
    assert {item["id"] for item in resp.json()} == {own_praxis.id, other_praxis.id}

    single = await client.get(
        "/praxes", params={"status": "submitted", "faction": OTHER_FACTION_SLUG}
    )
    assert single.status_code == 200
    assert [item["id"] for item in single.json()] == [other_praxis.id]


# ---------------------------------------------------------------------------
# 3. Vote-count sorts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_vote_sorts_order_by_count_and_break_ties_by_seal_time(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    era: Era,
):
    """``most_voted``/``least_voted`` order on the vote count, and the mandatory
    ``submitted_at DESC`` tiebreak keeps a growing window stable: the shorter
    page must be a prefix of the longer one (``usePagedResource`` refetches a
    wider ``limit``)."""
    sealed = era.started_at + timedelta(minutes=1)
    # Three zero-vote praxes so ties are the common case, plus two with votes.
    tied_new = await _make_praxis(
        db_session, character, title="Tie new", submitted_at=sealed + timedelta(hours=3)
    )
    tied_mid = await _make_praxis(
        db_session, character, title="Tie mid", submitted_at=sealed + timedelta(hours=2)
    )
    tied_old = await _make_praxis(
        db_session, character, title="Tie old", submitted_at=sealed + timedelta(hours=1)
    )
    one_vote = await _make_praxis(
        db_session, character, title="One vote", submitted_at=sealed
    )
    two_votes = await _make_praxis(
        db_session, character, title="Two votes", submitted_at=sealed
    )
    db_session.add_all(
        [
            Vote(
                praxis_id=one_vote.id,
                voter_character_id=character2.id,
                voter_account_id=character2.account_id,
                value=3,
            ),
            Vote(
                praxis_id=two_votes.id,
                voter_character_id=character2.id,
                voter_account_id=character2.account_id,
                value=3,
            ),
            Vote(
                praxis_id=two_votes.id,
                voter_character_id=character3.id,
                voter_account_id=character3.account_id,
                value=5,
            ),
        ]
    )
    await db_session.commit()

    most = await list_praxes(
        db_session, status=PraxisStatus.submitted, sort=PraxisSort.most_voted
    )
    assert [p.id for p in most] == [
        two_votes.id,
        one_vote.id,
        tied_new.id,
        tied_mid.id,
        tied_old.id,
    ]

    least = await list_praxes(
        db_session, status=PraxisStatus.submitted, sort=PraxisSort.least_voted
    )
    assert [p.id for p in least] == [
        tied_new.id,
        tied_mid.id,
        tied_old.id,
        one_vote.id,
        two_votes.id,
    ]

    # Growing window: limit=3 must be the prefix of limit=5, for both sorts.
    for sort in (PraxisSort.most_voted, PraxisSort.least_voted):
        narrow = await list_praxes(
            db_session, status=PraxisStatus.submitted, sort=sort, limit=3
        )
        wide = await list_praxes(
            db_session, status=PraxisStatus.submitted, sort=sort, limit=5
        )
        assert [p.id for p in narrow] == [p.id for p in wide][:3]


@pytest.mark.asyncio
async def test_route_rejects_an_unknown_sort_and_era_scope(client: AsyncClient):
    bad_sort = await client.get("/praxes", params={"sort": "most_liked"})
    assert bad_sort.status_code == 422

    bad_scope = await client.get("/praxes", params={"era_scope": "next_era"})
    assert bad_scope.status_code == 422
