"""Copy overrides: public read (they are page text), admin write. No prefix."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import require_admin
from errors import ErrorCode, raise_coded
from models.account import Account
from schemas.copy import CopyOverrideIn, CopyOverrideOut
from services.copy_override import delete_override, list_overrides, upsert_override

router = APIRouter()


@router.get("/copy-overrides", response_model=list[CopyOverrideOut])
async def get_copy_overrides(session: AsyncSession = Depends(get_db, scope="function")):
    """Every live copy override, for the frontend to layer over its catalogs."""
    return await list_overrides(session)


@router.put("/copy-overrides", response_model=CopyOverrideOut)
async def put_copy_override(
    data: CopyOverrideIn,
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Set the copy for one namespace + key; idempotent.

    Keys aren't checked (catalogs live in the bundle); an unknown key is inert.
    """
    return await upsert_override(data.ns, data.key, data.value, admin.id, session)


@router.delete("/copy-overrides", status_code=204)
async def remove_copy_override(
    ns: str = Query(..., max_length=64),
    key: str = Query(..., max_length=255),
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db, scope="function"),
):
    """Revert one key to the wording that shipped in the bundle."""
    if not await delete_override(ns, key, session):
        raise_coded(
            404, ErrorCode.copy_override_not_found, "No override for that key."
        )
