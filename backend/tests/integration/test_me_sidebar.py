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
from services.activity_feed import REQUEST_ITEM_TYPES


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
    # global panel also carries the era announcement — the rail renders that
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

    monkeypatch.setattr(
        activity_feed_service, "get_archive_view", counting_get_archive_view
    )
    monkeypatch.setattr(
        activity_feed_service, "_compute_counts", counting_compute_counts
    )

    response = await client.get("/me/sidebar", headers=auth_headers)
    assert response.status_code == 200

    assert archive_view_calls == 1, (
        f"the rail's two feed panels must share one fan-out; "
        f"the service ran {archive_view_calls} times"
    )
    assert count_calls == 0, "the rail draws no badges and must not pay for counts"


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
        "active_praxes": [],
    }


@pytest_asyncio.fixture
async def four_request_types(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    faction_ephemerists,
) -> int:
    """One UNANSWERED item of each of the four request types, plus an ANSWERED
    twin of each that must not be counted. Returns the expected count (4).

    The answered twins are the point. A fixture of all-pending items passes on a
    broken filter — it is only the twins that prove the badge is reading the
    same ADR-0070 "unanswered" window the queue reads, per type:

    ``collab_invite``      status is ``pending``
    ``duel_challenge``     status is ``pending``
    ``awaiting_submission``  ``PraxisMember.has_submitted`` is false
    ``invitation_letter``  the letter's faction is not the one you now stand in
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
    # --- duel_challenge: one pending (counts), one active (does not) -- -------
    open_duel_praxis = praxis(character2.id, PraxisType.duel, "Open duel")
    answered_duel_praxis = praxis(character2.id, PraxisType.duel, "Answered duel")
    # --- awaiting_submission: viewer un-submitted (counts) / submitted (not) -
    my_turn = praxis(character2.id, PraxisType.collab, "My turn")
    already_filed = praxis(character2.id, PraxisType.collab, "Already filed")
    db_session.add_all([
        open_collab, answered_collab, open_duel_praxis,
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
            praxis_id=already_filed.id, character_id=character.id, has_submitted=True
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
