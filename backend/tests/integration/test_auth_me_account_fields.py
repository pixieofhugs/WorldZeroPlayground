"""The per-ACCOUNT fields the Settings Account card reads (#2155): ``email`` and
``provider`` on ``GET /auth/me``, and ``email`` nowhere else it isn't argued for.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account, AuthProvider, OAuthProvider


@pytest.mark.asyncio
async def test_auth_me_carries_the_identity_provider(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
) -> None:
    db_session.add(
        OAuthProvider(
            account_id=account.id,
            provider=AuthProvider.GOOGLE,
            provider_user_id="sub-2155",
        )
    )
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["provider"] == "google"


@pytest.mark.asyncio
async def test_auth_me_answers_empty_provider_when_no_oauth_row_exists(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
) -> None:
    """A seeded/demo account has no identity row: "", never ``null`` or a 500."""
    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["provider"] == ""


# A RATCHET: each schema allowed to carry `email`, with why it is not a leak.
# Adding one must be argued for in review.
EMAIL_CARRIERS = {
    #2155: authenticated, the CALLER'S OWN address (like `account_id`).
    "CurrentUser",
    # Admin-guarded.
    "AccountSummary",
    "AccountDetail",
    # A REQUEST body: the sender's own address.
    "ContactMessageIn",
    # Admin-only read-back of what a sender typed.
    "routers__admin__ContactMessageOut",
}


@pytest.mark.asyncio
async def test_email_reaches_no_new_response_model(client: AsyncClient) -> None:
    """Read off live OpenAPI, so inheritance or a reused model is caught too."""
    schemas = (await client.get("/openapi.json")).json()["components"]["schemas"]

    carriers = {
        name
        for name, schema in schemas.items()
        if "email" in (schema.get("properties") or {})
    }

    assert carriers == EMAIL_CARRIERS, carriers - EMAIL_CARRIERS
