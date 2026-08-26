"""#1578 — a banked score lands on the half-up side, end to end.

The unit tests in ``tests/unit/test_scoring.py`` pin the arithmetic. This file
pins the *money path*: a Coven character in a Coven collab, through
``recalculate_character_stats``, ends up with the score the table says.

Coven carries the only non-1.0, non-duel, non-integer modifier in Era 1
(``collab_own_modifier``), which is what exposed both defects. The modifier is
read from the era here — never restated — but the expected scores are literal,
so an era that changes it fails loudly instead of silently reintroducing a
rounding surprise.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats

COVEN_SLUG = "coven"

# (task point value, banked score). The four rows of #1578's table plus the
# whole-number neighbours that made the old behaviour look arbitrary: under
# banker's rounding only 35 landed on a true binary half, so 35 lost a point
# and 25/45/55 did not.
COVEN_COLLAB_SCORES = [
    (20, 22),
    (25, 28),
    (30, 33),
    (35, 39),
    (40, 44),
    (45, 50),
    (50, 55),
    (55, 61),
]


async def _seed_coven_collab(
    db_session: AsyncSession, era: Era, point_value: int
) -> Character:
    """A Coven character who has sealed one Coven collab worth ``point_value``."""
    existing = await db_session.execute(
        select(Faction).where(Faction.slug == COVEN_SLUG)
    )
    if existing.scalar_one_or_none() is None:
        db_session.add(Faction(slug=COVEN_SLUG, status=FactionStatus.visible))
        await db_session.flush()

    account = Account(email=f"coven_{point_value}@example.com")
    db_session.add(account)
    await db_session.flush()

    witch = Character(
        account_id=account.id,
        username=f"witch{point_value}",
        display_name=f"Witch {point_value}",
        faction_slug=COVEN_SLUG,
    )
    db_session.add(witch)
    await db_session.flush()

    db_session.add(
        CharacterStats(
            character_id=witch.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )

    task = Task(
        title=f"Coven task {point_value}",
        description="a real-world thing",
        point_value=point_value,
        level_required=0,
        status=TaskStatus.active,
        created_by=witch.id,
        primary_faction_slug=COVEN_SLUG,
    )
    db_session.add(task)
    await db_session.flush()

    praxis = Praxis(
        task_id=task.id,
        created_by_id=witch.id,
        type=PraxisType.collab,
        title=f"Coven collab {point_value}",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=witch.id))
    await db_session.commit()
    return witch


@pytest.mark.asyncio
@pytest.mark.parametrize("point_value,expected_score", COVEN_COLLAB_SCORES)
async def test_coven_collab_banks_half_up(
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    point_value: int,
    expected_score: int,
):
    """The seeded Coven collab banks the half-up score, not the banker's one."""
    witch = await _seed_coven_collab(db_session, era, point_value)

    await recalculate_character_stats(
        witch.id, db_session, CURRENT_ERA, emit_taunts=False
    )
    await db_session.commit()

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == witch.id,
            CharacterStats.era_id == era.id,
        )
    )
    assert result.scalar_one().score == expected_score


@pytest.mark.asyncio
async def test_coven_collab_contribution_carries_no_binary_error(
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
):
    """A 100-point Coven collab contributes 110.0 — not 110.00000000000001."""
    from services.praxis_scoring import compute_contributions

    witch = await _seed_coven_collab(db_session, era, 100)
    praxes = (
        (
            await db_session.execute(
                select(Praxis).join(
                    PraxisMember, PraxisMember.praxis_id == Praxis.id
                ).where(PraxisMember.character_id == witch.id)
            )
        )
        .scalars()
        .all()
    )
    contributions = await compute_contributions(
        list(praxes), witch, CURRENT_ERA, db_session
    )

    (contribution,) = contributions.values()
    # The modifier really is the one that used to grow a tail.
    assert contribution.faction_multiplier == (
        CURRENT_ERA.factions[COVEN_SLUG].collab_own_modifier
    )
    assert contribution.total == 110.0
    assert repr(contribution.total) == "110.0"
