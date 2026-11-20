"""Web push (#3678): routes, the prefs flags, ``notify()`` and the sender.

Seam: ``services.push.notify`` queues on the session; ``deliver`` is the only thing
that talks to ``pywebpush`` (``_send_one`` is patched, no network).
"""

import json

import pytest
from httpx import AsyncClient
from pywebpush import WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from config import settings
from models.account import Account
from models.character import Character
from models.push_subscription import PushSubscription
from services import push
from services.notification_prefs import apply_update
from tests.integration.factories import make_solo_praxis, make_task

SUBSCRIPTION = {
    "endpoint": "https://push.example/abc",
    "keys": {"p256dh": "k", "auth": "a"},
}


@pytest.fixture
def keys_on(monkeypatch):
    monkeypatch.setattr(settings, "VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setattr(settings, "VAPID_PRIVATE_KEY", "priv")
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
    assert (body["push_available"], body["vapid_public_key"]) == (True, "pub")


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
            endpoint="https://push.example/abc",
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
