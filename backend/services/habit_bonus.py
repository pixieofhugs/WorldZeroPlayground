"""The habit bonus (#1617) — one home for the whole ability.

A faction may grant its members ``habit_bonus_points``: a flat bonus on any
praxis they seal within ``era.habit_window_days`` of another praxis of their own.
Era 1 gives this to UA (5 points); every other faction sits at the 0 baseline.
The intent, in the owner's words, is *"to task habitually, even if the tasks
themselves are less impressive"* — so it is per praxis and it accumulates: seal
weekly for ten weeks and nine of those ten carry it. The first one never does,
because there is no habit yet.

Nothing here branches on a faction slug — the value is a ``FactionConfig`` field
read off ``era``, and the window is an ``EraConfig`` field.

**Stamped at seal time, never derived on read.** The obvious implementation is to
work the bonus out from the praxis list a scorer already holds, and it is wrong.
``services.praxis_scoring.compute_contributions`` has two callers with *different*
sets: ``services.character_stats`` passes a character's entire history, while
``services.praxis_out`` groups only the praxes on the current page. A derived
bonus would therefore find no predecessor on a feed and a predecessor in a stats
recompute — the same praxis scoring differently depending on which surface asked,
which is exactly the card-vs-detail divergence #881 exists to eliminate. A stamped
column cannot disagree with itself.

**Per member, not per praxis.** The stamp lands on ``PraxisMember`` because a
collab seals once for the group but each member is measured against their *own*
history. Solo and duel praxes have exactly one member — their author.

The predecessor must be a praxis that actually *scores*: submitted, and not in
``UNSCORED_MODERATION_STATUSES`` (hidden, or an admin ruling of ``failed`` since
#1373). A hidden or failed praxis must not prop up a streak.
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
    """The flat bonus this faction grants, ignoring whether it was earned.

    Returns 0 for unaffiliated/absent slugs and for any slug the era does not
    define (a character carrying a slug from a previous era gets no ability
    rather than an error) — the same shape as
    :func:`services.level_jump.faction_level_jump_reach`.
    """
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

    Called from ``services.collab_consensus._apply_seal`` with the same ``now``
    it writes to ``praxis.submitted_at``, so the window is measured from the
    moment the praxis actually sealed rather than from a second clock read.

    Assigns 0 as readily as it assigns the bonus: an unsubmit-then-resubmit runs
    the seal again, and a member who has since fallen out of the habit must lose
    the points, not keep a stale stamp.
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

    # Which members already had a scoring praxis of their own inside the window?
    # `Praxis.id != praxis.id` is load-bearing: the caller has already set this
    # praxis to `submitted` with `submitted_at = sealed_at`, and SQLAlchemy
    # autoflushes before this SELECT — so without it every praxis would be its
    # own predecessor. Membership (not authorship) is the right join: every
    # praxis carries its author as a member, including solo and duel.
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
