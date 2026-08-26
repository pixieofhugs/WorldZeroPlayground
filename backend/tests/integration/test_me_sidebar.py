"""Integration tests for ``GET /me/sidebar`` — the rail's one compound read (#1344).

THE SEAM
--------
The route. The desktop rail used to make three requests, each gated on
``/auth/me`` resolving: the activity feed under ``requests`` (limit 100), the
activity feed under ``global`` (limit 5), and the in-progress praxis listing for
the carried character. None of the three needed anything from the client — the
route resolves the viewer from the JWT — so all three are answered here in one
call, fired in the first wave.

The load-bearing assertion is not "three lists came back". It is that the
activity-feed fan-out runs **once**, not once per filter: the two feed panels are
two slices of a single fan-out over the union of their sources. Running the
service twice would be three requests' worth of server work behind one request,
which is the shape this issue exists to remove.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import services.activity_feed as activity_feed_service
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


@pytest.mark.asyncio
async def test_sidebar_returns_all_three_panels(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """One call answers the requests panel, the global panel and the task panel."""
    # In-progress praxis the viewer is a member of — the "In Progress" panel.
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

    # A pending collab invite — the "Pending Requests" panel.
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

    assert data["pending_requests_count"] == 1  # the collab invite
    # `active_task` is active in the current era, so it is global news. The
    # activity panel also carries the era announcement — the rail renders that
    # type too — so this asserts membership, not the whole list.
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
    """The two feed panels cost ONE fan-out, and no badge counts at all.

    ``get_archive_view`` is read exactly once per feed run, so counting it counts
    runs. Two calls here would mean the compound had simply chained the old
    per-filter endpoint twice — the same server work, merely hidden behind one
    request.

    ``_compute_counts`` is 15 COUNT queries the rail has no use for: it draws no
    badges. The old ``requests``/``global`` fetches paid for 30 of them between
    them, every signed-in page load.

    ``_fetch_sources`` is counted for #1587: the activity COUNT is
    ``len()`` of the fan-out this already runs, taken before the five-item
    slice. A second fan-out — or a ``_count_sources`` pass over the twelve
    ``all`` sources — would be the cost this whole path exists to avoid, and
    #1532/#1539 cut it from 31 connections to 2.
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
    """A guest gets 401 — the contract the frontend's probe exclusion rests on.

    The JWT is an httpOnly cookie, so the client cannot know synchronously
    whether anyone is signed in; it fires this unconditionally and a guest's
    answer is 401. That 401 must therefore be excluded from
    ``shouldReturnToLanding`` alongside ``/auth/me`` — see
    ``frontend/src/api/__tests__/sessionRedirect.test.ts``. If this assertion
    ever changes, that exclusion has to change with it.
    """
    response = await client.get("/me/sidebar")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sidebar_without_a_character_is_empty(
    client: AsyncClient,
    era,
    auth_headers: dict,
):
    """A signed-in account with no character gets 200 and three empty panels.

    Not 403: the rail renders for such an account — it shows the "no character
    yet" card — so the panels being empty is the answer, not an error.
    """
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
    """#1587: the count is the fan-out's length, taken BEFORE the glance slice.

    Twelve active tasks are twelve ``global_task`` items. The panel still ships
    five — it is a glance, and #1456 is not being undone — but the number beside
    it must be twelve-and-then-some, not five. Reading ``len(global_activity)``
    on the client is exactly the display cap this issue exists to replace.

    The equality against the ``all`` view is the ADR-0036 half: the number and
    the list a player reaches by tapping it are the same fetch, so the badge
    cannot disagree with what it leads to.
    """
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
    """#1587: an outstanding obligation is counted ONCE, on the requests side.

    The mobile home draws one row from these two numbers — requests first, news
    second. Both come out of ``_visible_types`` on the same response, so ADR-0070's
    partition is what stops a collab invite being counted in both. A count taken
    over ``FILTER_ALL``'s *sources* rather than its *visible types* would pass a
    typecheck and silently double-count all four.
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
    """One UNANSWERED item of each of the four request types, plus an ANSWERED
    twin of each that must not be counted. Returns the expected count (4).

    The answered twins are the point. A fixture of all-pending items passes on a
    broken filter — it is only the twins that prove the badge is reading the
    same ADR-0070 "unanswered" window the queue reads, per type:

    ``collab_invite``      status is ``pending`` AND the room is still joinable
    ``duel_challenge``     status is ``pending``
    ``awaiting_submission``  ``PraxisMember.has_submitted`` is false
    ``invitation_letter``  the letter's faction is not the one you now stand in

    ``collab_invite`` carries a SECOND answered twin (#2279): an invite left
    ``pending`` whose praxis has since been submitted. Its status column says
    unanswered, but ``respond_to_invite`` refuses the accept with
    ``invite_praxis_submitted`` — so it is a request nobody can answer, and the
    queue's promise is that everything in it is waiting on an answer from you.
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

    # --- collab_invite: one pending (counts), one declined (does not) --------
    open_collab = praxis(character2.id, PraxisType.collab, "Open collab")
    answered_collab = praxis(character2.id, PraxisType.collab, "Answered collab")
    # ...and one still pending whose room has closed: unanswerable (#2279).
    shut_collab = praxis(character2.id, PraxisType.collab, "Shut collab")
    shut_collab.status = PraxisStatus.submitted
    # --- duel_challenge: one pending (counts), one active (does not) -- -------
    open_duel_praxis = praxis(character2.id, PraxisType.duel, "Open duel")
    answered_duel_praxis = praxis(character2.id, PraxisType.duel, "Answered duel")
    # --- awaiting_submission: viewer un-submitted (counts) / submitted (not) -
    # Both carry their creator's member row as well as the viewer's: an
    # obligation needs somebody else to be party to it (#1980), and a collab the
    # creator never appeared in is a shape no route can produce.
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
        # Pending, and still unanswerable: the room it opens onto is submitted.
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
        # The twin differs from ``my_turn`` in ``has_submitted`` and nothing
        # else, or it stops being a twin.
        PraxisMember(
            praxis_id=already_filed.id, character_id=character2.id, has_submitted=False
        ),
        # A letter for a faction the viewer does NOT stand in is an open ask...
        InvitationLetter(
            character_id=character.id, faction_slug="ephemerists", era_id=era.id
        ),
        # ...and one for the faction they already joined is answered by standing.
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
    """THE guard: the badge's number IS the number of cards the queue presents.

    The badge on the collapsed rail, the mobile bell and the FieldDesk all read
    one integer; the Requests queue on ``/updates`` renders the cards. They are
    computed by different code paths — a COUNT over each source's own windowed
    query here, a fan-out and a sort there — so nothing but this assertion stops
    them drifting the first time either side's idea of "unanswered" moves. A
    badge reading 5 over a list of 3 is exactly what ADR-0036 exists to prevent.
    """
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
    # ...and it is one of EACH type, so no single type is carrying the number.
    assert sorted(item["type"] for item in queue_body["items"]) == sorted(
        REQUEST_ITEM_TYPES
    )


@pytest.mark.asyncio
async def test_sidebar_ships_the_number_without_the_items(
    client: AsyncClient,
    four_request_types: int,
    auth_headers: dict,
):
    """The whole point of #1456: a count, and no request items in the payload.

    Asserting the absence, not merely the presence of the count — shipping both
    would leave the up-to-100 hydrated items on the page-load path that this
    exists to take off it.
    """
    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    assert body["pending_requests_count"] == four_request_types
    assert "pending_requests" not in body, (
        "the response still carries the request items it was meant to stop "
        "serialising"
    )
    # The other two panels still ship their items — this narrows one field.
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
    """#1556: the panel is the whole live feed, not the ``global`` tab.

    A vote on the viewer's own praxis is ``vote_on_mine`` — a ``your_stuff``
    type that the old ``global``-only panel could not carry at any volume of
    activity. It is the sharpest single case for the widening, because it is
    the one the design calls out by name: *"Dr. Vale voted on your praxis"*.
    """
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
    """THE guard for #1556: the panel and the queue PARTITION the live feed.

    ADR-0070 — *an unanswered obligation lives in the queue, never in the
    stream*. The panel widened from the two ``global`` sources to the whole
    live ``all`` view, which in the registry includes all four obligation
    types; ``_visible_types`` is what takes them back out, and it is the same
    call the Requests queue makes. Hand-rolling a second exclusion here is the
    failure this pins: it would pass every typecheck and silently give the four
    types two live surfaces again, which is the exact defect ADR-0070 exists to
    prevent.

    The fixture makes this sharp — one UNANSWERED item of each of the four
    types, so a leak cannot hide behind an empty source.
    """
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
