"""Web push (#3678): the shared ``notify()`` fan-out and the sender.

Payloads carry keys and values, never English (ADR-0031): the service worker builds
the text from its strings file. Never put ``account_id``, email, photos or star values
in one. Pushes queue on the session and leave only after the commit that made the
event real.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import partial
from typing import Awaitable, Callable, Optional

from pywebpush import WebPushException, webpush
from sqlalchemy import delete, event, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from config import settings
from db import AsyncSessionLocal
from models.account import Account
from models.character import Character
from models.praxis import Praxis, PraxisInvite, PraxisMember
from models.push_subscription import PushSubscription
from models.task import Task
from models.vote import Vote
from services.activity_feed import (
    FEED_ITEM_TYPE_COLLAB_INVITE,
    FEED_ITEM_TYPE_COMMENT_MENTION,
    FEED_ITEM_TYPE_COMMENT_ON_MINE,
    FEED_ITEM_TYPE_DUEL_CHALLENGE,
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_ITEM_TYPE_INVITATION_LETTER,
    FEED_ITEM_TYPE_RULES_CHANGE,
    FEED_ITEM_TYPE_VOTE_ON_MINE,
)
from services.block_service import blocked_counterpart_ids
from services.notification_prefs import LEVEL_UP, resolve_prefs

logger = logging.getLogger(__name__)

#: Push-service statuses meaning the device is gone for good.
GONE_STATUSES = frozenset({404, 410})
#: How long a push service holds a push for an offline device.
PUSH_TTL_SECONDS = 86400
#: Ratings on one praxis inside this window collapse into one "N new ratings".
RATING_COLLAPSE_WINDOW = timedelta(hours=24)

_OUTBOX = "push_outbox"
_in_flight: set[asyncio.Task] = set()


def push_available() -> bool:
    return bool(
        settings.VAPID_PUBLIC_KEY
        and settings.VAPID_PRIVATE_KEY
        and settings.VAPID_CONTACT
    )


@dataclass(frozen=True)
class Target:
    id: int
    endpoint: str
    p256dh: str
    auth: str


def _send_one(target: Target, body: str) -> None:
    webpush(
        subscription_info={
            "endpoint": target.endpoint,
            "keys": {"p256dh": target.p256dh, "auth": target.auth},
        },
        data=body,
        vapid_private_key=settings.VAPID_PRIVATE_KEY,
        # A fresh dict each call: pywebpush writes the audience into it.
        vapid_claims={"sub": settings.VAPID_CONTACT},
        ttl=PUSH_TTL_SECONDS,
    )


async def deliver(
    batch: list[tuple[dict, list[Target]]],
    session_factory: Callable[[], AsyncSession] = AsyncSessionLocal,
) -> None:
    """Send each payload to each device; drop devices the push service reports gone."""
    gone: list[int] = []
    for payload, targets in batch:
        body = json.dumps(payload)
        for target in targets:
            try:
                await asyncio.to_thread(_send_one, target, body)
            except WebPushException as error:
                status = getattr(error.response, "status_code", None)
                if status in GONE_STATUSES:
                    gone.append(target.id)
                else:
                    logger.warning(
                        "push to subscription %s failed: %s", target.id, error
                    )
            except Exception:
                logger.exception("push to subscription %s crashed", target.id)
    if gone:
        async with session_factory() as session:
            await session.execute(
                delete(PushSubscription).where(PushSubscription.id.in_(gone))
            )
            await session.commit()


@event.listens_for(Session, "after_commit")
def _send_queued(session: Session) -> None:
    batch = session.info.pop(_OUTBOX, None)
    if batch:
        task = asyncio.get_running_loop().create_task(deliver(batch))
        _in_flight.add(task)
        task.add_done_callback(_in_flight.discard)


@event.listens_for(Session, "after_rollback")
def _drop_queued(session: Session) -> None:
    session.info.pop(_OUTBOX, None)


async def notify(
    session: AsyncSession,
    *,
    kind: str,
    recipient_id: int,
    tag: str,
    url: str,
    actor: Optional[Character] = None,
    task_title: Optional[str] = None,
    count: Optional[int] = None,
) -> None:
    """Queue a push for a character's account if it is on, wanted and has a device."""
    if not push_available():
        return
    recipient = await session.get(Character, recipient_id)
    if recipient is None:
        return
    if actor is not None and actor.id in set(
        (await session.scalars(blocked_counterpart_ids(recipient_id))).all()
    ):
        return
    account = await session.get(Account, recipient.account_id)
    if account is None or not resolve_prefs(account.notification_prefs)[kind].by_push:
        return
    subscriptions = (
        await session.scalars(
            select(PushSubscription).where(
                PushSubscription.account_id == recipient.account_id
            )
        )
    ).all()
    if not subscriptions:
        return
    payload = {
        "kind": kind,
        "tag": tag,
        "url": url,
        "character": recipient.display_name,
        "actor": actor.display_name if actor else None,
        "task": task_title,
        "count": count,
    }
    targets = [Target(s.id, s.endpoint, s.p256dh, s.auth) for s in subscriptions]
    session.sync_session.info.setdefault(_OUTBOX, []).append((payload, targets))


async def _task_title(session: AsyncSession, task_id: int) -> Optional[str]:
    task = await session.get(Task, task_id)
    return task.title if task else None


async def _praxis_owner_ids(session: AsyncSession, praxis: Praxis) -> set[int]:
    members = await session.scalars(
        select(PraxisMember.character_id).where(PraxisMember.praxis_id == praxis.id)
    )
    return {praxis.created_by_id, *members.all()}


async def notify_vote(session: AsyncSession, praxis: Praxis, voter: Character) -> None:
    since = datetime.now(timezone.utc) - RATING_COLLAPSE_WINDOW
    recent = await session.scalar(
        select(func.count())
        .select_from(Vote)
        .where(Vote.praxis_id == praxis.id, Vote.updated_at >= since)
    )
    title = await _task_title(session, praxis.task_id)
    for recipient_id in await _praxis_owner_ids(session, praxis):
        await notify(
            session,
            kind=FEED_ITEM_TYPE_VOTE_ON_MINE,
            recipient_id=recipient_id,
            tag=f"{FEED_ITEM_TYPE_VOTE_ON_MINE}:{praxis.id}",
            url=f"/praxis/{praxis.id}",
            actor=voter,
            task_title=title,
            count=recent if recent and recent > 1 else None,
        )


async def notify_comment(
    session: AsyncSession,
    author: Character,
    *,
    praxis_id: Optional[int],
    task_id: Optional[int],
    mentioned: list[Character],
) -> None:
    """Mentions get the mention row; a praxis's own people get comment-on-mine, once."""
    praxis = await session.get(Praxis, praxis_id) if praxis_id else None
    title = await _task_title(session, praxis.task_id if praxis else task_id)
    url = f"/praxis/{praxis_id}" if praxis_id else f"/tasks/{task_id}"
    target = praxis_id or task_id
    recipients = {c.id: FEED_ITEM_TYPE_COMMENT_MENTION for c in mentioned}
    if praxis is not None:
        for owner_id in await _praxis_owner_ids(session, praxis) - {author.id}:
            recipients.setdefault(owner_id, FEED_ITEM_TYPE_COMMENT_ON_MINE)
    for recipient_id, kind in recipients.items():
        await notify(
            session,
            kind=kind,
            recipient_id=recipient_id,
            tag=f"{kind}:{target}",
            url=url,
            actor=author,
            task_title=title,
        )


async def notify_collab_invite(
    session: AsyncSession, invite: PraxisInvite, inviter: Character
) -> None:
    praxis = await session.get(Praxis, invite.praxis_id)
    await notify(
        session,
        kind=FEED_ITEM_TYPE_COLLAB_INVITE,
        recipient_id=invite.invitee_id,
        tag=f"{FEED_ITEM_TYPE_COLLAB_INVITE}:{invite.praxis_id}",
        url="/updates",
        actor=inviter,
        task_title=await _task_title(session, praxis.task_id) if praxis else None,
    )


async def notify_duel_challenge(
    session: AsyncSession, duel_id: int, challenger_praxis: Praxis, opponent_id: int
) -> None:
    challenger = await session.get(Character, challenger_praxis.created_by_id)
    await notify(
        session,
        kind=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        recipient_id=opponent_id,
        tag=f"{FEED_ITEM_TYPE_DUEL_CHALLENGE}:{duel_id}",
        url=f"/duel/{duel_id}",
        actor=challenger,
        task_title=await _task_title(session, challenger_praxis.task_id),
    )


async def notify_invitation_letter(session: AsyncSession, character: Character) -> None:
    await notify(
        session,
        kind=FEED_ITEM_TYPE_INVITATION_LETTER,
        recipient_id=character.id,
        tag=f"{FEED_ITEM_TYPE_INVITATION_LETTER}:{character.id}",
        url="/updates",
    )


async def notify_level_up(session: AsyncSession, character: Character) -> None:
    await notify(
        session,
        kind=LEVEL_UP,
        recipient_id=character.id,
        tag=f"{LEVEL_UP}:{character.id}",
        url=f"/characters/{character.id}",
    )


async def notify_broadcast(
    session: AsyncSession, *, kind: str, tag: str, url: str
) -> None:
    """For the ambient rows (era announcement, rules change, global task): every
    character with a device. ponytail: no call site yet; those rows default off."""
    owners = await session.scalars(
        select(func.min(Character.id))
        .where(Character.account_id.in_(select(PushSubscription.account_id)))
        .group_by(Character.account_id)
    )
    for recipient_id in owners.all():
        await notify(session, kind=kind, recipient_id=recipient_id, tag=tag, url=url)


#: Every preference row's sender; a test pins this to ``NOTIFICATION_EVENTS``.
SENDERS: dict[str, Callable[..., Awaitable[None]]] = {
    FEED_ITEM_TYPE_VOTE_ON_MINE: notify_vote,
    FEED_ITEM_TYPE_COMMENT_ON_MINE: notify_comment,
    FEED_ITEM_TYPE_COMMENT_MENTION: notify_comment,
    FEED_ITEM_TYPE_COLLAB_INVITE: notify_collab_invite,
    FEED_ITEM_TYPE_DUEL_CHALLENGE: notify_duel_challenge,
    FEED_ITEM_TYPE_INVITATION_LETTER: notify_invitation_letter,
    LEVEL_UP: notify_level_up,
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT: partial(
        notify_broadcast, kind=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT
    ),
    FEED_ITEM_TYPE_RULES_CHANGE: partial(
        notify_broadcast, kind=FEED_ITEM_TYPE_RULES_CHANGE
    ),
    FEED_ITEM_TYPE_GLOBAL_TASK: partial(
        notify_broadcast, kind=FEED_ITEM_TYPE_GLOBAL_TASK
    ),
}
