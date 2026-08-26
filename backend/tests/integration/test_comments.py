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


# ── The mention CARD (#1196) ──────────────────────────────────────────────────
#
# `comment_mention` had a correct query and a complete payload from the day it
# shipped and no frontend case, so every mention ever sent rendered as nothing.
# The fix is frontend, but it leans on three backend facts. These pin them, so a
# change here fails loudly instead of quietly blanking the card again.


@pytest.mark.asyncio
async def test_mention_payload_carries_what_the_card_draws(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Actor link, exactly one target, and the quoted excerpt."""
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
    # The commenter, so the card's actor can link to their character page.
    assert payload["character_id"] == character2.id
    # Exactly one target — the CHECK constraint, seen from the client's side. The
    # card reads praxis_id then task_id and needs no tie-break.
    assert payload["praxis_id"] == praxis_solo.id
    assert payload["task_id"] is None
    # The card quotes this verbatim and does not re-truncate.
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
    """A mention is news about you, not a request of you.

    Nothing is being asked — there is no accept, decline or answer — so it counts
    under Your stuff and must NOT inflate the Requests badge, which exists to say
    "someone is waiting on a decision from you".
    """
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
    """Withdrawing the comment withdraws the mention card with it.

    The card quotes the comment's own words, so a withdrawn comment that still had
    a feed card would keep publishing text its author had retracted — to the one
    person it named.
    """
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
    """A comment hidden by moderation loses its card too.

    The mention query asks for ``moderation_status == visible``, so the card and
    the public thread hide the same comment at the same moment. A card that
    outlived the hiding would republish flagged text straight into the feed of the
    person it was aimed at.
    """
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "rude thing @testcharacter"},
        headers=auth_headers2,
    )
    comment_id = create.json()["id"]
    # comment_flag_review_threshold is 1, so one flag from an eligible flagger
    # (flag_level_required=4) moves it out of `visible`.
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


# ── The body cap (#1205) ──────────────────────────────────────────────────────
#
# 500 is the number every design sheet shows. The cap was 2000 here and absent
# from the composer entirely. These pin the trust boundary (ADR-0006): the client
# `maxLength` is a courtesy, this is the enforcement.


@pytest.mark.asyncio
async def test_body_cap_is_500(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
):
    """The cap admits exactly 500 and rejects 501 at the API edge."""
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
    """A body written before the cap dropped stays readable at its full length.

    Nothing capped a comment below 2000 until #1205, so production can hold
    bodies longer than 500. Lowering the cap must not make them unreadable:
    `body_text` is Text (no column width) and `CommentOut.body_text` is an
    uncapped `str`, so the cap governs WRITES only. Seeded past the API on
    purpose — the point is a row the current cap would refuse.
    """
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
    """The ``can_comment`` flag and the enforcement behind it must agree.

    ``compute_capabilities`` short-circuits every flag to True for an admin, and
    the composer is shown on exactly that flag — but ``services.comment.
    can_comment`` used to restate the rule as a bare level check with no admin
    branch. An admin below ``comment_level_required`` was therefore given a
    comment box and a 403 from every submit. That is not hypothetical: it is why
    a production database held zero comments while an admin kept trying to leave
    one.

    ``character`` is level 0 here, well under the gate, which is the whole point
    — the admin short-circuit is the only thing that can make this pass.
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
