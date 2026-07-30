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
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import services.activity_feed as activity_feed_service
from models.character import Character
from models.praxis import (
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task


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

    assert [item["type"] for item in data["pending_requests"]] == ["collab_invite"]
    # `active_task` is active in the current era, so it is global news.
    assert [item["type"] for item in data["global_activity"]] == ["global_task"]
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
        "pending_requests": [],
        "global_activity": [],
        "active_praxes": [],
    }
