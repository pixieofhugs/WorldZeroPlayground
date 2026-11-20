from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.account import Account
from models.push_subscription import PushSubscription
from schemas.push import PushSubscriptionIn, PushUnsubscribeIn
from services.auth import get_current_account

router = APIRouter()


@router.post("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    body: PushSubscriptionIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Response:
    """Idempotent on endpoint. A device belongs to whoever subscribed last: a browser
    holds one subscription per origin, so a shared phone must not keep pushing the
    previous account's events."""
    existing = await session.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )
    if existing is None:
        existing = PushSubscription(endpoint=body.endpoint)
        session.add(existing)
    existing.account_id = account.id
    existing.p256dh = body.keys.p256dh
    existing.auth = body.keys.auth
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    body: PushUnsubscribeIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Response:
    await session.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.account_id == account.id,
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
