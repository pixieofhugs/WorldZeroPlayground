"""The seeder's warning about a live ``Era`` row that names no ruleset (#2705, #827).

Seam under test: ``seed.stale_era_warning`` — the string the summary block prints
at the end of every deploy, because ``start.sh`` runs the seeder there.

**The advice this file pins was inverted by ADR-0091.** It used to warn that the
*configured* era had no row — "era_2 is configured but the live row is era_1, run
``era_reset.py``" — which was the deploy window between an owner flipping
``CURRENT_ERA`` in code and running the rollover by hand. The row now **chooses**
the ruleset (#827), so that window does not exist: the row and the live era agree
by construction, and warning about the compile-time era would be telling an
operator to undo a mod's rollover.

What is left is the one state still genuinely wrong, and it is worse than the old
one: a row naming a ``config_key`` no era file registers. The process cannot
resolve the rules that row records, falls back to the compile-time era, and the
game is quietly not in the era the database says it is in. That silence is what
this warning pays for.
"""
import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, era_config_for_key
from models.character_stats import CharacterStats
from models.era import Era
from seed import stale_era_warning

#: A key no era file registers. Named as a literal rather than derived, because
#: unlike #2708's case there is nothing to derive it from: every *registered* key
#: is now a legitimate live era, so the only way to reach this branch is a key
#: that is not one.
UNREGISTERED_ERA_KEY = "era_from_the_future"


@pytest.mark.asyncio
async def test_no_warning_when_the_live_row_resolves(
    db_session: AsyncSession,
    era: Era,
):
    """The normal case, and now also the case after any rollover: the row names
    a registered era, so there is nothing to say."""
    assert await stale_era_warning(db_session, CURRENT_ERA) is None


@pytest.mark.asyncio
async def test_no_warning_when_the_row_names_a_registered_era_that_is_not_the_first(
    db_session: AsyncSession,
    era: Era,
    account,
):
    """A rolled-over deployment must deploy quietly. Under the old rule this row
    was exactly what triggered the warning."""
    other_key = next(
        key
        for key in ("era_1", "era_2")
        if key != CURRENT_ERA.config_key
    )
    db_session.add(
        Era(
            name=era_config_for_key(other_key).name,
            config_key=other_key,
            started_by=account.id,
        )
    )
    await db_session.commit()

    assert await stale_era_warning(db_session, era_config_for_key(other_key)) is None


@pytest.mark.asyncio
async def test_an_unresolvable_row_names_the_key_and_says_what_is_running(
    db_session: AsyncSession,
    era: Era,
    account,
):
    """A deleted era file under a row that already names it. The operator needs
    both halves: which key went missing, and which rules the game fell back to."""
    db_session.add(
        Era(name="Whatever", config_key=UNREGISTERED_ERA_KEY, started_by=account.id)
    )
    await db_session.commit()

    warning = await stale_era_warning(db_session, CURRENT_ERA)

    assert warning is not None
    assert UNREGISTERED_ERA_KEY in warning
    assert "no era file" in warning
    assert f"fallen back to {CURRENT_ERA.config_key}" in warning


@pytest.mark.asyncio
async def test_an_empty_era_table_warns_rather_than_crashing_the_seed(
    db_session: AsyncSession,
    era: Era,
):
    """A summary line that raises would take the whole deploy's seed down."""
    await db_session.execute(delete(CharacterStats))
    await db_session.execute(delete(Era))
    await db_session.commit()

    warning = await stale_era_warning(db_session, CURRENT_ERA)

    assert warning is not None
    assert "no Era row exists" in warning
