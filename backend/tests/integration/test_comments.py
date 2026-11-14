"""Integration tests for the comment system (ADR-0006)."""
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.comment import MAX_COMMENT_BODY, Comment
from models.era import Era
from models.praxis import Praxis
from models.roles import AccountRole, Role
from models.task import Task
from services.comment import create_comment
from tests.integration.factories import DEFAULT_FACTION_SLUG


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
    """character is level 0, below the gate."""
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
    assert body["author"]["faction_slug"] == DEFAULT_FACTION_SLUG
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
    # praxis author, not comment author
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
    await _set_level(db_session, character, era, 5)
    flag = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers,
    )
    assert flag.status_code == 200, flag.text
    # review threshold is 1
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
    resp = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


# Backend facts the frontend mention card relies on (#1196).


@pytest.mark.asyncio
async def test_mention_payload_carries_what_the_card_draws(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "this bit is yours @testcharacter"},
        headers=auth_headers2,
    )
    feed = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    payload = [i for i in feed.json()["items"] if i["type"] == "comment_mention"][0][
        "payload"
    ]
    assert payload["character_id"] == character2.id
    assert payload["praxis_id"] == praxis_solo.id
    assert payload["task_id"] is None
    # quoted verbatim, not re-truncated
    assert payload["excerpt"] == "this bit is yours @testcharacter"


@pytest.mark.asyncio
async def test_mention_counts_under_your_stuff_not_requests(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Nothing to accept or decline, so it must not inflate the Requests badge."""
    await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "over to you @testcharacter"},
        headers=auth_headers2,
    )

    def mentions(body: dict) -> list[dict]:
        return [i for i in body["items"] if i["type"] == "comment_mention"]

    for tab in ("all", "your_stuff"):
        feed = await client.get(
            "/activity-feed", params={"filter": tab}, headers=auth_headers
        )
        assert len(mentions(feed.json())) == 1, (tab, feed.json()["items"])
    assert feed.json()["counts"]["your_stuff"] >= 1

    requests_feed = await client.get(
        "/activity-feed", params={"filter": "requests"}, headers=auth_headers
    )
    assert mentions(requests_feed.json()) == []


@pytest.mark.asyncio
async def test_withdrawn_mention_leaves_no_card(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The card quotes the comment, so it would republish retracted text."""
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "ignore this @testcharacter"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    delete = await client.delete(f"/comments/{comment_id}", headers=auth_headers2)
    assert delete.status_code == 204

    feed = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert [i for i in feed.json()["items"] if i["type"] == "comment_mention"] == []


@pytest.mark.asyncio
async def test_hidden_mention_leaves_no_card(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A card outliving moderation would republish flagged text to its target."""
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "rude thing @testcharacter"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    # one eligible flag hides it (threshold 1)
    await _set_level(db_session, character, era, 5)
    flag = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "spam"},
        headers=auth_headers,
    )
    assert flag.status_code == 200, flag.text

    feed = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert [i for i in feed.json()["items"] if i["type"] == "comment_mention"] == []


# Exactly-one-target is also a DB CHECK; testing the service guard avoids an
# IntegrityError rollback fighting the conftest SAVEPOINTs.


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


# Body cap (#1205): server is the enforcement, client maxLength a courtesy.


@pytest.mark.asyncio
async def test_body_cap_is_500(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    assert MAX_COMMENT_BODY == 500

    at_cap = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "x" * MAX_COMMENT_BODY},
        headers=auth_headers2,
    )
    assert at_cap.status_code == 201, at_cap.text

    over_cap = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "x" * (MAX_COMMENT_BODY + 1)},
        headers=auth_headers2,
    )
    assert over_cap.status_code == 422


@pytest.mark.asyncio
async def test_body_stored_over_the_cap_still_reads_in_full(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    db_session: AsyncSession,
):
    """Prod holds pre-cap bodies over 500; the cap governs writes only."""
    legacy_length = 1500
    db_session.add(
        Comment(
            praxis_id=praxis_solo.id,
            created_by_id=character2.id,
            body_text="x" * legacy_length,
        )
    )
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_solo.id}/comments")
    assert resp.status_code == 200, resp.text
    assert [len(c["body_text"]) for c in resp.json()] == [legacy_length]


@pytest.mark.asyncio
async def test_an_admin_below_the_level_gate_can_actually_post(
    client: AsyncClient,
    account: Account,
    character: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """``can_comment`` on /auth/me and the write path must agree for an admin.

    ``character`` is level 0, so only the admin short-circuit can pass this.
    """
    role = Role(name="admin", description="Administrator")
    db_session.add(role)
    await db_session.flush()
    db_session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )
    await db_session.commit()

    me_response = await client.get("/auth/me", headers=auth_headers)
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["can_comment"] is True

    post_response = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "the box said I could"},
        headers=auth_headers,
    )
    assert post_response.status_code == 201, (
        "the /auth/me flag says this viewer may comment and the write door "
        f"disagreed: {post_response.text}"
    )
