"""``GET /me/sidebar``: the rail's one compound read (#1344).

Load-bearing: the activity-feed fan-out runs once, not once per panel.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import services.activity_feed as activity_feed_service
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.praxis import (
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task
from models.vote import Vote
from services.activity_feed import REQUEST_ITEM_TYPES
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Any live faction other than the fixtures' default; derived, never named (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


@pytest.mark.asyncio
async def test_sidebar_returns_all_three_panels(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    mine = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="My in-flight praxis",
        body_text="draft",
    )
    db_session.add(mine)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=mine.id, character_id=character.id))

    collab = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.collab,
        status=PraxisStatus.in_progress,
        title="Collab praxis",
        body_text="proof",
    )
    db_session.add(collab)
    await db_session.flush()
    db_session.add(
        PraxisInvite(
            praxis_id=collab.id,
            inviter_id=character2.id,
            invitee_id=character.id,
            status=PraxisInviteStatus.pending,
        )
    )
    await db_session.commit()

    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["pending_requests_count"] == 1
    # Membership, not equality: the panel also carries the era announcement.
    assert "global_task" in [item["type"] for item in data["global_activity"]]
    assert [praxis["id"] for praxis in data["active_praxes"]] == [mine.id]


@pytest.mark.asyncio
async def test_sidebar_runs_the_feed_fan_out_once(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    monkeypatch: pytest.MonkeyPatch,
):
    """One fan-out, no badge counts.

    ``get_archive_view`` runs once per fan-out, so it counts runs.
    ``_compute_counts`` is 15 COUNTs the rail never draws. The activity count is
    ``len()`` of the existing fan-out (#1587), not a second pass.
    """
    archive_view_calls = 0
    real_get_archive_view = activity_feed_service.get_archive_view

    async def counting_get_archive_view(*args, **kwargs):
        nonlocal archive_view_calls
        archive_view_calls += 1
        return await real_get_archive_view(*args, **kwargs)

    count_calls = 0
    real_compute_counts = activity_feed_service._compute_counts

    async def counting_compute_counts(*args, **kwargs):
        nonlocal count_calls
        count_calls += 1
        return await real_compute_counts(*args, **kwargs)

    fetch_calls = 0
    real_fetch_sources = activity_feed_service._fetch_sources

    async def counting_fetch_sources(*args, **kwargs):
        nonlocal fetch_calls
        fetch_calls += 1
        return await real_fetch_sources(*args, **kwargs)

    count_source_calls = 0
    real_count_sources = activity_feed_service._count_sources

    async def counting_count_sources(*args, **kwargs):
        nonlocal count_source_calls
        count_source_calls += 1
        return await real_count_sources(*args, **kwargs)

    monkeypatch.setattr(
        activity_feed_service, "get_archive_view", counting_get_archive_view
    )
    monkeypatch.setattr(
        activity_feed_service, "_compute_counts", counting_compute_counts
    )
    monkeypatch.setattr(
        activity_feed_service, "_fetch_sources", counting_fetch_sources
    )
    monkeypatch.setattr(
        activity_feed_service, "_count_sources", counting_count_sources
    )

    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200

    assert archive_view_calls == 1, (
        f"the rail's two feed panels must share one fan-out; "
        f"the service ran {archive_view_calls} times"
    )
    assert count_calls == 0, "the rail draws no badges and must not pay for counts"
    assert fetch_calls == 1, (
        f"the activity count is len() of the fan-out already run, not a second "
        f"one; _fetch_sources ran {fetch_calls} times (#1587)"
    )
    assert count_source_calls == 1, (
        f"only the four request sources are COUNTed; _count_sources ran "
        f"{count_source_calls} times (#1587)"
    )


@pytest.mark.asyncio
async def test_sidebar_is_401_for_a_guest(client: AsyncClient):
    """Contract: the client fires this unconditionally, so ``shouldReturnToLanding``
    excludes its 401 (``sessionRedirect.test.ts``). Change both together."""
    response = await client.get("/me/sidebar")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sidebar_without_a_character_is_empty(
    client: AsyncClient,
    era,
    auth_headers: dict,
):
    """200, not 403: the rail still renders its "no character yet" card."""
    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {
        "pending_requests_count": 0,
        "global_activity": [],
        "global_activity_count": 0,
        "active_praxes": [],
    }


@pytest.mark.asyncio
async def test_activity_count_is_the_whole_panel_not_the_five_item_glance(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    auth_headers: dict,
):
    """#1587: count is taken before the five-item slice, and equals the ``all``
    view it links to (ADR-0036)."""
    from models.task import TaskStatus

    db_session.add_all([
        Task(
            title=f"Task {n}",
            description="news",
            point_value=10,
            level_required=0,
            status=TaskStatus.active,
            created_by=character.id,
            primary_faction_slug=DEFAULT_FACTION_SLUG,
        )
        for n in range(12)
    ])
    await db_session.commit()

    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    assert len(body["global_activity"]) == activity_feed_service.SIDEBAR_ACTIVITY_LIMIT
    assert body["global_activity_count"] >= 12, (
        "twelve pieces of news must count as twelve; the panel said "
        f"{body['global_activity_count']}"
    )

    feed = await client.get(
        "/activity-feed",
        params={"filter": "all", "limit": 100},
        headers=auth_headers,
    )
    assert feed.status_code == 200
    assert body["global_activity_count"] == len(feed.json()["items"]), (
        "the number and the list it leads to are one fetch (ADR-0036)"
    )


@pytest.mark.asyncio
async def test_activity_count_excludes_the_requests_it_is_shown_beside(
    client: AsyncClient,
    four_request_types: int,
    auth_headers: dict,
):
    """#1587: an obligation counts once, on the requests side (ADR-0070).

    Counting ``FILTER_ALL``'s sources instead of ``_visible_types`` would
    double-count all four.
    """
    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["pending_requests_count"] == four_request_types

    feed = await client.get(
        "/activity-feed",
        params={"filter": "all", "limit": 100},
        headers=auth_headers,
    )
    assert feed.status_code == 200
    items = feed.json()["items"]
    assert {item["type"] for item in items}.isdisjoint(REQUEST_ITEM_TYPES), (
        "guard: the live `all` view already excludes the obligations"
    )
    assert body["global_activity_count"] == len(items), (
        f"the news count {body['global_activity_count']} must be the "
        f"obligation-free view's {len(items)} — no item on both rows"
    )


@pytest_asyncio.fixture
async def four_request_types(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction,
) -> int:
    """One unanswered item per request type plus an answered twin of each; returns 4.

    The twins prove the ADR-0070 "unanswered" window per type:

    ``collab_invite``      ``pending`` AND room still joinable
    ``duel_challenge``     ``pending``
    ``awaiting_submission``  ``has_submitted`` false
    ``invitation_letter``  faction is not the one you stand in

    ``collab_invite`` has a second twin (#2279): pending but its praxis is
    submitted, so ``respond_to_invite`` would refuse it.
    """
    def praxis(owner_id: int, praxis_type: PraxisType, title: str) -> Praxis:
        return Praxis(
            task_id=active_task.id,
            created_by_id=owner_id,
            type=praxis_type,
            status=PraxisStatus.in_progress,
            title=title,
            body_text="proof",
        )

    open_collab = praxis(character2.id, PraxisType.collab, "Open collab")
    answered_collab = praxis(character2.id, PraxisType.collab, "Answered collab")
    shut_collab = praxis(character2.id, PraxisType.collab, "Shut collab")
    shut_collab.status = PraxisStatus.submitted
    open_duel_praxis = praxis(character2.id, PraxisType.duel, "Open duel")
    answered_duel_praxis = praxis(character2.id, PraxisType.duel, "Answered duel")
    # Creator's member row too: an obligation needs another party (#1980).
    my_turn = praxis(character2.id, PraxisType.collab, "My turn")
    already_filed = praxis(character2.id, PraxisType.collab, "Already filed")
    db_session.add_all([
        open_collab, answered_collab, shut_collab, open_duel_praxis,
        answered_duel_praxis, my_turn, already_filed,
    ])
    await db_session.flush()

    db_session.add_all([
        PraxisInvite(
            praxis_id=open_collab.id,
            inviter_id=character2.id,
            invitee_id=character.id,
            status=PraxisInviteStatus.pending,
        ),
        PraxisInvite(
            praxis_id=answered_collab.id,
            inviter_id=character2.id,
            invitee_id=character.id,
            status=PraxisInviteStatus.declined,
        ),
        PraxisInvite(
            praxis_id=shut_collab.id,
            inviter_id=character2.id,
            invitee_id=character.id,
            status=PraxisInviteStatus.pending,
        ),
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=open_duel_praxis.id,
            opponent_character_id=character.id,
            status=DuelStatus.pending,
        ),
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=answered_duel_praxis.id,
            opponent_character_id=character.id,
            status=DuelStatus.active,
        ),
        PraxisMember(
            praxis_id=my_turn.id, character_id=character.id, has_submitted=False
        ),
        PraxisMember(
            praxis_id=my_turn.id, character_id=character2.id, has_submitted=False
        ),
        PraxisMember(
            praxis_id=already_filed.id, character_id=character.id, has_submitted=True
        ),
        # Must differ from ``my_turn`` only in ``has_submitted``.
        PraxisMember(
            praxis_id=already_filed.id, character_id=character2.id, has_submitted=False
        ),
        InvitationLetter(
            character_id=character.id, faction_slug=OTHER_FACTION_SLUG, era_id=era.id
        ),
        InvitationLetter(
            character_id=character.id,
            faction_slug=character.faction_slug,
            era_id=era.id,
        ),
    ])
    await db_session.commit()
    return 4


@pytest.mark.asyncio
async def test_sidebar_badge_equals_the_requests_queue_card_count(
    client: AsyncClient,
    four_request_types: int,
    auth_headers: dict,
):
    """Badge == queue card count (ADR-0036). Different code paths (COUNT vs fan-out),
    so only this stops them drifting."""
    sidebar = await client.get("/me/sidebar", headers=auth_headers)
    assert sidebar.status_code == 200
    badge = sidebar.json()["pending_requests_count"]

    queue = await client.get(
        "/activity-feed", params={"filter": "requests"}, headers=auth_headers
    )
    assert queue.status_code == 200
    queue_body = queue.json()

    assert badge == four_request_types, (
        "one unanswered item of each of the four request types is 4; the "
        f"badge said {badge}"
    )
    assert badge == len(queue_body["items"]), (
        f"badge {badge} vs {len(queue_body['items'])} cards in the queue"
    )
    assert badge == queue_body["counts"]["requests"], (
        f"badge {badge} vs the queue's own tab count "
        f"{queue_body['counts']['requests']}"
    )
    assert sorted(item["type"] for item in queue_body["items"]) == sorted(
        REQUEST_ITEM_TYPES
    )


@pytest.mark.asyncio
async def test_sidebar_ships_the_number_without_the_items(
    client: AsyncClient,
    four_request_types: int,
    auth_headers: dict,
):
    """#1456: a count, and the request items absent from the payload."""
    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    assert body["pending_requests_count"] == four_request_types
    assert "pending_requests" not in body, (
        "the response still carries the request items it was meant to stop "
        "serialising"
    )
    assert isinstance(body["global_activity"], list)
    assert isinstance(body["active_praxes"], list)


@pytest.mark.asyncio
async def test_activity_panel_carries_the_players_own_news_not_just_global(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """#1556: the panel is the whole feed (``vote_on_mine`` is ``your_stuff``)."""
    mine = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="A praxis of mine",
        body_text="proof",
    )
    db_session.add(mine)
    await db_session.flush()
    db_session.add(
        Vote(
            praxis_id=mine.id,
            voter_character_id=character2.id,
            voter_account_id=character2.account_id,
            value=4,
        )
    )
    await db_session.commit()

    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    types = [item["type"] for item in response.json()["global_activity"]]

    assert "vote_on_mine" in types, (
        "the rail's activity panel must carry the viewer's own news; it "
        f"returned {types}"
    )


@pytest.mark.asyncio
async def test_activity_panel_excludes_exactly_what_the_requests_queue_holds(
    client: AsyncClient,
    four_request_types: int,
    auth_headers: dict,
):
    """#1556: panel and queue partition the feed via ``_visible_types`` (ADR-0070)."""
    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    panel_types = {item["type"] for item in body["global_activity"]}
    assert body["pending_requests_count"] == four_request_types, (
        "guard: the fixture's four obligations are outstanding"
    )
    assert panel_types.isdisjoint(REQUEST_ITEM_TYPES), (
        "an unanswered obligation reached the rail's activity panel: "
        f"{sorted(panel_types & REQUEST_ITEM_TYPES)} (ADR-0070)"
    )
