from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.account import Account
from schemas.push import PushSubscriptionIn, PushUnsubscribeIn
from services.auth import get_current_account
from services.push import subscribe_device, unsubscribe_device

router = APIRouter()


@router.post("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    body: PushSubscriptionIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Response:
    await subscribe_device(
        session, account.id, body.endpoint, body.keys.p256dh, body.keys.auth
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    body: PushUnsubscribeIn,
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db, scope="function"),
) -> Response:
    await unsubscribe_device(session, account.id, body.endpoint)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
