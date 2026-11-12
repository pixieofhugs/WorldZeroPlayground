"""Collab roster portraits on ``PraxisMemberOut`` / ``PraxisInviteOut`` (#2318),
read off the already-selectin-loaded Character rows at no extra query.
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
    """Empty string is the ordinary no-photo case: the monogram fallback."""
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
    """#2318 ruling: the dashed ring shows the state, the face the person."""
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
    for member in (character, character2, character3):
        member.avatar_url = f"avatars/{member.username}.png"
    await db_session.flush()

    small = await _collab_with(
        client, active_task, auth_headers2, [(character.id, auth_headers)]
    )
    # One live praxis per character per task.
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
