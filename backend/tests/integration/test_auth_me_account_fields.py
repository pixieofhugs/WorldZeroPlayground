"""The two per-ACCOUNT fields the Settings Account card reads (#2155).

SEAM: the wire. These are contract facts, not composition details — the card
prints ``email`` verbatim and maps ``provider`` to a brand name, so what matters
is that ``GET /auth/me`` carries both and that neither leaks anywhere else.

The last test is the one worth having. ``email`` on a response model is the rule
this repo otherwise enforces absolutely ("never expose ``account_id`` or
``email`` publicly"); it rides ``/auth/me``'s documented exception, and that
exception is only safe while it stays a single site.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account, AuthProvider, OAuthProvider


@pytest.mark.asyncio
async def test_auth_me_carries_the_signed_in_email(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
) -> None:
    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == account.email


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
    """A seeded/demo account holds no identity row.

    "" is the card's absent case — it must not be ``null`` and it must not 500.
    """
    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["provider"] == ""


# Every schema that was allowed to carry `email` before #2155, with the reason
# each is not the leak the rule is about. A RATCHET: adding a name here is a
# deliberate act that has to be argued for in review, which is the whole point.
EMAIL_CARRIERS = {
    # #2155. Authenticated, and answers with the CALLER'S OWN address only —
    # the same documented exception `account_id` already rides.
    "CurrentUser",
    # `/admin/accounts` and `/admin/accounts/{id}`, both behind the admin guard.
    "AccountSummary",
    "AccountDetail",
    # A REQUEST body: the address is typed by the sender, about themselves.
    "ContactMessageIn",
    # `/admin/contact-messages` — reading back what a sender typed, admin-only.
    "routers__admin__ContactMessageOut",
}


@pytest.mark.asyncio
async def test_email_reaches_no_new_response_model(client: AsyncClient) -> None:
    """`email` on the wire stays confined to the sites that argued for it.

    Read off the live OpenAPI rather than by grep, so a field arriving through
    inheritance — or through a model quietly reused as a response — is caught
    too. That is the failure mode this guards: not somebody typing `email:` into
    a player-facing schema, but somebody making `CurrentUser` a base class.
    """
    schemas = (await client.get("/openapi.json")).json()["components"]["schemas"]

    carriers = {
        name
        for name, schema in schemas.items()
        if "email" in (schema.get("properties") or {})
    }

    assert carriers == EMAIL_CARRIERS, carriers - EMAIL_CARRIERS
