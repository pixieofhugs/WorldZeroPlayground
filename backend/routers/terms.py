"""The consent log's endpoint (#1861, SPEC-onboarding.md § Terms). No service:
it inserts one server constant."""

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
    session: AsyncSession = Depends(get_db, scope="function"),
) -> TermsAcceptanceOut:
    """Record that the signed-in account agreed to the current terms.

    Append-only: each acceptance is its own event. No body: the version is the
    server's constant, so a caller can't claim wording it wasn't shown.
    """
    row = TermsAcceptance(account_id=account.id, version=CURRENT_TERMS_VERSION)
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return TermsAcceptanceOut(version=row.version, accepted_at=row.created_at)
