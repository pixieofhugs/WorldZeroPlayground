"""The population dial (#3656): which side of each rule a mod has set.

Values live in the era file (``EraConfig.dials``); the DB holds only a side per
key. A missing row means the dial's declared default, so launch needs no seed.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, Dial, EraConfig
from models.character import Character
from models.population_dial import PopulationDial
from services.character_stats import deliver_invitations_to_all
from services.era import apply_dial_sides, get_current_era_row
from services.mod_log import log_mod_action


@dataclass(frozen=True)
class DialState:
    dial_key: str
    side: str
    small: Mapping[str, object]
    full: Mapping[str, object]
    is_default: bool
    updated_by: Optional[str]
    updated_at: Optional[datetime]


async def _rows(session: AsyncSession) -> dict[str, PopulationDial]:
    result = await session.execute(select(PopulationDial))
    return {row.dial_key: row for row in result.scalars()}


async def list_dials(
    session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> list[DialState]:
    rows = await _rows(session)
    names: dict[int, str] = {}
    if rows:
        # A display name: an account id or email is never public.
        names = dict(
            (
                await session.execute(
                    select(Character.account_id, func.min(Character.display_name))
                    .where(
                        Character.account_id.in_(
                            {r.updated_by_id for r in rows.values()}
                        )
                    )
                    .group_by(Character.account_id)
                )
            ).all()
        )
    out = []
    for key, dial in era.dials.items():
        row = rows.get(key)
        out.append(
            DialState(
                dial_key=key,
                side=row.side if row else dial.default,
                small=dial.small,
                full=dial.full,
                is_default=row is None or row.side == dial.default,
                updated_by=names.get(row.updated_by_id) if row else None,
                updated_at=row.updated_at if row else None,
            )
        )
    return out


async def rules_revision(session: AsyncSession) -> int:
    """Microseconds of the latest flip (0 before any): the client cache stamp."""
    latest = (
        await session.execute(select(func.max(PopulationDial.updated_at)))
    ).scalar()
    return 0 if latest is None else int(latest.timestamp() * 1_000_000)


async def set_dials(
    sides: Mapping[str, str],
    admin_account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> list[str]:
    """Flip dials; returns the keys whose side actually changed.

    ``updated_at`` is the wall clock, not the transaction start: it is the
    cache stamp, so two flips must never share one.

    Commit first, then overlay (the order of ``commit_and_bind_live_era``).
    """
    unknown = sorted(set(sides) - set(era.dials))
    if unknown:
        raise_coded(
            422,
            ErrorCode.population_dial_unknown,
            f"No such dial: {', '.join(unknown)}.",
        )
    rows = await _rows(session)
    era_row = await get_current_era_row(session)
    changed = []
    for key, side in sides.items():
        dial: Dial = era.dials[key]
        row = rows.get(key)
        if (row.side if row else dial.default) == side:
            continue
        if row is None:
            session.add(
                PopulationDial(
                    dial_key=key,
                    side=side,
                    updated_by_id=admin_account_id,
                    updated_at=func.clock_timestamp(),
                )
            )
        else:
            row.side = side
            row.updated_by_id = admin_account_id
            row.updated_at = func.clock_timestamp()
        changed.append(key)
        await log_mod_action(
            session,
            admin_account_id,
            "small_world_on" if side == "small" else "small_world_off",
            "era",
            era_row.id,
            key,
        )
    # Known before the commit, so nothing awaits between it and the writes.
    new_sides = {k: r.side for k, r in rows.items()} | {k: sides[k] for k in changed}
    await session.commit()
    apply_dial_sides(era, new_sides)
    # Small is the loose side; tightening owes nothing, letters are kept.
    if sides.get("invitation") == "small" and "invitation" in changed:
        await deliver_invitations_to_all(session, era)
        await session.commit()
    return changed
