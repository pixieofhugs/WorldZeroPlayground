"""The copy-override surface: read it anonymously, write it as an admin.

Paths are spelled in full here and the router is mounted without a prefix (see
``main.py``), the way ``routers/votes.py`` is — there is one resource and it is
not nested under anything.

The GET is **public on purpose**. Overrides are part of the page's text, so an
anonymous first-time visitor needs them exactly as much as a logged-in admin
does; gating them would ship the un-overridden wording to everyone who matters
most.
"""

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
async def get_copy_overrides(session: AsyncSession = Depends(get_db)):
    """Every live copy override, for the frontend to layer over its catalogs."""
    return await list_overrides(session)


@router.put("/copy-overrides", response_model=CopyOverrideOut)
async def put_copy_override(
    data: CopyOverrideIn,
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Set the copy for one namespace + key. Idempotent; a second PUT replaces.

    Whether the key exists in a catalog is not checked and cannot be: the
    catalogs are in the frontend bundle. An override for a key nobody renders is
    inert, which is the cheaper failure than a registry to keep in sync.
    """
    return await upsert_override(data.ns, data.key, data.value, admin.id, session)


@router.delete("/copy-overrides", status_code=204)
async def remove_copy_override(
    ns: str = Query(..., max_length=64),
    key: str = Query(..., max_length=255),
    admin: Account = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Revert one key to the wording that shipped in the bundle."""
    if not await delete_override(ns, key, session):
        raise_coded(
            404, ErrorCode.copy_override_not_found, "No override for that key."
        )
