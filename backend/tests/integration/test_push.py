"""Web push (#3678): routes, the prefs flags, ``notify()`` and the sender.

Seam: ``services.push.notify`` queues on the session; ``deliver`` is the only thing
that talks to ``pywebpush`` (``_send_one`` is patched, no network).
"""

import asyncio
import base64
import json
import logging

import pytest
from cryptography.hazmat.primitives import serialization
from httpx import AsyncClient
from py_vapid import Vapid
from pywebpush import WebPushException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from config import settings
from models.account import Account
from models.character import Character
from models.comment import Comment, CommentMention
from models.praxis import ModerationStatus
from models.push_subscription import PushSubscription
from services import push
from services.notification_prefs import apply_update
from tests.integration.factories import make_solo_praxis, make_task

SUBSCRIPTION = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/abc",
    "keys": {"p256dh": "k", "auth": "a"},
}


def _vapid_pair() -> tuple[str, str]:
    vapid = Vapid()
    vapid.generate_keys()
    b64 = lambda raw: base64.urlsafe_b64encode(raw).rstrip(b"=").decode()  # noqa: E731
    pub = vapid.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    priv = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
    return b64(pub), b64(priv)


PUBLIC, PRIVATE = _vapid_pair()


@pytest.fixture
def keys_on(monkeypatch):
    monkeypatch.setattr(settings, "VAPID_PUBLIC_KEY", PUBLIC)
    monkeypatch.setattr(settings, "VAPID_PRIVATE_KEY", PRIVATE)
    monkeypatch.setattr(settings, "VAPID_CONTACT", "mailto:hi@worldzero.org")


@pytest.mark.asyncio
async def test_prefs_say_push_is_unavailable_without_keys(
    client: AsyncClient, auth_headers: dict
):
    body = (await client.get("/me/notification-prefs", headers=auth_headers)).json()
    assert body["push_available"] is False
    assert body["vapid_public_key"] is None


@pytest.mark.asyncio
async def test_prefs_hand_over_the_public_key_when_configured(
    client: AsyncClient, auth_headers: dict, keys_on
):
    body = (await client.get("/me/notification-prefs", headers=auth_headers)).json()
    assert (body["push_available"], body["vapid_public_key"]) == (True, PUBLIC)


@pytest.mark.asyncio
async def test_subscribe_is_idempotent_and_unsubscribe_removes(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    for _ in range(2):
        resp = await client.post(
            "/push/subscriptions", json=SUBSCRIPTION, headers=auth_headers
        )
        assert resp.status_code == 204
    assert len((await db_session.scalars(select(PushSubscription))).all()) == 1

    resp = await client.request(
        "DELETE",
        "/push/subscriptions",
        json={"endpoint": SUBSCRIPTION["endpoint"]},
        headers=auth_headers,
    )
    assert resp.status_code == 204
    assert (await db_session.scalars(select(PushSubscription))).all() == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "endpoint",
    [
        "http://fcm.googleapis.com/fcm/send/abc",
        "http://169.254.169.254/",
        "https://localhost/",
        "https://push.example/abc",
        "https://evil.test\\@fcm.googleapis.com/",
        "https://127.0.0.1:8000\\@fcm.googleapis.com/",
        "https://fcm.googleapis.com@evil.test/",
        "https://fcm.googleapis.com:8443/x",
        "https://evilfcm.googleapis.com.attacker.test/",
    ],
)
async def test_subscribe_rejects_endpoints_off_the_allowlist(
    client: AsyncClient, auth_headers: dict, endpoint: str
):
    resp = await client.post(
        "/push/subscriptions",
        json={**SUBSCRIPTION, "endpoint": endpoint},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_another_account_cannot_unsubscribe_my_device(
    client: AsyncClient,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    await client.post("/push/subscriptions", json=SUBSCRIPTION, headers=auth_headers)
    await client.request(
        "DELETE",
        "/push/subscriptions",
        json={"endpoint": SUBSCRIPTION["endpoint"]},
        headers=auth_headers2,
    )
    assert len((await db_session.scalars(select(PushSubscription))).all()) == 1


@pytest.mark.asyncio
async def test_subscribe_needs_auth(client: AsyncClient):
    assert (
        await client.post("/push/subscriptions", json=SUBSCRIPTION)
    ).status_code in (401, 403)


async def _subscribe(db_session: AsyncSession, account: Account) -> None:
    db_session.add(
        PushSubscription(
            account_id=account.id,
            endpoint="https://fcm.googleapis.com/fcm/send/abc",
            p256dh="k",
            auth="a",
        )
    )
    await db_session.flush()


def _queued(db_session: AsyncSession) -> list:
    return db_session.sync_session.info.get(push._OUTBOX, [])


@pytest.mark.asyncio
async def test_a_rating_queues_a_keys_only_payload(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    keys_on,
):
    await _subscribe(db_session, account)
    account.notification_prefs = {"vote_on_mine": {"by_push": True}}
    task = await make_task(db_session, character, title="Feed a stranger")
    praxis = await make_solo_praxis(db_session, task, character)

    await push.notify_vote(db_session, praxis, character2)

    ((payload, targets),) = _queued(db_session)
    assert payload == {
        "kind": "vote_on_mine",
        "tag": f"vote_on_mine:{praxis.id}",
        "url": f"/praxis/{praxis.id}",
        "character": "Test Character",
        "actor": "Other Character",
        "task": "Feed a stranger",
        "count": None,
    }
    assert len(targets) == 1
    assert "@" not in json.dumps(payload)


@pytest.mark.asyncio
async def test_a_switched_off_row_queues_nothing(
    db_session: AsyncSession, account: Account, character: Character, keys_on
):
    await _subscribe(db_session, account)
    await push.notify_level_up(db_session, character)
    assert _queued(db_session) == []  # level_up defaults off

    account.notification_prefs = apply_update(
        {}, {"level_up": {"on_updates": False, "by_email": False, "by_push": True}}
    )
    await push.notify_level_up(db_session, character)
    assert len(_queued(db_session)) == 1


@pytest.mark.asyncio
async def test_no_keys_queues_nothing(
    db_session: AsyncSession, account: Account, character: Character
):
    await _subscribe(db_session, account)
    account.notification_prefs = {"level_up": {"by_push": True}}
    await push.notify_level_up(db_session, character)
    assert _queued(db_session) == []


@pytest.mark.asyncio
async def test_a_gone_device_is_forgotten_and_a_failing_one_is_kept(
    db_session: AsyncSession, account: Account, monkeypatch
):
    await _subscribe(db_session, account)
    await db_session.commit()
    sub = (await db_session.scalars(select(PushSubscription))).one()
    status = {"code": 500}

    class Response:
        @property
        def status_code(self) -> int:
            return status["code"]

    def fail(target, body):
        raise WebPushException("nope", response=Response())

    monkeypatch.setattr(push, "_send_one", fail)
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    batch = [({"kind": "level_up"}, [push.Target(sub.id, sub.endpoint, "k", "a")])]

    await push.deliver(batch, factory)
    assert len((await db_session.scalars(select(PushSubscription))).all()) == 1

    status["code"] = 410
    await push.deliver(batch, factory)
    db_session.expire_all()
    assert (await db_session.scalars(select(PushSubscription))).all() == []


def test_sender_refuses_redirects(monkeypatch):
    seen = {}
    monkeypatch.setattr(push, "webpush", lambda **kw: seen.update(kw))
    push._send_one(push.Target(1, "https://fcm.googleapis.com/x", "k", "a"), "{}")
    assert seen["requests_session"].max_redirects == 0


async def _comment(db_session, author, *, praxis=None, task=None, mention=None):
    c = Comment(
        praxis_id=praxis.id if praxis else None,
        task_id=task.id if task else None,
        created_by_id=author.id,
        body_text="hi",
    )
    db_session.add(c)
    await db_session.flush()
    if mention:
        db_session.add(
            CommentMention(comment_id=c.id, mentioned_character_id=mention.id)
        )
        await db_session.flush()
    await push.notify_comment(
        db_session,
        author,
        praxis_id=c.praxis_id,
        task_id=c.task_id,
        mentioned=[mention] if mention else [],
    )
    return c


@pytest.fixture
async def comment_world(db_session, account, character, keys_on):
    await _subscribe(db_session, account)
    account.notification_prefs = {
        "comment_on_mine": {"by_push": True},
        "comment_mention": {"by_push": True},
    }
    task = await make_task(db_session, character, title="Feed a stranger")
    return task, await make_solo_praxis(db_session, task, character)


@pytest.mark.asyncio
async def test_comment_tags_name_the_target_type(
    db_session, character, character2, comment_world
):
    task, praxis = comment_world
    await db_session.execute(  # next praxis id == task.id, so a swapped tag fails
        text("select setval(pg_get_serial_sequence('praxis', 'id'), :n, false)"),
        {"n": task.id},
    )
    praxis = await make_solo_praxis(db_session, task, character)
    assert praxis.id == task.id
    await _comment(db_session, character2, praxis=praxis, mention=character)
    await _comment(db_session, character2, task=task, mention=character)
    tags = [p["tag"] for p, _ in _queued(db_session)]
    assert tags == [
        f"comment_mention:praxis:{praxis.id}",
        f"comment_mention:task:{task.id}",
    ]


@pytest.mark.asyncio
async def test_second_comment_on_mine_collapses_with_a_count(
    db_session, character, character2, character3, comment_world
):
    _, praxis = comment_world
    await _comment(db_session, character2, praxis=praxis)
    await _comment(db_session, character3, praxis=praxis)
    first, second = (p for p, _ in _queued(db_session))
    assert first["count"] is None and second["count"] == 2
    assert first["tag"] == second["tag"]


@pytest.mark.asyncio
async def test_second_mention_collapses_with_a_count(
    db_session, character, character2, character3, comment_world
):
    _, praxis = comment_world
    await _comment(db_session, character2, praxis=praxis, mention=character)
    await _comment(db_session, character3, praxis=praxis, mention=character)
    first, second = (p for p, _ in _queued(db_session))
    assert first["count"] is None and second["count"] == 2


@pytest.mark.asyncio
async def test_count_is_distinct_people_not_comments(
    db_session, character, character2, character3, comment_world
):
    _, praxis = comment_world
    for author in (character2, character2, character3):
        await _comment(db_session, author, praxis=praxis)
    assert [p["count"] for p, _ in _queued(db_session)] == [None, None, 2]


@pytest.mark.asyncio
async def test_withdrawn_and_removed_comments_are_not_counted(
    db_session, character, character2, character3, comment_world
):
    _, praxis = comment_world
    gone = await _comment(db_session, character2, praxis=praxis)
    gone.is_withdrawn = True
    removed = await _comment(db_session, character2, praxis=praxis)
    removed.moderation_status = ModerationStatus.deleted
    await db_session.flush()
    await _comment(db_session, character3, praxis=praxis)
    assert [p["count"] for p, _ in _queued(db_session)][-1] is None


@pytest.mark.parametrize(
    "field, value, words",
    [
        ("VAPID_CONTACT", "hello@worldzero.org", "mailto:"),
        ("VAPID_PRIVATE_KEY", "not-a-key", "does not parse"),
        ("VAPID_PUBLIC_KEY", _vapid_pair()[0], "public half"),
    ],
)
def test_a_malformed_vapid_config_turns_push_off_and_says_why(
    monkeypatch, caplog, keys_on, field, value, words
):
    monkeypatch.setattr(settings, field, value)
    with caplog.at_level(logging.ERROR, logger="services.push"):
        assert push.push_available() is False
    assert words in caplog.text


@pytest.mark.asyncio
async def test_a_push_service_rejection_is_logged_with_status_and_reason(
    monkeypatch, caplog
):
    class Response:
        status_code = 403
        text = "VapidPkHashMismatch"

    def reject(target, body):
        raise WebPushException("nope", response=Response())

    monkeypatch.setattr(push, "_send_one", reject)
    batch = [({"kind": "level_up"}, [push.Target(7, "https://x", "k", "a")])]
    with caplog.at_level(logging.ERROR, logger="services.push"):
        await push.deliver(batch)
    assert "status=403 reason=VapidPkHashMismatch" in caplog.text


@pytest.mark.asyncio
async def test_the_commit_sends_what_notify_queued(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    keys_on,
    monkeypatch,
):
    sent = []

    async def deliver(batch):
        sent.append(batch)

    monkeypatch.setattr(push, "deliver", deliver)
    await _subscribe(db_session, account)
    account.notification_prefs = {"level_up": {"by_push": True}}
    await push.notify_level_up(db_session, character)
    assert sent == []
    await db_session.commit()
    await asyncio.gather(*push._in_flight)
    assert len(sent) == 1
