"""The collab roster's portraits on the wire (#2318).

``PraxisMemberOut`` / ``PraxisInviteOut`` carried a display name and no face, so
every roster surface — ``CollabRoster``, the praxis card's roster, and the
praxis-detail byline — could only ever draw its monogram fallback. The fix is
one field on each of the two rows.

The N+1 half is the point of ``test_roster_portraits_cost_no_extra_query``:
``PraxisMember.character`` and ``PraxisInvite.invitee`` are both
``lazy="selectin"`` at the model level, so the Character rows are already
hydrated and batched. Reading one more column off them must stay free — the
assertion is that the statement count does not move when the roster grows.
"""

from contextlib import contextmanager

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.task import Task

from .factories import make_task


@contextmanager
def _count_selects(db_connection):
    """Collect every SELECT issued on the test connection while the block runs."""
    selects: list[str] = []
    sync_connection = db_connection.sync_connection

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            selects.append(statement)

    event.listen(sync_connection, "before_cursor_execute", before_cursor_execute)
    try:
        yield selects
    finally:
        event.remove(sync_connection, "before_cursor_execute", before_cursor_execute)


async def _collab_with(
    client: AsyncClient,
    task: Task,
    creator_headers: dict,
    joiners: list[tuple[int, dict]],
) -> int:
    """A collab owned by ``creator_headers`` that ``joiners`` have all accepted."""
    create_resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "Co-owned"},
        headers=creator_headers,
    )
    assert create_resp.status_code == 201, create_resp.text
    praxis_id = create_resp.json()["id"]
    for invitee_id, invitee_headers in joiners:
        invite_resp = await client.post(
            f"/praxes/{praxis_id}/invite",
            json={"invitee_id": invitee_id},
            headers=creator_headers,
        )
        assert invite_resp.status_code == 200, invite_resp.text
        accepted = await client.post(
            f"/praxes/{praxis_id}/invite/{invite_resp.json()['id']}/respond",
            json={"accept": True},
            headers=invitee_headers,
        )
        assert accepted.status_code == 200, accepted.text
    return praxis_id


@pytest.mark.asyncio
async def test_member_rows_carry_the_portrait_and_fall_back_to_empty(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A member with a photo puts it on the wire; one without sends "".

    The empty string is the ordinary case, not an error — ``Character.avatar_url``
    is ``nullable=False, server_default=""`` — and it is what every roster
    surface reads to decide the monogram fallback. A relative media path, never
    an absolute one: the same value ``created_by_avatar_url`` already emits.
    """
    character.avatar_url = "avatars/one.png"
    character2.avatar_url = ""
    await db_session.flush()

    praxis_id = await _collab_with(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.status_code == 200, detail.text
    by_character = {
        member["character_id"]: member for member in detail.json()["members"]
    }
    assert by_character[character.id]["character_avatar_url"] == "avatars/one.png"
    assert by_character[character2.id]["character_avatar_url"] == ""


@pytest.mark.asyncio
async def test_invite_rows_carry_the_invitees_portrait(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """An unanswered invite carries the invitee's face too (#2318 ruling).

    The dashed ring is the state and the face is the person, so an invited row
    draws the portrait inside the ring rather than falling back to a monogram to
    signal "not yet a member".
    """
    character3.avatar_url = "avatars/three.png"
    await db_session.flush()

    praxis_id = await _collab_with(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    pending = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character3.id},
        headers=auth_headers2,
    )
    assert pending.status_code == 200, pending.text

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.status_code == 200, detail.text
    invites = {i["invitee_id"]: i for i in detail.json()["invites"]}
    assert invites[character3.id]["invitee_avatar_url"] == "avatars/three.png"


@pytest.mark.asyncio
async def test_roster_portraits_cost_no_extra_query(
    client: AsyncClient,
    db_connection,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    """Reading the portrait must not add a statement, and must not scale.

    ``character.avatar_url`` rides the Character row the roster already loads, so
    a two-member detail read and a three-member one must issue the same number of
    SELECTs. A per-row dereference would show up here as an extra statement — the
    ``/tasks`` ~300-queries-a-page shape this repo has paid for before.
    """
    for member in (character, character2, character3):
        member.avatar_url = f"avatars/{member.username}.png"
    await db_session.flush()

    small = await _collab_with(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    # A second task: one character may hold only one live praxis per task, so
    # the two rosters cannot share ``active_task``.
    second_task = await make_task(db_session, character2, title="Second Task")
    large = await _collab_with(
        client,
        second_task,
        auth_headers2,
        [(character.id, auth_headers), (character3.id, auth_headers3)],
    )

    with _count_selects(db_connection) as small_selects:
        small_resp = await client.get(f"/praxes/{small}", headers=auth_headers2)
    with _count_selects(db_connection) as large_selects:
        large_resp = await client.get(f"/praxes/{large}", headers=auth_headers2)

    assert len(small_resp.json()["members"]) == 2
    assert len(large_resp.json()["members"]) == 3
    assert len(large_selects) == len(small_selects), (
        "the roster read grew a statement when it grew a member:\n"
        + "\n".join(large_selects)
    )
