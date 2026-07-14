"""Integration tests for the comment system (ADR-0006).

Covers the CHECK exactly-one-target invariant, the level gate, author-only edit,
soft-delete filtering, the flag threshold → flagged transition, @mention
resolution (incl. self-mention skip + edit reconciliation), and mention → feed.
"""
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis
from models.task import Task
from services.comment import create_comment


async def _set_level(
    db_session: AsyncSession, character: Character, era: Era, level: int
) -> None:
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await db_session.commit()


@pytest.mark.asyncio
async def test_comment_requires_level(
    client: AsyncClient, praxis_solo: Praxis, auth_headers: dict
):
    """character is level 0 < comment_level_required (2)."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "hi"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_and_list_praxis_comment(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "nice work"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["author"]["faction_slug"] == "ua"
    assert body["author"]["username"] == "othercharacter"
    assert body["is_edited"] is False

    list_resp = await client.get(f"/praxes/{praxis_solo.id}/comments")
    assert list_resp.status_code == 200
    assert [c["body_text"] for c in list_resp.json()] == ["nice work"]


@pytest.mark.asyncio
async def test_comment_on_active_task(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    resp = await client.post(
        f"/tasks/{active_task.id}/comments",
        json={"body_text": "on a task"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201, resp.text
    list_resp = await client.get(f"/tasks/{active_task.id}/comments")
    assert [c["body_text"] for c in list_resp.json()] == ["on a task"]


@pytest.mark.asyncio
async def test_mention_resolves_and_excludes_self(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    """@testcharacter resolves; @othercharacter (self) is skipped."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "hey @testcharacter and @othercharacter"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201, resp.text
    mentions = resp.json()["mentions"]
    assert [m["username"] for m in mentions] == ["testcharacter"]
    assert mentions[0]["character_id"] == character.id


@pytest.mark.asyncio
async def test_edit_reconciles_mentions_and_marks_edited(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "ping @testcharacter"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    assert [m["username"] for m in create.json()["mentions"]] == ["testcharacter"]

    edit = await client.patch(
        f"/comments/{comment_id}",
        json={"body_text": "no mention now"},
        headers=auth_headers2,
    )
    assert edit.status_code == 200, edit.text
    assert edit.json()["is_edited"] is True
    assert edit.json()["mentions"] == []


@pytest.mark.asyncio
async def test_author_only_edit(
    client: AsyncClient,
    praxis_solo: Praxis,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "mine"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    # character (praxis author, not the comment author) tries to edit
    resp = await client.patch(
        f"/comments/{comment_id}",
        json={"body_text": "hijack"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_withdraw_hides_from_list(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "delete me"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    delete = await client.delete(f"/comments/{comment_id}", headers=auth_headers2)
    assert delete.status_code == 204
    list_resp = await client.get(f"/praxes/{praxis_solo.id}/comments")
    assert list_resp.json() == []


@pytest.mark.asyncio
async def test_flag_threshold_flags_and_hides(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "flag me"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    # raise character to L5 so it can flag (flag_level_required=4)
    await _set_level(db_session, character, era, 5)
    flag = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers,
    )
    assert flag.status_code == 200, flag.text
    # comment_flag_review_threshold is 1 → now flagged → filtered from public list
    list_resp = await client.get(f"/praxes/{praxis_solo.id}/comments")
    assert list_resp.json() == []


@pytest.mark.asyncio
async def test_self_flag_rejected(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "self"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    resp = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_flag_requires_level(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "flagme"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    # character is level 0 < flag_level_required (4)
    resp = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_mention_notifies_via_activity_feed(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "look @testcharacter"},
        headers=auth_headers2,
    )
    feed = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert feed.status_code == 200
    mention_items = [
        i for i in feed.json()["items"] if i["type"] == "comment_mention"
    ]
    assert len(mention_items) == 1, feed.json()["items"]
    assert mention_items[0]["payload"]["praxis_id"] == praxis_solo.id
    assert mention_items[0]["actor_display_name"] == character2.display_name


# Exactly-one-target is a DB CHECK (num_nonnulls(praxis_id, task_id) = 1, in
# migration 0005). The service guards it first with a clean 422; testing the guard
# here keeps us clear of the conftest's SAVEPOINT machinery, which an IntegrityError
# rollback would fight.


@pytest.mark.asyncio
async def test_service_rejects_two_targets(
    db_session: AsyncSession,
    character2: Character,
    praxis_solo: Praxis,
    active_task: Task,
):
    with pytest.raises(HTTPException) as exc:
        await create_comment(
            character2,
            praxis_id=praxis_solo.id,
            task_id=active_task.id,
            body_text="both",
            session=db_session,
        )
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_service_requires_a_target(
    db_session: AsyncSession, character2: Character
):
    with pytest.raises(HTTPException) as exc:
        await create_comment(
            character2,
            praxis_id=None,
            task_id=None,
            body_text="neither",
            session=db_session,
        )
    assert exc.value.status_code == 422
