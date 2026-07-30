"""The profile grid contract (#1112).

Seam: ``GET /praxes?character_id=<id>`` — the fetch the character-profile page
actually makes (``CharacterProfile.tsx`` → ``listPraxes({ character_id })``).
NOT ``GET /characters/{id}/praxes``, which no client calls; that endpoint is
pinned separately in ``test_characters.py``.

Two owner-settled rules, both exercised here:

1. **Membership, not authorship** — a finished collab appears on the profile of
   every member, including the ones who did not create it (ADR-0013
   co-ownership).
2. **No drafts at all** — an ``in_progress`` praxis never appears, for any
   viewer, including the owner looking at their own profile. In-flight work
   lives in the sidebar, which asks for it explicitly via ``member_id`` +
   ``status=in_progress``; the profile is a public record of finished work.

Rule 2 is a visibility *narrowing*, so the cases below also prove rule 1 does
not widen anything: the grid must not become a new way to read a draft.
"""
import pytest
from httpx import AsyncClient

from models.character import Character
from models.task import Task


async def _submitted_collab(
    client: AsyncClient,
    task: Task,
    creator_headers: dict,
    invitee_id: int,
    invitee_headers: dict,
) -> int:
    """Create a two-member collab, accept the invite, and seal it submitted."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "Group Work"},
        headers=creator_headers,
    )
    assert create_resp.status_code == 201, create_resp.json()
    praxis_id = create_resp.json()["id"]

    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": invitee_id},
        headers=creator_headers,
    )
    assert invite_resp.status_code in (200, 201), invite_resp.json()
    accept_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_resp.json()['id']}/respond",
        json={"accept": True},
        headers=invitee_headers,
    )
    assert accept_resp.status_code == 200, accept_resp.json()

    for headers in (creator_headers, invitee_headers):
        submit_resp = await client.post(
            f"/praxes/{praxis_id}/submit", headers=headers
        )
        assert submit_resp.status_code == 200, submit_resp.json()
    assert submit_resp.json()["status"] == "submitted"
    return praxis_id


async def _grid_ids(
    client: AsyncClient, character_id: int, headers: dict | None = None
) -> list[int]:
    resp = await client.get(
        "/praxes", params={"character_id": character_id}, headers=headers or {}
    )
    assert resp.status_code == 200, resp.json()
    return [praxis["id"] for praxis in resp.json()]


# ---------------------------------------------------------------------------
# Rule 1 — membership, not authorship
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_grid_lists_a_collab_the_character_did_not_author(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The reported bug: B joins A's collab, it ships, and B's profile omits it."""
    praxis_id = await _submitted_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )

    assert praxis_id in await _grid_ids(client, character.id)


@pytest.mark.asyncio
async def test_grid_lists_the_same_collab_on_the_authors_profile(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One collab, several members — it appears on every member's grid, not just
    the author's. Membership must not *replace* authorship for the creator."""
    praxis_id = await _submitted_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )

    assert praxis_id in await _grid_ids(client, character2.id)


@pytest.mark.asyncio
async def test_grid_is_scoped_to_the_subject_not_the_viewer(
    client: AsyncClient,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A character with no memberships has an empty grid, however it is read."""
    await _submitted_collab(
        client, active_task, auth_headers2, character.id, auth_headers
    )

    assert await _grid_ids(client, character3.id) == []
    assert await _grid_ids(client, character3.id, auth_headers) == []


# ---------------------------------------------------------------------------
# Rule 2 — no drafts at all, for any viewer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_grid_hides_your_own_draft_from_you(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Your own solo draft used to show on your own profile. It stops."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Unfinished"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201, create_resp.json()
    draft_id = create_resp.json()["id"]

    assert draft_id not in await _grid_ids(client, character.id, auth_headers)


@pytest.mark.asyncio
async def test_grid_hides_a_collab_draft_from_a_co_member(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Membership scoping must not turn the grid into a draft reader.

    The viewer here is a member of the draft, so ``praxis_visibility_condition``
    alone would happily return it — the profile's own status rule is what keeps
    it out.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "In Flight"},
        headers=auth_headers2,
    )
    assert create_resp.status_code == 201, create_resp.json()
    draft_id = create_resp.json()["id"]
    invite_resp = await client.post(
        f"/praxes/{draft_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite_resp.status_code in (200, 201)
    accept_resp = await client.post(
        f"/praxes/{draft_id}/invite/{invite_resp.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept_resp.status_code == 200

    assert draft_id not in await _grid_ids(client, character.id, auth_headers)
    assert draft_id not in await _grid_ids(client, character2.id, auth_headers2)


@pytest.mark.asyncio
async def test_sidebar_still_reads_drafts_by_membership(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The draft is not lost — the sidebar's explicit query still finds it.

    ``useMyActiveTasks`` asks for ``member_id`` + ``status=in_progress``; the
    profile's no-drafts rule must not reach that call.
    """
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Unfinished"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    draft_id = create_resp.json()["id"]

    resp = await client.get(
        "/praxes",
        params={"member_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert draft_id in [praxis["id"] for praxis in resp.json()]


@pytest.mark.asyncio
async def test_task_detail_still_reads_its_own_draft_by_character_id(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    """``useTaskDetail`` asks for ``character_id`` + an explicit
    ``status=in_progress``. An explicit status wins over the profile default."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Unfinished"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    draft_id = create_resp.json()["id"]

    resp = await client.get(
        "/praxes",
        params={"character_id": character.id, "status": "in_progress"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert draft_id in [praxis["id"] for praxis in resp.json()]
