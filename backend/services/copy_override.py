"""Read, write and revert admin copy overrides.

No era in any signature: what the site *says* is not a game rule, so there is
nothing on ``EraConfig`` to read. No key validation either — the catalogs these
keys point into ship in the frontend bundle, so the backend has no registry to
check against and deliberately does not grow one.
"""

from typing import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.copy_override import CopyOverride


async def list_overrides(session: AsyncSession) -> Sequence[CopyOverride]:
    """Every override, ordered so the public response is stable between reads."""
    result = await session.execute(
        select(CopyOverride).order_by(CopyOverride.ns, CopyOverride.key)
    )
    return result.scalars().all()


async def upsert_override(
    ns: str,
    key: str,
    value: str,
    account_id: int,
    session: AsyncSession,
) -> CopyOverride:
    """Write the override for ``ns``/``key``, replacing any current one.

    One statement rather than select-then-branch: two admins saving the same
    key at once would otherwise race to an integrity error on the composite PK.

    ``updated_at`` is set explicitly because the model's ``onupdate`` is a Core
    UPDATE hook and does not reach the ``ON CONFLICT`` arm.
    """
    statement = (
        pg_insert(CopyOverride)
        .values(ns=ns, key=key, value=value, updated_by=account_id)
        .on_conflict_do_update(
            index_elements=["ns", "key"],
            set_={"value": value, "updated_by": account_id, "updated_at": func.now()},
        )
        .returning(CopyOverride)
    )
    row = (
        await session.execute(statement, execution_options={"populate_existing": True})
    ).scalar_one()
    await session.flush()
    return row


async def delete_override(ns: str, key: str, session: AsyncSession) -> bool:
    """Revert ``ns``/``key`` to the shipped catalog. False if there was no row."""
    result = await session.execute(
        delete(CopyOverride).where(CopyOverride.ns == ns, CopyOverride.key == key)
    )
    await session.flush()
    return bool(result.rowcount)
