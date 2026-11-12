"""The habit bonus (#1617): a faction's flat ``habit_bonus_points`` on any
praxis sealed within ``era.habit_window_days`` of the member's previous scoring
praxis (submitted, not unscored-moderated).

**Stamped at seal time, never derived on read**: ``compute_contributions``
callers pass different praxis sets (full history vs. one page), so a derived
bonus would differ by surface (#881). Stamped per ``PraxisMember``, since each
collab member is measured against their own history.
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.praxis import (
    UNSCORED_MODERATION_STATUSES,
    Praxis,
    PraxisMember,
    PraxisStatus,
)


def faction_habit_bonus_points(
    faction_slug: Optional[str],
    era: EraConfig = CURRENT_ERA,
) -> int:
    """The flat bonus this faction grants, ignoring whether it was earned; 0 for unknown
    slugs."""
    if faction_slug is None:
        return 0
    faction_config = era.factions.get(faction_slug)
    if faction_config is None:
        return 0
    return faction_config.habit_bonus_points


async def stamp_habit_bonus(
    praxis: Praxis,
    sealed_at: datetime,
    session: AsyncSession,
    era: EraConfig,
) -> None:
    """Write each member's habit bonus for this seal onto their member row.

    ``sealed_at`` is the same ``now`` as ``praxis.submitted_at``. Writes 0 too,
    so a resubmit clears a stale stamp.
    """
    member_character_ids = [member.character_id for member in praxis.members]
    if not member_character_ids:
        return

    faction_result = await session.execute(
        select(Character.id, Character.faction_slug).where(
            Character.id.in_(member_character_ids)
        )
    )
    faction_by_character: dict[int, Optional[str]] = dict(faction_result.all())

    # `Praxis.id != praxis.id` is load-bearing: this praxis is already submitted
    # and autoflushed, so it would be its own predecessor.
    window_start = sealed_at - timedelta(days=era.habit_window_days)
    predecessor_result = await session.execute(
        select(PraxisMember.character_id)
        .join(Praxis, Praxis.id == PraxisMember.praxis_id)
        .where(
            PraxisMember.character_id.in_(member_character_ids),
            Praxis.id != praxis.id,
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(UNSCORED_MODERATION_STATUSES)),
            Praxis.submitted_at >= window_start,
            Praxis.submitted_at <= sealed_at,
        )
        .distinct()
    )
    in_the_habit = {character_id for (character_id,) in predecessor_result.all()}

    for member in praxis.members:
        if member.character_id not in in_the_habit:
            member.habit_bonus_points = 0
            continue
        member.habit_bonus_points = faction_habit_bonus_points(
            faction_by_character.get(member.character_id), era
        )
