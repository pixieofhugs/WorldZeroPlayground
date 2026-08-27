"""The seeder's deploy-window warning about a configured era with no row (#2705).

Seam under test: ``seed.stale_era_warning`` — the string the summary block prints
at the end of every deploy, because ``start.sh`` runs the seeder there.

It is the only loud thing left in the rollover window. Resolving the live era
stopped filtering on ``config_key`` so that ``scripts/era_reset.py`` can run at
all (``services.era.get_current_era_row_safe``), which means a deployed-but-not-
rolled-over app now serves the new rules against the old row instead of 500ing.
Silence there is the trade; this warning is what pays for it.
"""
from dataclasses import replace

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import _ERA_ATTRIBUTE_BY_CONFIG_KEY, CURRENT_ERA
from models.character_stats import CharacterStats
from models.era import Era
from seed import stale_era_warning

#: Any era key the build knows that is **not** the live one, since the live one
#: is what the ``era`` fixture writes the row for. Derived, never named (#2708):
#: naming ``era_2`` here made the test vacuous the moment ``era_2`` went live,
#: because the warning fires on "configured key != live row key" and nothing else.
UNOPENED_ERA_KEY = next(
    key for key in _ERA_ATTRIBUTE_BY_CONFIG_KEY if key != CURRENT_ERA.config_key
)


@pytest.mark.asyncio
async def test_no_warning_when_the_live_row_is_the_configured_era(
    db_session: AsyncSession,
    era: Era,
):
    assert await stale_era_warning(db_session, CURRENT_ERA) is None


@pytest.mark.asyncio
async def test_a_configured_era_with_no_row_names_both_keys_and_the_script(
    db_session: AsyncSession,
    era: Era,
):
    """The state a deploy that flips CURRENT_ERA forward leaves behind."""
    unopened_era = replace(CURRENT_ERA, config_key=UNOPENED_ERA_KEY)

    warning = await stale_era_warning(db_session, unopened_era)

    assert warning is not None
    assert (
        f"{UNOPENED_ERA_KEY} is configured but the live Era row is "
        f"{CURRENT_ERA.config_key}."
        in warning
    )
    assert "Run scripts/era_reset.py to open it." in warning


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
    assert "the live Era row is absent" in warning
