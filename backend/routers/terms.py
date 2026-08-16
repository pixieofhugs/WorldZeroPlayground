"""The consent log's one endpoint (#1861, ``docs/spec/SPEC-onboarding.md`` § Terms).

Its own router rather than a line in ``routers/me.py``: that one is the
account's *roster* — "my lives" — and consent is an account-level fact with no
character in it at all (ADR-0041 keeps that boundary).

There is no service module behind this. The route's whole job is an insert of a
server-side constant against the authenticated account; there is no rule to
apply, nothing era-shaped to read, and no second caller. ``routers/contact.py``
is the same shape for the same reason.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.account import Account
from models.terms_acceptance import CURRENT_TERMS_VERSION, TermsAcceptance
from schemas.terms import TermsAcceptanceOut
from services.auth import get_current_account

router = APIRouter()


@router.post("/acceptance", response_model=TermsAcceptanceOut, status_code=201)
async def accept_terms(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_db),
) -> TermsAcceptanceOut:
    """Record that the signed-in account agreed to the current terms.

    Appends to a log. Accepting twice writes two rows and both are the truth —
    agreement is shown again on a later visit, so a second acceptance is a
    second event, not a duplicate to be collapsed.

    Takes no request body on purpose: the accepted version is the server's
    constant, so a caller cannot claim to have agreed to wording it was never
    shown. The version it *was* shown comes back in the response.

    Requires a session. Agreement is bound to an account, which is why it is
    asked for after sign-in rather than before it.
    """
    row = TermsAcceptance(account_id=account.id, version=CURRENT_TERMS_VERSION)
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return TermsAcceptanceOut(version=row.version, accepted_at=row.created_at)
